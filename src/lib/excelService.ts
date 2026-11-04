import * as XLSX from 'xlsx';
import { MultiFactor, SubmissionItem } from '../types/database';

export interface ParsedExcelRow {
  rowNumber: number;
  item_number: number;
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
  totalRowsInFile: number;
  parsedItems: ParsedExcelRow[];
  totalValid: number;
  totalErrors: number;
  excelGrandTotal: number | null;
  importedGrandTotal: number;
  discrepancy: number;
  rowErrors: Array<{ rowNumber: number; message: string }>;
  metadata?: {
    unitPemohon?: string;
    namaKegiatan?: string;
    tahunAnggaran?: string;
  };
}

// Clean and parse Indonesian currency and decimal numbers
export function parseIndonesianNumber(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;

  let str = String(val).trim();
  // Remove 'Rp', 'IDR', spaces, non-numeric characters except comma, dot, minus
  str = str.replace(/[^\d,.-]/g, '');
  if (!str) return 0;

  // Handle Indonesian thousand separator (dots) and decimal separator (comma)
  // Example: "20.000" -> 20000, "1.500.000,50" -> 1500000.5
  if (str.includes('.') && str.includes(',')) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (str.includes('.')) {
    // Check if dot is thousand separator (e.g. 20.000 or 1.500.000) or decimal (e.g. 2.5)
    const parts = str.split('.');
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      str = str.replace(/\./g, '');
    }
  } else if (str.includes(',')) {
    str = str.replace(',', '.');
  }

  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

// Parse text like "109 orang x 2 kali x 2 hari" or "4 sesi x 26 org"
export function parseMultiFactorsFromText(text: string): MultiFactor[] {
  if (!text) return [];
  const parts = text.split(/[xX*×]/).map(p => p.trim()).filter(Boolean);
  if (parts.length <= 1) return [];

  const factors: MultiFactor[] = [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    // Find numeric part and unit
    const numMatch = part.match(/[\d.,]+/);
    if (numMatch) {
      const val = parseIndonesianNumber(numMatch[0]);
      const unit = part.replace(numMatch[0], '').trim();
      if (val > 0) {
        factors.push({
          id: `f_${Date.now()}_${i}`,
          name: unit || `Faktor ${i + 1}`,
          value: val,
          satuan: unit || ''
        });
      }
    }
  }
  return factors;
}

export const excelService = {
  // 1. Generate & Download Official Template (Exact 8-Column Format)
  downloadOfficialTemplate(
    unitName = 'SD IT / SMP IT / SMA IT / Pondok Pesantren',
    activityName = 'Kegiatan Operasional / Ujian / Acara Unit',
    fiscalYear = '2026'
  ): void {
    const wb = XLSX.utils.book_new();

    const headers = [
      'No',
      'Kategori',
      'Uraian Barang / Belanja Kegiatan',
      'Harga Satuan',
      'Volume',
      'Satuan',
      'Jumlah',
      'Keterangan'
    ];

    const sampleRows = [
      [1, 'Konsumsi', 'Makan siang dan minum panitia & guru', 25000, 20, 'Orang', 500000, 'Kegiatan 1 hari'],
      [2, 'Konsumsi', 'Snack dan kopi peserta', 15000, 30, 'Paket', 45000, 'Pagi dan sore'],
      [3, 'Perlengkapan', 'Banner kegiatan 3x1 meter', 150000, 1, 'Buah', 150000, 'Bahan flexi korea'],
      [4, 'Perlengkapan', 'Penggandaan materi / modul', 300, 500, 'Lembar', 150000, 'Foto copy 10 lembar x 50 siswa'],
      [5, 'Acara', 'Honor pemateri / narasumber', 500000, 1, 'Orang', 500000, 'Sesi pembekalan 2 jam'],
      [6, 'Acara', 'Insentif panitia pelaksana', 50000, 10, 'Orang', 500000, 'Pelaksanaan acara'],
    ];

    const totalRow = ['', '', 'TOTAL USULAN KESELURUHAN', '', '', '', 2250000, ''];

    const wsData = [
      ["YAYASAN PENDIDIKAN ISLAM PONDOK PESANTREN AL-QUR'ANIYYAH"],
      ['FORMAT USULAN RENCANA ANGGARAN BIAYA (RAB) UNIT'],
      [],
      ['Unit Pemohon:', unitName],
      ['Nama Kegiatan:', activityName],
      ['Tahun Anggaran:', fiscalYear],
      [],
      headers,
      ...sampleRows,
      [],
      totalRow
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Apply column widths
    ws['!cols'] = [
      { wch: 6 },   // No
      { wch: 18 },  // Kategori
      { wch: 45 },  // Uraian
      { wch: 16 },  // Harga Satuan
      { wch: 10 },  // Volume
      { wch: 12 },  // Satuan
      { wch: 18 },  // Jumlah
      { wch: 30 },  // Keterangan
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Pengajuan Anggaran');
    XLSX.writeFile(wb, 'Template_Pengajuan_Resmi_Yayasan.xlsx');
  },

  // 2. Parse Excel File with Full Validation & Hierarchy Recognition
  async parseExcelFile(file: File): Promise<ExcelImportResult> {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true, cellFormula: true, cellNF: true });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error('File Excel tidak memiliki lembar kerja (worksheet).');
    }

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    // Raw array of rows
    const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    if (rawData.length === 0) {
      throw new Error('Lembar kerja Excel kosong.');
    }

    // Extract metadata from header area
    let unitPemohon = '';
    let namaKegiatan = '';
    let tahunAnggaran = '';

    for (let r = 0; r < Math.min(10, rawData.length); r++) {
      const row = rawData[r] || [];
      for (let c = 0; c < row.length; c++) {
        const val = String(row[c] || '').trim().toLowerCase();
        if (val.includes('unit pemohon:') || val.includes('unit:')) {
          unitPemohon = String(row[c + 1] || '').trim();
        } else if (val.includes('nama kegiatan:') || val.includes('kegiatan:')) {
          namaKegiatan = String(row[c + 1] || '').trim();
        } else if (val.includes('tahun anggaran:') || val.includes('tahun:')) {
          tahunAnggaran = String(row[c + 1] || '').trim();
        }
      }
    }

    // Detect Header Row
    let headerRowIndex = -1;
    let headers: string[] = [];

    for (let r = 0; r < Math.min(20, rawData.length); r++) {
      const row = (rawData[r] || []).map(cell => String(cell || '').trim());
      const hasUraian = row.some(cell => /uraian|nama barang|kegiatan|item|deskripsi/i.test(cell));
      const hasHarga = row.some(cell => /harga|biaya|tarif/i.test(cell));
      const hasVol = row.some(cell => /vol|volume|rincian/i.test(cell));

      if (hasUraian && (hasHarga || hasVol)) {
        headerRowIndex = r;
        headers = row;
        break;
      }
    }

    if (headerRowIndex === -1) {
      // Fallback
      headerRowIndex = rawData.findIndex(r => r && r.some((c: any) => String(c).trim() !== ''));
      if (headerRowIndex === -1) headerRowIndex = 0;
      headers = (rawData[headerRowIndex] || []).map(cell => String(cell || '').trim());
    }

    // Check if there is a subheader row (e.g. Vol 1, Satuan 1, x, Vol 2, Satuan 2...)
    let subHeaders: string[] = [];
    if (headerRowIndex + 1 < rawData.length) {
      const nextRow = (rawData[headerRowIndex + 1] || []).map(cell => String(cell || '').trim());
      if (nextRow.some(cell => /vol|satuan/i.test(cell))) {
        subHeaders = nextRow;
      }
    }

    // Map column indices
    const colIndex = {
      no: headers.findIndex(h => /^no\.?$|^nomor$/i.test(h)),
      kategori: headers.findIndex(h => /^kategori$|^jenis$/i.test(h)),
      uraian: headers.findIndex(h => /uraian|nama barang|kegiatan|deskripsi/i.test(h)),
      hargaSatuan: headers.findIndex(h => /harga|biaya|tarif/i.test(h)),
      volume: headers.findIndex(h => /^vol$|^volume$/i.test(h)),
      satuan: headers.findIndex(h => /^sat$|^satuan$/i.test(h)),
      jumlah: headers.findIndex(h => /^jumlah$|^total$/i.test(h)),
      keterangan: headers.findIndex(h => /ket|keterangan|catatan/i.test(h)),

      // Multi-volume columns (Vol 1, Satuan 1, Vol 2, Satuan 2, Vol 3, Satuan 3)
      vol1: -1,
      sat1: -1,
      vol2: -1,
      sat2: -1,
      vol3: -1,
      sat3: -1,
    };

    // If subheaders are present (like Template_Pengajuan_Resmi_Yayasan.xlsx), find multi-factor cols in subHeaders
    const headerSource = subHeaders.length > 0 ? subHeaders : headers;
    for (let c = 0; c < headerSource.length; c++) {
      const txt = headerSource[c].toLowerCase();
      if (/vol.*1|vol 1/.test(txt)) colIndex.vol1 = c;
      else if (/sat.*1|satuan 1/.test(txt)) colIndex.sat1 = c;
      else if (/vol.*2|vol 2/.test(txt)) colIndex.vol2 = c;
      else if (/sat.*2|satuan 2/.test(txt)) colIndex.sat2 = c;
      else if (/vol.*3|vol 3/.test(txt)) colIndex.vol3 = c;
      else if (/sat.*3|satuan 3/.test(txt)) colIndex.sat3 = c;
    }

    // If no multi-factor columns by name, but headers has "RINCIAN" followed by vol/satuan
    if (colIndex.vol1 === -1 && subHeaders.length > 0) {
      for (let c = 0; c < subHeaders.length; c++) {
        const txt = subHeaders[c].toLowerCase();
        if (txt.includes('vol 1')) colIndex.vol1 = c;
        if (txt.includes('satuan 1')) colIndex.sat1 = c;
        if (txt.includes('vol 2')) colIndex.vol2 = c;
        if (txt.includes('satuan 2')) colIndex.sat2 = c;
        if (txt.includes('vol 3')) colIndex.vol3 = c;
        if (txt.includes('satuan 3')) colIndex.sat3 = c;
      }
    }

    // If uraian not found by exact regex, find first non-price string column
    if (colIndex.uraian === -1) {
      colIndex.uraian = headers.findIndex(h => h.length > 3 && !/harga|biaya|total|jumlah|no/i.test(h));
      if (colIndex.uraian === -1) colIndex.uraian = 1;
    }

    const startRow = (subHeaders.length > 0) ? headerRowIndex + 2 : headerRowIndex + 1;

    let currentCategory = 'Operasional';
    const parsedItems: ParsedExcelRow[] = [];
    const rowErrors: Array<{ rowNumber: number; message: string }> = [];
    let excelGrandTotal: number | null = null;
    let importedGrandTotal = 0;

    for (let r = startRow; r < rawData.length; r++) {
      const row = rawData[r];
      if (!row || row.every((c: any) => String(c || '').trim() === '')) {
        continue; // Skip truly blank rows
      }

      // Check if this row is a TOTAL / GRAND TOTAL summary row
      const firstFewCells = row.slice(0, 6).map(c => String(c || '').trim().toLowerCase()).join(' ');
      if (
        firstFewCells.includes('total pengajuan') ||
        firstFewCells.includes('total usulan') ||
        firstFewCells.includes('grand total') ||
        firstFewCells.includes('total keseluruhan') ||
        /^total\b|^jumlah total/i.test(firstFewCells)
      ) {
        // Read the total amount from this row
        for (let c = row.length - 1; c >= 0; c--) {
          const val = parseIndonesianNumber(row[c]);
          if (val > 0) {
            excelGrandTotal = val;
            break;
          }
        }
        continue;
      }

      const noVal = colIndex.no >= 0 ? String(row[colIndex.no] || '').trim() : '';
      const uraianVal = colIndex.uraian >= 0 ? String(row[colIndex.uraian] || '').trim() : '';
      const rawKategori = colIndex.kategori >= 0 ? String(row[colIndex.kategori] || '').trim() : '';

      // Check if this row is a Category Header (e.g. "I. ANGGARAN DANA TKA", "1. Konsumsi", "2. Perlengkapan")
      // Characterized by having a label/uraian but NO unit price and NO volume
      const rawPrice = colIndex.hargaSatuan >= 0 ? parseIndonesianNumber(row[colIndex.hargaSatuan]) : 0;
      const rawVol = colIndex.volume >= 0 ? parseIndonesianNumber(row[colIndex.volume]) : 0;
      const rawVol1 = colIndex.vol1 >= 0 ? parseIndonesianNumber(row[colIndex.vol1]) : 0;

      const hasPriceOrVol = rawPrice > 0 || rawVol > 0 || rawVol1 > 0;

      if (!hasPriceOrVol && uraianVal) {
        // This is a Category / Section Header row!
        currentCategory = uraianVal.replace(/^[IVXLCDMivxlcdm]+\.?\s*|^\d+\.?\s*|^[A-Za-z]\.?\s*/, '').trim() || uraianVal;
        continue;
      }

      if (!uraianVal) {
        // Skip rows without description
        continue;
      }

      const itemErrors: string[] = [];
      const itemKategori = rawKategori || currentCategory || 'Operasional';

      // 1. Parse Harga Satuan
      let hargaSatuan = rawPrice;
      if (hargaSatuan <= 0) {
        itemErrors.push('Harga satuan harus lebih besar dari 0');
        rowErrors.push({ rowNumber: r + 1, message: `Baris ${r + 1}: Harga satuan tidak valid atau Rp0 (${uraianVal})` });
      }

      // 2. Parse Multiple Factors / Components
      const multiFactors: MultiFactor[] = [];
      let calculatedVolume = 1;

      if (colIndex.vol1 >= 0 && row[colIndex.vol1]) {
        const v1 = parseIndonesianNumber(row[colIndex.vol1]);
        const s1 = colIndex.sat1 >= 0 ? String(row[colIndex.sat1] || '').trim() : '';
        if (v1 > 0) {
          multiFactors.push({ id: `f_${Date.now()}_1`, name: s1 || 'Komponen 1', value: v1, satuan: s1 });
          calculatedVolume *= v1;
        }
      }

      if (colIndex.vol2 >= 0 && row[colIndex.vol2]) {
        const v2 = parseIndonesianNumber(row[colIndex.vol2]);
        const s2 = colIndex.sat2 >= 0 ? String(row[colIndex.sat2] || '').trim() : '';
        if (v2 > 0) {
          multiFactors.push({ id: `f_${Date.now()}_2`, name: s2 || 'Komponen 2', value: v2, satuan: s2 });
          calculatedVolume *= v2;
        }
      }

      if (colIndex.vol3 >= 0 && row[colIndex.vol3]) {
        const v3 = parseIndonesianNumber(row[colIndex.vol3]);
        const s3 = colIndex.sat3 >= 0 ? String(row[colIndex.sat3] || '').trim() : '';
        if (v3 > 0) {
          multiFactors.push({ id: `f_${Date.now()}_3`, name: s3 || 'Komponen 3', value: v3, satuan: s3 });
          calculatedVolume *= v3;
        }
      }

      // 3. Fallback or Standard Volume
      let volume = 1;
      let satuan = 'Paket';

      if (multiFactors.length > 0) {
        volume = calculatedVolume;
        satuan = multiFactors.map(f => f.satuan).filter(Boolean).join(' × ') || 'Paket';
      } else {
        if (colIndex.volume >= 0) {
          volume = parseIndonesianNumber(row[colIndex.volume]) || 1;
        }
        if (colIndex.satuan >= 0) {
          satuan = String(row[colIndex.satuan] || '').trim() || 'Paket';
        }

        // Try extracting factors from notes or uraian if e.g. "109 orang x 2 kali x 2 hari"
        const notesVal = colIndex.keterangan >= 0 ? String(row[colIndex.keterangan] || '').trim() : '';
        const parsedFromText = parseMultiFactorsFromText(notesVal) || parseMultiFactorsFromText(uraianVal);
        if (parsedFromText.length > 1) {
          multiFactors.push(...parsedFromText);
          volume = multiFactors.reduce((acc, f) => acc * f.value, 1);
        } else {
          multiFactors.push({
            id: `f_${Date.now()}_0`,
            name: satuan,
            value: volume,
            satuan: satuan
          });
        }
      }

      if (volume <= 0) {
        itemErrors.push('Volume harus lebih besar dari 0');
        rowErrors.push({ rowNumber: r + 1, message: `Baris ${r + 1}: Volume tidak valid (${uraianVal})` });
      }

      // 4. Calculate or Read Amount
      let jumlah = Math.round(hargaSatuan * volume * 100) / 100;
      if (colIndex.jumlah >= 0 && row[colIndex.jumlah]) {
        const excelJumlah = parseIndonesianNumber(row[colIndex.jumlah]);
        if (excelJumlah > 0) {
          // If Excel calculated amount differs by a small rounding, respect Excel
          jumlah = excelJumlah;
        }
      }

      importedGrandTotal += jumlah;

      const keterangan = colIndex.keterangan >= 0 ? String(row[colIndex.keterangan] || '').trim() : '';

      parsedItems.push({
        rowNumber: r + 1,
        item_number: parsedItems.length + 1,
        kategori: itemKategori,
        uraian: uraianVal,
        hargaSatuan,
        volume,
        satuan,
        jumlah,
        keterangan,
        multiFactors: multiFactors.length > 0 ? multiFactors : undefined,
        errors: itemErrors
      });
    }

    const discrepancy = excelGrandTotal !== null ? Math.round((importedGrandTotal - excelGrandTotal) * 100) / 100 : 0;

    return {
      fileName: file.name,
      sheetNames: workbook.SheetNames,
      selectedSheet: firstSheetName,
      detectedHeaders: headers,
      totalRowsInFile: rawData.length,
      parsedItems,
      totalValid: parsedItems.filter(p => p.errors.length === 0).length,
      totalErrors: rowErrors.length,
      excelGrandTotal,
      importedGrandTotal,
      discrepancy,
      rowErrors,
      metadata: {
        unitPemohon,
        namaKegiatan,
        tahunAnggaran
      }
    };
  },

  // 3. Export Submission Items to Excel (Consistent with Template)
  exportToExcel(submissionNumber: string, activityName: string, unitName: string, items: SubmissionItem[]): void {
    const wb = XLSX.utils.book_new();

    const headers = [
      'No',
      'Kategori',
      'Uraian Barang / Belanja Kegiatan',
      'Harga Satuan',
      'Volume',
      'Satuan',
      'Jumlah',
      'Keterangan'
    ];

    const rows = items.map((item, index) => [
      index + 1,
      item.category,
      item.item_name,
      Number(item.unit_price),
      Number(item.volume),
      item.unit,
      Number(item.total_amount),
      item.notes || ''
    ]);

    const grandTotal = items.reduce((sum, item) => sum + Number(item.total_amount), 0);

    const wsData = [
      ["YAYASAN PENDIDIKAN ISLAM PONDOK PESANTREN AL-QUR'ANIYYAH"],
      ['RINCIAN USULAN RENCANA ANGGARAN BIAYA (RAB) UNIT'],
      [],
      ['Nomor Pengajuan:', submissionNumber],
      ['Unit Pemohon:', unitName],
      ['Nama Kegiatan:', activityName],
      ['Tanggal Unduh:', new Date().toLocaleDateString('id-ID')],
      [],
      headers,
      ...rows,
      [],
      ['', '', 'TOTAL USULAN KESELURUHAN', '', '', '', grandTotal, '']
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    ws['!cols'] = [
      { wch: 6 },
      { wch: 18 },
      { wch: 45 },
      { wch: 16 },
      { wch: 10 },
      { wch: 12 },
      { wch: 18 },
      { wch: 30 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'RAB Pengajuan');
    const cleanNum = submissionNumber.replace(/\//g, '_');
    XLSX.writeFile(wb, `Pengajuan_${unitName}_${cleanNum}.xlsx`);
  }
};
