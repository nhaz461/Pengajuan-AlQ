import { supabase } from './supabase';
import { MasterSSH, SSHStatus } from '../types/database';
import * as XLSX from 'xlsx';

export interface SSHCheckResult {
  status: SSHStatus;
  sshItem: MasterSSH | null;
  sshPrice: number | null;
  diff: number | null;
  percentageDiff: number | null;
  candidates: MasterSSH[];
  message: string;
}

export const sshService = {
  // Fetch all active Master SSH
  async getMasterSSH(search?: string, category?: string): Promise<MasterSSH[]> {
    let query = supabase
      .from('master_ssh')
      .select('*')
      .eq('is_active', true)
      .order('kategori', { ascending: true })
      .order('nama_barang', { ascending: true });

    if (category && category !== 'ALL') {
      query = query.eq('kategori', category);
    }
    if (search && search.trim()) {
      query = query.ilike('nama_barang', `%${search.trim()}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  // Save new SSH item
  async createSSHItem(item: Omit<MasterSSH, 'id' | 'created_at' | 'updated_at'>): Promise<MasterSSH> {
    const { data, error } = await supabase
      .from('master_ssh')
      .insert([item])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update existing SSH item
  async updateSSHItem(id: string, updates: Partial<MasterSSH>): Promise<void> {
    const { error } = await supabase
      .from('master_ssh')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;
  },

  // Toggle active/inactive
  async toggleActive(id: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('master_ssh')
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;
  },

  // Automatic SSH Price Checker with 4-State Analysis (Section E)
  checkPriceAgainstSSH(unitPrice: number, itemName: string, unit: string, allSSH: MasterSSH[]): SSHCheckResult {
    if (!itemName || allSSH.length === 0) {
      return {
        status: 'BELUM_ADA',
        sshItem: null,
        sshPrice: null,
        diff: null,
        percentageDiff: null,
        candidates: [],
        message: 'Belum ada referensi standar harga di Master SSH'
      };
    }

    const cleanItemName = itemName.toLowerCase().trim();
    const cleanUnit = unit ? unit.toLowerCase().trim() : '';

    // 1. Try exact or high-confidence substring match
    const candidates = allSSH.filter(ssh => {
      const sshName = ssh.nama_barang.toLowerCase();
      // Match words
      const words = cleanItemName.split(/\s+/).filter(w => w.length > 2);
      const matchWordCount = words.filter(w => sshName.includes(w)).length;
      return matchWordCount >= Math.min(2, words.length) || sshName.includes(cleanItemName) || cleanItemName.includes(sshName);
    });

    if (candidates.length === 0) {
      return {
        status: 'BELUM_ADA',
        sshItem: null,
        sshPrice: null,
        diff: null,
        percentageDiff: null,
        candidates: [],
        message: 'Item belum memiliki referensi harga standar di Master SSH'
      };
    }

    // Pick best candidate (prefer matching unit if possible)
    let best = candidates.find(c => c.satuan.toLowerCase() === cleanUnit);
    if (!best) best = candidates[0];

    const sshPrice = Number(best.harga_standar);
    const diff = unitPrice - sshPrice;
    const percentageDiff = sshPrice > 0 ? (diff / sshPrice) * 100 : 0;

    if (diff === 0) {
      return {
        status: 'SESUAI',
        sshItem: best,
        sshPrice: sshPrice,
        diff: 0,
        percentageDiff: 0,
        candidates: candidates,
        message: `Harga pengajuan sama persis dengan standar SSH (${best.nama_barang} @ Rp${sshPrice.toLocaleString('id-ID')})`
      };
    } else if (diff > 0) {
      return {
        status: 'DI_ATAS',
        sshItem: best,
        sshPrice: sshPrice,
        diff: diff,
        percentageDiff: percentageDiff,
        candidates: candidates,
        message: `Harga pengajuan melebihi standar SSH sebesar +Rp${diff.toLocaleString('id-ID')} (+${Math.round(percentageDiff)}%) (${best.nama_barang} @ Rp${sshPrice.toLocaleString('id-ID')})`
      };
    } else {
      return {
        status: 'DI_BAWAH',
        sshItem: best,
        sshPrice: sshPrice,
        diff: diff,
        percentageDiff: percentageDiff,
        candidates: candidates,
        message: `Harga pengajuan lebih efisien/di bawah SSH sebesar -Rp${Math.abs(diff).toLocaleString('id-ID')} (${Math.round(percentageDiff)}%) (${best.nama_barang} @ Rp${sshPrice.toLocaleString('id-ID')})`
      };
    }
  },

  // Parse Excel for SSH Import
  async parseSSHExcel(file: File): Promise<{
    fileName: string;
    items: Array<Omit<MasterSSH, 'id' | 'created_at' | 'updated_at'>>;
    totalValid: number;
    totalDuplicates: number;
    errors: string[];
  }> {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rawRows: any[] = XLSX.utils.sheet_to_json(sheet);

    const items: Array<Omit<MasterSSH, 'id' | 'created_at' | 'updated_at'>> = [];
    const errors: string[] = [];

    // Existing SSH items to detect duplicates
    const existing = await this.getMasterSSH();
    const existingNames = new Set(existing.map(e => e.nama_barang.toLowerCase().trim()));

    let duplicatesCount = 0;

    rawRows.forEach((r, idx) => {
      const nama = r['Uraian Standar Barang / Jasa'] || r['Nama Barang'] || r['uraian'] || r['nama'] || '';
      const kategori = r['Kategori'] || r['kategori'] || 'Umum';
      const satuan = r['Satuan'] || r['satuan'] || 'Unit';
      const harga = parseFloat(r['Harga Standar SSH (2026)'] || r['Harga Standar'] || r['harga'] || 0);
      const kode = r['Kode SSH'] || r['kode'] || null;
      const tahun = String(r['Tahun Berlaku'] || r['tahun'] || '2026');
      const ket = r['Keterangan'] || r['keterangan'] || null;

      if (!nama.trim()) {
        errors.push(`Baris ${idx + 2}: Nama barang kosong.`);
        return;
      }
      if (harga <= 0) {
        errors.push(`Baris ${idx + 2}: Harga standar (${nama}) harus lebih dari 0.`);
        return;
      }

      if (existingNames.has(nama.toLowerCase().trim())) {
        duplicatesCount++;
      }

      items.push({
        kode_ssh: kode,
        kategori: kategori.trim(),
        nama_barang: nama.trim(),
        satuan: satuan.trim(),
        harga_standar: harga,
        tahun_berlaku: tahun,
        keterangan: ket,
        is_active: true
      });
    });

    return {
      fileName: file.name,
      items,
      totalValid: items.length,
      totalDuplicates: duplicatesCount,
      errors
    };
  },

  // Save imported SSH batch to Supabase
  async saveBatchSSH(items: Array<Omit<MasterSSH, 'id' | 'created_at' | 'updated_at'>>): Promise<number> {
    const { data, error } = await supabase
      .from('master_ssh')
      .insert(items)
      .select();

    if (error) throw error;
    return data?.length || 0;
  },

  // Export Master SSH to Excel
  exportMasterSSHToExcel(items: MasterSSH[]): void {
    const wb = XLSX.utils.book_new();
    const rows = items.map((it, idx) => [
      it.kode_ssh || `SSH-${idx + 1}`,
      it.kategori,
      it.nama_barang,
      it.satuan,
      it.harga_standar,
      it.tahun_berlaku || '2026',
      it.keterangan || ''
    ]);

    const headers = [
      'Kode SSH',
      'Kategori',
      'Uraian Standar Barang / Jasa',
      'Satuan',
      'Harga Standar SSH (2026)',
      'Tahun Berlaku',
      'Keterangan'
    ];

    const wsData = [
      ["YAYASAN PENDIDIKAN ISLAM AL-QUR'ANIYYAH"],
      ['MASTER STANDAR SATUAN HARGA (SSH) ACUAN ANGGARAN'],
      ['Tanggal Unduh:', new Date().toLocaleDateString('id-ID')],
      [],
      headers,
      ...rows
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Master SSH 2026');
    XLSX.writeFile(wb, `Master_SSH_Yayasan_${new Date().getFullYear()}.xlsx`);
  }
};
