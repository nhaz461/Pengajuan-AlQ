import React, { useState, useEffect } from 'react';
import { sshService } from '../lib/sshService';
import { MasterSSH } from '../types/database';
import {
  FileText,
  Plus,
  Upload,
  Download,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Edit2,
  Trash2,
  FileSpreadsheet
} from 'lucide-react';

export const MasterSSHPage: React.FC = () => {
  const [sshItems, setSshItems] = useState<MasterSSH[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Modal Add / Edit
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterSSH | null>(null);
  const [formData, setFormData] = useState({
    kode_ssh: '',
    kategori: 'ATK',
    nama_barang: '',
    satuan: 'Unit',
    harga_standar: 0,
    tahun_berlaku: '2026',
    keterangan: ''
  });

  // Modal Import Excel
  const [showImportModal, setShowImportModal] = useState(false);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importPreview, setImportPreview] = useState<{
    fileName: string;
    items: Array<Omit<MasterSSH, 'id' | 'created_at' | 'updated_at'>>;
    totalValid: number;
    totalDuplicates: number;
    errors: string[];
  } | null>(null);
  const [importing, setImporting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await sshService.getMasterSSH(searchQuery, selectedCategory);
      setSshItems(data);
    } catch (err) {
      console.error('Error loading SSH:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCategory]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      kode_ssh: `SSH-${Date.now().toString().slice(-4)}`,
      kategori: 'ATK',
      nama_barang: '',
      satuan: 'Unit',
      harga_standar: 0,
      tahun_berlaku: '2026',
      keterangan: ''
    });
    setShowModal(true);
  };

  const handleOpenEdit = (item: MasterSSH) => {
    setEditingItem(item);
    setFormData({
      kode_ssh: item.kode_ssh || '',
      kategori: item.kategori,
      nama_barang: item.nama_barang,
      satuan: item.satuan,
      harga_standar: Number(item.harga_standar),
      tahun_berlaku: item.tahun_berlaku || '2026',
      keterangan: item.keterangan || ''
    });
    setShowModal(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama_barang.trim() || formData.harga_standar <= 0) {
      alert('Nama barang dan harga standar wajib diisi valid.');
      return;
    }

    try {
      if (editingItem) {
        await sshService.updateSSHItem(editingItem.id, formData);
        alert('Data Master SSH berhasil diperbarui.');
      } else {
        await sshService.createSSHItem({
          ...formData,
          is_active: true
        });
        alert('Item SSH baru berhasil disimpan.');
      }
      setShowModal(false);
      await loadData();
    } catch (err: any) {
      alert(`Gagal menyimpan: ${err.message}`);
    }
  };

  // Excel File Change
  const handleExcelSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelFile(file);
    setParsing(true);
    try {
      const preview = await sshService.parseSSHExcel(file);
      setImportPreview(preview);
    } catch (err: any) {
      alert(`Gagal membaca file Excel: ${err.message}`);
      setImportPreview(null);
    } finally {
      setParsing(false);
    }
  };

  // Confirm Import
  const handleConfirmImport = async () => {
    if (!importPreview || importPreview.items.length === 0) return;

    setImporting(true);
    try {
      const count = await sshService.saveBatchSSH(importPreview.items);
      alert(`Berhasil mengimpor ${count} item Standar Satuan Harga ke database!`);
      setShowImportModal(false);
      setExcelFile(null);
      setImportPreview(null);
      await loadData();
    } catch (err: any) {
      alert(`Gagal mengimpor batch SSH: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  // Categories list
  const categories = ['ALL', 'ATK', 'Honorarium', 'Konsumsi', 'Sarpras & Bangunan', 'Operasional', 'Umum'];

  return (
    <div className="space-y-5 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-finance-navy">Master Standar Satuan Harga (SSH)</h1>
          <p className="text-xs text-slate-500">
            Katalog acuan plafon harga resmi Yayasan Al-Qur'aniyyah untuk verifikasi otomatis usulan anggaran.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Download Official SSH Excel */}
          <a
            href="/Master_SSH_Yayasan_2026_FINAL.xlsx"
            download="Master_SSH_Yayasan_2026_FINAL.xlsx"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm"
            title="Unduh File Master SSH Resmi Yayasan"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Unduh File SSH (.xlsx)</span>
          </a>

          {/* Import Excel */}
          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-lg hover:bg-emerald-100 shadow-sm"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-600" />
            <span>Import Excel SSH</span>
          </button>

          {/* Add Item */}
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-finance-blue rounded-lg hover:bg-finance-blueHover shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Item SSH</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearch} className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama barang, jasa, atau kode SSH..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-finance-blue"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white font-medium focus:ring-1 focus:ring-finance-blue"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === 'ALL' ? 'Semua Kategori' : c}
              </option>
            ))}
          </select>

          <button
            onClick={loadData}
            className="p-1.5 text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg"
            title="Segarkan"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table of SSH Items */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-finance-blue" />
            <h2 className="text-sm font-bold text-finance-navy">
              Daftar Standar Satuan Harga ({sshItems.length} Item Terdaftar)
            </h2>
          </div>
          <button
            onClick={() => sshService.exportMasterSSHToExcel(sshItems)}
            className="text-xs text-finance-blue hover:underline font-medium inline-flex items-center gap-1"
          >
            <Download className="w-3 h-3" /> Ekspor Tabel
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Memuat data Master SSH...</div>
        ) : sshItems.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            Tidak ada item SSH yang cocok dengan pencarian.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Kode SSH</th>
                  <th className="px-3 py-3">Kategori</th>
                  <th className="px-4 py-3">Uraian Standar Barang / Jasa</th>
                  <th className="px-3 py-3 text-center">Satuan</th>
                  <th className="px-4 py-3 text-right">Harga Standar SSH</th>
                  <th className="px-3 py-3 text-center">Tahun</th>
                  <th className="px-4 py-3">Keterangan</th>
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sshItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-700">
                      {item.kode_ssh || '-'}
                    </td>
                    <td className="px-3 py-3">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-semibold">
                        {item.kategori}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {item.nama_barang}
                    </td>
                    <td className="px-3 py-3 text-center text-slate-600">
                      {item.satuan}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-finance-navy">
                      Rp{Number(item.harga_standar).toLocaleString('id-ID')}
                    </td>
                    <td className="px-3 py-3 text-center font-mono text-slate-500">
                      {item.tahun_berlaku || '2026'}
                    </td>
                    <td className="px-4 py-3 text-slate-500 max-w-xs truncate" title={item.keterangan || ''}>
                      {item.keterangan || '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 border border-blue-200 rounded"
                        title="Edit SSH"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Add / Edit SSH */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-finance-navy">
                {editingItem ? 'Edit Standar Satuan Harga' : 'Tambah Standar Satuan Harga Baru'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 text-xl font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="py-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Kode SSH</label>
                  <input
                    type="text"
                    value={formData.kode_ssh}
                    onChange={(e) => setFormData(prev => ({ ...prev, kode_ssh: e.target.value }))}
                    className="w-full text-xs font-mono border border-slate-200 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Kategori</label>
                  <input
                    type="text"
                    value={formData.kategori}
                    onChange={(e) => setFormData(prev => ({ ...prev, kategori: e.target.value }))}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Uraian Standar Barang / Jasa <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Kertas HVS A4 75 gram"
                  value={formData.nama_barang}
                  onChange={(e) => setFormData(prev => ({ ...prev, nama_barang: e.target.value }))}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Satuan</label>
                  <input
                    type="text"
                    placeholder="Rim, Lembar, Kotak"
                    value={formData.satuan}
                    onChange={(e) => setFormData(prev => ({ ...prev, satuan: e.target.value }))}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Harga Standar (Rp) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.harga_standar === 0 ? '' : formData.harga_standar}
                    onChange={(e) => setFormData(prev => ({ ...prev, harga_standar: parseFloat(e.target.value) || 0 }))}
                    className="w-full text-xs font-mono font-bold text-finance-navy border border-slate-200 rounded-lg p-2 text-right"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Keterangan / Spesifikasi</label>
                <textarea
                  rows={2}
                  value={formData.keterangan}
                  onChange={(e) => setFormData(prev => ({ ...prev, keterangan: e.target.value }))}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-finance-blue hover:bg-finance-blueHover rounded-lg"
                >
                  Simpan Data SSH
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Import Excel SSH */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-5 border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-finance-navy">Import Data Master SSH dari Excel</h3>
              </div>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportPreview(null);
                }}
                className="text-slate-400 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center bg-slate-50/50 hover:border-finance-blue">
                <input
                  type="file"
                  id="sshExcelInput"
                  accept=".xlsx, .xls"
                  onChange={handleExcelSelected}
                  className="hidden"
                />
                <label htmlFor="sshExcelInput" className="cursor-pointer flex flex-col items-center">
                  <FileSpreadsheet className="w-10 h-10 text-finance-blue mb-2" />
                  <span className="text-xs font-bold text-slate-800">
                    {excelFile ? excelFile.name : 'Pilih File Excel Master SSH (.xlsx / .xls)'}
                  </span>
                  <span className="text-[11px] text-slate-500 mt-1">
                    Kolom minimal: Kategori, Uraian Standar Barang / Jasa, Satuan, Harga Standar
                  </span>
                  <span className="mt-3 inline-block px-3 py-1 text-xs font-semibold text-finance-blue bg-blue-50 border border-blue-200 rounded-lg">
                    Cari File
                  </span>
                </label>
              </div>

              {parsing && (
                <div className="text-center py-2 text-slate-500">Membaca dan memetakan struktur file SSH...</div>
              )}

              {importPreview && (
                <div className="space-y-3">
                  <div className="bg-slate-100 p-2.5 rounded-lg flex items-center justify-between">
                    <span className="font-semibold text-slate-700">
                      Total Data Valid: {importPreview.totalValid} baris
                    </span>
                    {importPreview.totalDuplicates > 0 && (
                      <span className="text-amber-700 font-medium">
                        {importPreview.totalDuplicates} nama barang terdeteksi sudah ada
                      </span>
                    )}
                  </div>

                  <div className="border border-slate-200 rounded-lg max-h-52 overflow-y-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] sticky top-0">
                        <tr>
                          <th className="px-3 py-2">Kode</th>
                          <th className="px-3 py-2">Kategori</th>
                          <th className="px-3 py-2">Nama Barang / Jasa</th>
                          <th className="px-3 py-2">Satuan</th>
                          <th className="px-3 py-2 text-right">Harga</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {importPreview.items.slice(0, 20).map((it, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-1.5 text-slate-500">{it.kode_ssh || '-'}</td>
                            <td className="px-3 py-1.5 font-sans">{it.kategori}</td>
                            <td className="px-3 py-1.5 font-sans font-medium text-slate-900">{it.nama_barang}</td>
                            <td className="px-3 py-1.5 font-sans">{it.satuan}</td>
                            <td className="px-3 py-1.5 text-right font-bold text-finance-navy">
                              Rp{Number(it.harga_standar).toLocaleString('id-ID')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setImportPreview(null);
                }}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!importPreview || importPreview.totalValid === 0 || importing}
                onClick={handleConfirmImport}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50"
              >
                {importing ? 'Mengimpor...' : 'Konfirmasi & Simpan ke Master SSH'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
