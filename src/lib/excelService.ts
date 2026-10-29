import * as XLSX from 'xlsx';
import { MultiFactor, SubmissionItem } from '../types/database';

export interface ParsedExcelRow {
  rowNumber: number;
  no?: number;
  kategori: string;
  uraian: string;
  hargaSatuan: number;
  volume: number;
  satuan: string;
  jumlah: number;
  keterangan: string;
  multiFactors?: MultiFactor[];
  errors: string[];
}

export interface ExcelImportResult {
  fileName: string;
  sheetNames: string[];
  selectedSheet: string;
  detectedHeaders: string[];
  rawRows: any[];
  parsedItems: ParsedExcelRow[];
  totalValid: number;
  totalErrors: number;
  totalCalculatedAmount: number;
  metadata?: {
    unitPemohon?: string;
    namaKegiatan?: string;
    tahunAnggaran?: string;
  };
}

export const excelService = {
  // Parse uploaded XLSX / XLS file
  async parseExcelFile(file: File): Promise<ExcelImportResult> {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error('File Excel tidak memiliki lembar kerja (worksheet).');
    }

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    // Convert sheet to array of arrays to find header row dynamically
    const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    if (rawData.length === 0) {
      throw new Error('Lembar kerja Excel kosong.');
    }

    // Try to extract metadata if present (e.g. Unit Pemohon, Nama Kegiatan, Tahun)
    let unitPemohon = '';
    let namaKegiatan = '';
    let tahunAnggaran = '';

    for (let r = 0; r < Math.min(10, rawData.length); r++) {
      const row = rawData[r];
      for (let c = 0; c < row.length; c++) {
        const val = String(row[c] || '').trim().toLowerCase();
        if (val.includes('unit pemohon:') && row[c + 1]) {
          unitPemohon = String(row[c + 1]).trim();
        } else if (val.includes('nama kegiatan:') && row[c + 1]) {
          namaKegiatan = String(row[c + 1]).trim();
        } else if (val.includes('tahun anggaran:') && row[c + 1]) {
          tahunAnggaran = String(row[c + 1]).trim();
        }
      }
    }

    // Identify header row by looking for keywords
    let headerRowIndex = -1;
    let headers: string[] = [];

    for (let r = 0; r < Math.min(15, rawData.length); r++) {
      const row = rawData[r].map(cell => String(cell || '').trim());
      const hasUraian = row.some(cell => /uraian|nama barang|kegiatan|item/i.test(cell));
      const hasHarga = row.some(cell => /harga|biaya|tarif/i.test(cell));

      if (hasUraian && hasHarga) {
        headerRowIndex = r;
        headers = row;
        break;
      }
    }

    if (headerRowIndex === -1) {
      // Fallback: assume first non-empty row is header
      headerRowIndex = rawData.findIndex(r => r.some(c => String(c).trim() !== ''));
      if (headerRowIndex === -1) headerRowIndex = 0;
      headers = rawData[headerRowIndex].map(cell => String(cell || '').trim());
    }

    // Map column indices
    const colIndex = {
      no: headers.findIndex(h => /^no\.?$|^nomor$/i.test(h)),
      kategori: headers.findIndex(h => /kategori|jenis/i.test(h)),
      uraian: headers.findIndex(h => /uraian|nama barang|kegiatan|deskripsi/i.test(h)),
      hargaSatuan: headers.findIndex(h => /harga|biaya/i.test(h)),
      volume: headers.findIndex(h => /^vol|volume$/i.test(h)),
      satuan: headers.findIndex(h => /^sat|satuan$/i.test(h)),
      jumlah: headers.findIndex(h => /^jumlah|^total$/i.test(h)),
      keterangan: headers.findIndex(h => /ket|keterangan|catatan/i.test(h)),

      // Check multivolume columns e.g. Vol 1, Satuan 1, Vol 2, Satuan 2, Vol 3, Satuan 3
      vol1: headers.findIndex(h => /vol.*1/i.test(h)),
      sat1: headers.findIndex(h => /sat.*1/i.test(h)),
      vol2: headers.findIndex(h => /vol.*2/i.test(h)),
      sat2: headers.findIndex(h => /sat.*2/i.test(h)),
      vol3: headers.findIndex(h => /vol.*3/i.test(h)),
      sat3: headers.findIndex(h => /sat.*3/i.test(h)),
    };

    // If uraian not found by exact regex, find best candidate
    if (colIndex.uraian === -1) {
      colIndex.uraian = headers.findIndex(h => h.length > 3 && !/harga|biaya|total|jumlah/i.test(h));
    }

    const parsedItems: ParsedExcelRow[] = [];
    let totalErrors = 0;
    let totalCalculated = 0;

    // Process data rows
    for (let r = headerRowIndex + 1; r < rawData.length; r++) {
      const row = rawData[r];
      if (!row || row.every((c: any) => String(c || '').trim() === '')) {
        continue; // skip empty rows
      }

      const errors: string[] = [];
      const uraianVal = colIndex.uraian >= 0 ? String(row[colIndex.uraian] || '').trim() : '';

      // Skip total/grand total summary rows at the bottom
      if (/^total|^jumlah|^subtotal|^grand total/i.test(uraianVal)) {
        continue;
      }

      if (!uraianVal) {
        errors.push('Uraian barang atau kegiatan tidak boleh kosong');
      }

      // Parse harga satuan
      let hargaVal = 0;
      if (colIndex.hargaSatuan >= 0) {
        const rawHarga = String(row[colIndex.hargaSatuan] || '').replace(/[^0-9.-]/g, '');
        hargaVal = parseFloat(rawHarga) || 0;
      }

      if (hargaVal <= 0) {
        errors.push('Harga satuan harus lebih besar dari 0');
      }

      // Check multi-volume columns
      const multiFactors: MultiFactor[] = [];
      let calculatedVolume = 1;

      if (colIndex.vol1 >= 0 && row[colIndex.vol1]) {
        const v1 = parseFloat(String(row[colIndex.vol1]).replace(/[^0-9.-]/g, '')) || 0;
        const s1 = colIndex.sat1 >= 0 ? String(row[colIndex.sat1] || '').trim() : '';
        if (v1 > 0) {
          multiFactors.push({ id: 'f1', name: s1 || 'Faktor 1', value: v1, satuan: s1 });
          calculatedVolume *= v1;
        }
      }

      if (colIndex.vol2 >= 0 && row[colIndex.vol2]) {
        const v2 = parseFloat(String(row[colIndex.vol2]).replace(/[^0-9.-]/g, '')) || 0;
        const s2 = colIndex.sat2 >= 0 ? String(row[colIndex.sat2] || '').trim() : '';
        if (v2 > 0) {
          multiFactors.push({ id: 'f2', name: s2 || 'Faktor 2', value: v2, satuan: s2 });
          calculatedVolume *= v2;
        }
      }

      if (colIndex.vol3 >= 0 && row[colIndex.vol3]) {
        const v3 = parseFloat(String(row[colIndex.vol3]).replace(/[^0-9.-]/g, '')) || 0;
        const s3 = colIndex.sat3 >= 0 ? String(row[colIndex.sat3] || '').trim() : '';
        if (v3 > 0) {
          multiFactors.push({ id: 'f3', name: s3 || 'Faktor 3', value: v3, satuan: s3 });
          calculatedVolume *= v3;
        }
      }

      // If no multivolume found, use standard volume column
      let volumeVal = 1;
      let satuanVal = 'Unit';

      if (multiFactors.length > 0) {
        volumeVal = calculatedVolume;
        satuanVal = multiFactors.map(f => f.satuan).filter(Boolean).join(' × ') || 'Paket';
      } else if (colIndex.volume >= 0) {
        const rawVol = String(row[colIndex.volume] || '').replace(/[^0-9.-]/g, '');
        volumeVal = parseFloat(rawVol) || 1;
        if (colIndex.satuan >= 0) {
          satuanVal = String(row[colIndex.satuan] || '').trim() || 'Unit';
        }
      }

      if (volumeVal <= 0) {
        errors.push('Volume harus lebih dari 0');
      }

      // Calculate total
      const totalAmount = hargaVal * volumeVal;
      totalCalculated += totalAmount;

      if (errors.length > 0) {
        totalErrors++;
      }

      parsedItems.push({
        rowNumber: r + 1,
        no: colIndex.no >= 0 ? parseInt(String(row[colIndex.no]), 10) || parsedItems.length + 1 : parsedItems.length + 1,
        kategori: colIndex.kategori >= 0 ? String(row[colIndex.kategori] || '').trim() || 'Operasional' : 'Operasional',
        uraian: uraianVal,
        hargaSatuan: hargaVal,
        volume: volumeVal,
        satuan: satuanVal,
        jumlah: totalAmount,
        keterangan: colIndex.keterangan >= 0 ? String(row[colIndex.keterangan] || '').trim() : '',
        multiFactors: multiFactors.length > 0 ? multiFactors : undefined,
        errors
      });
    }

    return {
      fileName: file.name,
      sheetNames: workbook.SheetNames,
      selectedSheet: firstSheetName,
      detectedHeaders: headers,
      rawRows: rawData,
      parsedItems,
      totalValid: parsedItems.filter(p => p.errors.length === 0).length,
      totalErrors,
      totalCalculatedAmount: totalCalculated,
      metadata: {
        unitPemohon,
        namaKegiatan,
        tahunAnggaran
      }
    };
  },

  // Export submission items to formatted XLSX
  exportToExcel(submissionNumber: string, activityName: string, unitName: string, items: SubmissionItem[]): void {
    const wb = XLSX.utils.book_new();

    const headers = ['No', 'Kategori', 'Uraian Barang / Kegiatan', 'Harga Satuan (Rp)', 'Volume', 'Satuan', 'Jumlah (Rp)', 'Keterangan'];
    const rows = items.map((item, index) => [
      index + 1,
      item.category,
      item.item_name,
      item.unit_price,
      item.volume,
      item.unit,
      item.total_amount,
      item.notes || ''
    ]);

    // Append Total Row
    const grandTotal = items.reduce((sum, item) => sum + Number(item.total_amount), 0);
    rows.push(['', '', 'TOTAL PENGAJUAN', '', '', '', grandTotal, '']);

    const wsData = [
      ["YAYASAN PENDIDIKAN ISLAM PONDOK PESANTREN AL-QUR'ANIYYAH"],
      ['RINCIAN USULAN RENCANA ANGGARAN BIAYA (RAB)'],
      ['Nomor Pengajuan:', submissionNumber],
      ['Unit:', unitName],
      ['Kegiatan:', activityName],
      ['Tanggal Unduh:', new Date().toLocaleDateString('id-ID')],
      [],
      headers,
      ...rows
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'RAB Pengajuan');
    XLSX.writeFile(wb, `Pengajuan_${unitName}_${submissionNumber.replace(/\//g, '_')}.xlsx`);
  }
};
