import React, { useState, useEffect } from 'react';
import { databaseService } from '../lib/databaseService';
import { excelService, ParsedExcelRow, ExcelImportResult } from '../lib/excelService';
import { sshService } from '../lib/sshService';
import { useAuth } from '../lib/authContext';
import { Unit, FiscalYear, Submission, SubmissionItem, MasterSSH } from '../types/database';
import { StatusBadge, SSHBadge } from '../components/StatusBadge';
import { MultiFactorCalculator } from '../components/MultiFactorCalculator';
import {
  FileSpreadsheet,
  Plus,
  Upload,
  Download,
  Trash2,
  Edit,
  Send,
  Save,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Search,
  Filter,
  Eye,
  Info
} from 'lucide-react';

interface SubmissionPageProps {
  onNavigate: (tab: any, params?: any) => void;
}

export const SubmissionPage: React.FC<SubmissionPageProps> = ({ onNavigate }) => {
  const { currentUser, canAccessUnit, canManageDraft } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [allSSH, setAllSSH] = useState<MasterSSH[]>([]);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Modal Create / Edit Submission
  const [showModal, setShowModal] = useState(false);
  const [editingSubmissionId, setEditingSubmissionId] = useState<string | null>(null);

  // Form Fields
  const [formData, setFormData] = useState({
    submission_number: '',
    fiscal_year: '2026',
    submission_date: new Date().toISOString().split('T')[0],
    unit_id: '',
    unit_name: '',
    activity_name: '',
    category: 'Operasional',
    person_in_charge: '',
    notes: '',
  });

  const [items, setItems] = useState<Array<Omit<SubmissionItem, 'id' | 'submission_id'>>>([
    {
      item_number: 1,
      category: 'Operasional',
      item_name: '',
      unit_price: 0,
      volume: 1,
      unit: 'Paket',
      total_amount: 0,
      notes: '',
      multi_factors: []
    }
  ]);

  // Excel Upload State
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [parsingExcel, setParsingExcel] = useState(false);
  const [excelPreview, setExcelPreview] = useState<ExcelImportResult | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [unitsData, yearsData, subsData, sshData] = await Promise.all([
        databaseService.getUnits(),
        databaseService.getFiscalYears(),
        databaseService.getSubmissions(),
        sshService.getMasterSSH()
      ]);

      setUnits(unitsData);
      setFiscalYears(yearsData);
      setAllSSH(sshData);

      // Filter submissions based on role and unit
      if (currentUser?.role === 'OPERATOR' && currentUser.unit_id) {
        setSubmissions(subsData.filter(s => s.unit_id === currentUser.unit_id));
        setSelectedUnit(currentUser.unit_id);
      } else {
        setSubmissions(subsData);
      }
    } catch (err) {
      console.error('Error loading submissions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  // Open Create Modal
  const handleOpenCreateModal = async () => {
    setEditingSubmissionId(null);

    // Default unit
    let defaultUnit = units[0];
    if (currentUser?.role === 'OPERATOR' && currentUser.unit_id) {
      defaultUnit = units.find(u => u.id === currentUser.unit_id) || units[0];
    }

    const defaultYear = '2026';
    const subNumber = await databaseService.getNextSubmissionNumber(defaultUnit.code, defaultYear);

    setFormData({
      submission_number: subNumber,
      fiscal_year: defaultYear,
      submission_date: new Date().toISOString().split('T')[0],
      unit_id: defaultUnit.id,
      unit_name: defaultUnit.name,
      activity_name: '',
      category: 'Operasional',
      person_in_charge: currentUser?.full_name || '',
      notes: '',
    });

    setItems([
      {
        item_number: 1,
        category: 'Operasional',
        item_name: '',
        unit_price: 0,
        volume: 1,
        unit: 'Paket',
        total_amount: 0,
        notes: '',
        multi_factors: []
      }
    ]);

    setShowModal(true);
  };

  // Open Edit Modal for Draft
  const handleOpenEditModal = async (sub: Submission) => {
    if (sub.status !== 'Draft') {
      alert('Hanya berkas berstatus Draft yang dapat diedit secara langsung.');
      return;
    }

    setEditingSubmissionId(sub.id);
    setFormData({
      submission_number: sub.submission_number,
      fiscal_year: sub.fiscal_year,
      submission_date: sub.submission_date,
      unit_id: sub.unit_id,
      unit_name: sub.unit_name,
      activity_name: sub.activity_name,
      category: sub.category,
      person_in_charge: sub.person_in_charge,
      notes: sub.notes || '',
    });

    if (sub.items && sub.items.length > 0) {
      setItems(sub.items.map(it => ({
        item_number: it.item_number,
        category: it.category,
        item_name: it.item_name,
        unit_price: it.unit_price,
        volume: it.volume,
        unit: it.unit,
        total_amount: it.total_amount,
        notes: it.notes || '',
        multi_factors: it.multi_factors || []
      })));
    }

    setShowModal(true);
  };

  // Unit changed inside form
  const handleUnitChange = async (unitId: string) => {
    const selected = units.find(u => u.id === unitId);
    if (!selected) return;

    const newSubNum = await databaseService.getNextSubmissionNumber(selected.code, formData.fiscal_year);
    setFormData(prev => ({
      ...prev,
      unit_id: selected.id,
      unit_name: selected.name,
      submission_number: newSubNum
    }));
  };

  // Add Item Row
  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      {
        item_number: prev.length + 1,
        category: formData.category,
        item_name: '',
        unit_price: 0,
        volume: 1,
        unit: 'Paket',
        total_amount: 0,
        notes: '',
        multi_factors: []
      }
    ]);
  };

  // Remove Item Row
  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      alert('Minimal harus ada 1 item belanja.');
      return;
    }
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  // Update Item Field
  const handleUpdateItem = (index: number, field: string, val: any) => {
    setItems(prev => {
      const copy = [...prev];
      const target = { ...copy[index], [field]: val };

      if (field === 'unit_price' || field === 'volume') {
        const p = field === 'unit_price' ? parseFloat(val) || 0 : target.unit_price;
        const v = field === 'volume' ? parseFloat(val) || 0 : target.volume;
        target.total_amount = Math.round(p * v * 100) / 100;
      }

      copy[index] = target;
      return copy;
    });
  };

  // Save Submission (Draft or Submit)
  const handleSaveSubmission = async (submitDirectly: boolean) => {
    if (!formData.activity_name.trim()) {
      alert('Nama kegiatan atau kebutuhan belanja wajib diisi.');
      return;
    }
    if (!formData.person_in_charge.trim()) {
      alert('Nama penanggung jawab wajib diisi.');
      return;
    }
    if (items.some(it => !it.item_name.trim())) {
      alert('Seluruh uraian barang/kegiatan wajib diisi.');
      return;
    }
    if (items.some(it => it.unit_price <= 0)) {
      alert('Harga satuan setiap item harus lebih dari Rp0.');
      return;
    }

    try {
      const status = submitDirectly ? 'Diajukan' : 'Draft';
      const actorName = currentUser?.full_name || 'Operator';
      const actorRole = currentUser?.role || 'OPERATOR';

      // Attach automatic SSH check results to every item
      const enrichedItems = items.map(it => {
        const sshCheck = sshService.checkPriceAgainstSSH(Number(it.unit_price) || 0, it.item_name, it.unit, allSSH);
        return {
          ...it,
          ssh_item_id: sshCheck.sshItem?.id || null,
          ssh_status: sshCheck.status,
          ssh_price: sshCheck.sshPrice || null,
          ssh_diff: sshCheck.diff || null,
        };
      });

      if (editingSubmissionId) {
        // Update existing draft
        await databaseService.updateDraft(
          editingSubmissionId,
          {
            ...formData,
            status: status
          },
          enrichedItems,
          actorName,
          actorRole
        );
      } else {
        // Create new
        await databaseService.createSubmission(
          {
            submission_number: formData.submission_number,
            fiscal_year: formData.fiscal_year,
            submission_date: formData.submission_date,
            unit_id: formData.unit_id,
            unit_name: formData.unit_name,
            activity_name: formData.activity_name,
            category: formData.category,
            person_in_charge: formData.person_in_charge,
            notes: formData.notes,
            status: status,
            submitted_by: actorName,
            submitted_by_id: currentUser?.id
          },
          enrichedItems,
          actorName,
          actorRole
        );
      }

      setShowModal(false);
      await loadData();
      alert(submitDirectly ? 'Pengajuan berhasil diajukan ke Bendahara!' : 'Draft pengajuan berhasil disimpan.');
    } catch (err: any) {
      alert(`Gagal menyimpan: ${err.message}`);
    }
  };

  // Submit Draft from Table
  const handleSubmitDraft = async (sub: Submission) => {
    if (!confirm(`Apakah Anda yakin ingin mengajukan berkas ${sub.submission_number} ke Bendahara? Setelah diajukan, berkas masuk proses analisis resmi.`)) {
      return;
    }
    try {
      await databaseService.submitDraft(
        sub.id,
        currentUser?.full_name || 'Operator',
        currentUser?.role || 'OPERATOR'
      );
      await loadData();
      alert('Pengajuan berhasil diajukan ke Bendahara.');
    } catch (err: any) {
      alert(`Gagal mengajukan: ${err.message}`);
    }
  };

  // Delete Draft
  const handleDeleteDraft = async (sub: Submission) => {
    if (!confirm(`Hapus permanen draft ${sub.submission_number}? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }
    try {
      await databaseService.deleteDraft(
        sub.id,
        currentUser?.full_name || 'Operator',
        currentUser?.role || 'OPERATOR'
      );
      await loadData();
      alert('Draft pengajuan berhasil dihapus.');
    } catch (err: any) {
      alert(`Gagal menghapus draft: ${err.message}`);
    }
  };

  // Handle Excel File Selection
  const handleExcelFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelFile(file);
    setParsingExcel(true);
    try {
      const result = await excelService.parseExcelFile(file);
      setExcelPreview(result);
    } catch (err: any) {
      alert(`Format Excel tidak valid: ${err.message}`);
      setExcelPreview(null);
    } finally {
      setParsingExcel(false);
    }
  };

  // Confirm Import Excel into current form
  const handleApplyExcelImport = () => {
    if (!excelPreview) return;

    if (excelPreview.totalErrors > 0) {
      if (!confirm(`Terdapat ${excelPreview.totalErrors} baris yang memiliki catatan error. Lanjutkan impor baris yang valid?`)) {
        return;
      }
    }

    const validRows = excelPreview.parsedItems.filter(p => p.errors.length === 0);
    if (validRows.length === 0) {
      alert('Tidak ada baris valid untuk diimpor.');
      return;
    }

    // Map into form items with automatic SSH check
    const importedItems: Array<Omit<SubmissionItem, 'id' | 'submission_id'>> = validRows.map((r, idx) => {
      const sshCheck = sshService.checkPriceAgainstSSH(r.hargaSatuan, r.uraian, r.satuan, allSSH);
      return {
        item_number: idx + 1,
        category: r.kategori || formData.category,
        item_name: r.uraian,
        unit_price: r.hargaSatuan,
        volume: r.volume,
        unit: r.satuan,
        total_amount: r.jumlah,
        notes: r.keterangan,
        multi_factors: r.multiFactors || [],
        ssh_item_id: sshCheck.sshItem?.id || null,
        ssh_status: sshCheck.status,
        ssh_price: sshCheck.sshPrice || null,
        ssh_diff: sshCheck.diff || null,
      };
    });

    setItems(importedItems);

    // Apply metadata if detected
    if (excelPreview.metadata?.namaKegiatan && !formData.activity_name) {
      const detectedActivity = excelPreview.metadata.namaKegiatan;
      setFormData(prev => ({ ...prev, activity_name: detectedActivity }));
    }

    setShowExcelModal(false);
    setExcelFile(null);
    setExcelPreview(null);
    alert(`Berhasil mengimpor ${importedItems.length} item dari file Excel.`);
  };

  // Grand Total in Form
  const formGrandTotal = items.reduce((sum, item) => sum + Number(item.total_amount || 0), 0);

  // Filtered Submissions
  const filteredSubmissions = submissions.filter(s => {
    if (selectedUnit !== 'ALL' && s.unit_id !== selectedUnit) return false;
    if (selectedStatus !== 'ALL' && s.status !== selectedStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNum = s.submission_number.toLowerCase().includes(q);
      const matchAct = s.activity_name.toLowerCase().includes(q);
      const matchPj = s.person_in_charge.toLowerCase().includes(q);
      if (!matchNum && !matchAct && !matchPj) return false;
    }
    return true;
  });

  return (
    <div className="space-y-5 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-finance-navy">
            {currentUser?.role === 'OPERATOR' ? 'Pengajuan Dana Unit' : 'Pengajuan Dana Masuk'}
          </h1>
          <p className="text-xs text-slate-500">
            {currentUser?.role === 'OPERATOR'
              ? 'Penyusunan Rencana Anggaran Biaya (RAB), impor spreadsheet Excel, dan pengajuan resmi ke Bendahara Yayasan.'
              : 'Daftar seluruh berkas pengajuan anggaran yang masuk dari unit-unit untuk ditinjau dan dianalisis.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Download Official Template */}
          <a
            href="/Template_Pengajuan_Resmi_Yayasan.xlsx"
            download="Template_Pengajuan_Resmi_Yayasan.xlsx"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm"
            title="Unduh Format Excel Resmi Yayasan Al-Qur'aniyyah"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Unduh Template Excel</span>
          </a>

          {/* New Submission Button */}
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-finance-blue rounded-lg hover:bg-finance-blueHover shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Pengajuan Baru</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-2.5 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nomor, kegiatan, penanggung jawab..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-finance-blue focus:border-finance-blue"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Unit Filter */}
          {currentUser?.role !== 'OPERATOR' && (
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-finance-blue bg-white"
            >
              <option value="ALL">Seluruh Unit</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.code}
                </option>
              ))}
            </select>
          )}

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-finance-blue bg-white"
          >
            <option value="ALL">Seluruh Status</option>
            <option value="Draft">Draft</option>
            <option value="Diajukan">Diajukan</option>
            <option value="Sedang Dianalisis">Sedang Dianalisis</option>
            <option value="Menunggu Persetujuan">Menunggu Persetujuan</option>
            <option value="Disetujui">Disetujui</option>
            <option value="Siap Dicairkan">Siap Dicairkan</option>
            <option value="Dicairkan Sebagian">Dicairkan Sebagian</option>
            <option value="Selesai Dicairkan">Selesai Dicairkan</option>
            <option value="Ditolak">Ditolak</option>
          </select>
        </div>
      </div>

      {/* Table of Submissions */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Memuat data pengajuan...</div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="p-12 text-center">
            <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <div className="text-sm font-semibold text-slate-700">Tidak Ada Pengajuan</div>
            <div className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Belum ada berkas pengajuan pada filter ini. Klik tombol "Buat Pengajuan Baru" untuk memulai draft usulan anggaran.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Nomor & Tanggal</th>
                  <th className="px-3 py-3">Unit</th>
                  <th className="px-4 py-3">Kegiatan / Kebutuhan</th>
                  <th className="px-4 py-3 text-right">Total Diajukan</th>
                  <th className="px-4 py-3 text-right">Total Disetujui</th>
                  <th className="px-3 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Aksi & Disposisi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSubmissions.map((sub) => {
                  const isOwnerDraft = canManageDraft(sub.unit_id, sub.status);

                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-mono font-bold text-slate-900">{sub.submission_number}</div>
                        <div className="text-[11px] text-slate-400">{sub.submission_date} • TA {sub.fiscal_year}</div>
                      </td>
                      <td className="px-3 py-3 font-semibold text-slate-800">
                        {sub.unit_name}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{sub.activity_name}</div>
                        <div className="text-[11px] text-slate-400">
                          {sub.category} • PJ: {sub.person_in_charge}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900">
                        Rp{Number(sub.original_total).toLocaleString('id-ID')}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-sky-800">
                        {sub.approved_total > 0 ? `Rp${Number(sub.approved_total).toLocaleString('id-ID')}` : '-'}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <StatusBadge status={sub.status} size="sm" />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* If it's a Draft, allow Edit, Submit, and Delete */}
                          {sub.status === 'Draft' && isOwnerDraft && (
                            <>
                              <button
                                onClick={() => handleOpenEditModal(sub)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 border border-blue-200 rounded"
                                title="Edit Draft"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleSubmitDraft(sub)}
                                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-white bg-finance-blue hover:bg-finance-blueHover rounded"
                                title="Ajukan ke Bendahara"
                              >
                                <Send className="w-3 h-3" />
                                <span>Ajukan</span>
                              </button>
                              <button
                                onClick={() => handleDeleteDraft(sub)}
                                className="p-1.5 text-red-600 hover:bg-red-50 border border-red-200 rounded"
                                title="Hapus Draft"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {/* View Report Button */}
                          <button
                            onClick={() => onNavigate('reports', { submissionId: sub.id })}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded"
                            title="Buka Lembar Laporan"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Laporan</span>
                          </button>

                          {/* Bendahara shortcut to Analysis */}
                          {(currentUser?.role === 'BENDAHARA' || currentUser?.role === 'ADMIN') &&
                            (sub.status === 'Diajukan' || sub.status === 'Sedang Dianalisis') && (
                              <button
                                onClick={() => onNavigate('analysis', { submissionId: sub.id })}
                                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded"
                              >
                                <span>Analisis</span>
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =========================================================================
          MODAL: CREATE / EDIT SUBMISSION WITH MULTI-FACTOR ITEMS
      ========================================================================= */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[94vh] flex flex-col border border-slate-200 my-auto">
            {/* Modal Header */}
            <div className="px-4 sm:px-6 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-xl shrink-0">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-finance-blue" />
                <h2 className="text-sm sm:text-base font-bold text-finance-navy">
                  {editingSubmissionId ? 'Edit Draft Usulan Pengajuan' : 'Form Pengajuan Anggaran Baru'}
                </h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-3 sm:p-5 overflow-y-auto flex-1 space-y-4">
              {/* Header Info Form */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 p-3 sm:p-4 rounded-lg border border-slate-200">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nomor Pengajuan</label>
                  <input
                    type="text"
                    disabled
                    value={formData.submission_number}
                    className="w-full text-xs font-mono font-bold bg-slate-100 border border-slate-200 rounded-lg p-2 text-finance-navy"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tahun Anggaran</label>
                  <select
                    value={formData.fiscal_year}
                    onChange={(e) => setFormData(prev => ({ ...prev, fiscal_year: e.target.value }))}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white"
                  >
                    {fiscalYears.map(fy => (
                      <option key={fy.id} value={fy.year}>{fy.year}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Unit Pemohon</label>
                  <select
                    value={formData.unit_id}
                    disabled={currentUser?.role === 'OPERATOR'}
                    onChange={(e) => handleUnitChange(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white disabled:bg-slate-100 font-medium"
                  >
                    {units.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={formData.submission_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, submission_date: e.target.value }))}
                    className="w-full text-xs border border-slate-200 rounded-lg p-1.5 bg-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Nama Kegiatan / Kebutuhan Belanja <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Ujian Satuan Pendidikan & TKA Semester Genap"
                    value={formData.activity_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, activity_name: e.target.value }))}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-finance-blue"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Kategori</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white"
                  >
                    <option value="Operasional">Operasional Rutin</option>
                    <option value="Kegiatan & Pembinaan Santri">Kegiatan Santri</option>
                    <option value="Ujian & Kurikulum">Ujian & Kurikulum</option>
                    <option value="Honorarium & SDM">Honorarium & SDM</option>
                    <option value="Sarana Prasarana & Pembangunan">Sarpras & Pembangunan</option>
                    <option value="Lain-lain & Darurat">Lain-lain & Darurat</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Penanggung Jawab (PJ) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Nama penanggung jawab"
                    value={formData.person_in_charge}
                    onChange={(e) => setFormData(prev => ({ ...prev, person_in_charge: e.target.value }))}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-finance-blue"
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Keterangan / Catatan Pengajuan</label>
                  <input
                    type="text"
                    placeholder="Keterangan tambahan keperluan pengajuan anggaran..."
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2"
                  />
                </div>
              </div>

              {/* Items Section Header with Excel Import Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-finance-navy">Rincian Barang & Biaya Belanja</h3>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                    {items.length} Item
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Upload Excel Button (Section G) */}
                  <button
                    type="button"
                    onClick={() => setShowExcelModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-lg hover:bg-emerald-100 shadow-sm"
                  >
                    <Upload className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Import dari Excel (.xlsx)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-finance-blue bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Baris</span>
                  </button>
                </div>
              </div>

              {/* Items List - Fully Responsive for Mobile & Desktop */}
              <div className="space-y-3">
                {items.map((item, idx) => {
                  const sshCheck = sshService.checkPriceAgainstSSH(Number(item.unit_price) || 0, item.item_name, item.unit, allSSH);
                  return (
                    <div key={idx} className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-sm space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                        <span className="font-bold text-slate-600 text-xs">Item Belanja #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="inline-flex items-center gap-1 text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded text-xs transition-colors"
                          title="Hapus baris item ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="text-[11px] font-medium">Hapus</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                        <div className="sm:col-span-6">
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            Uraian Barang / Belanja Kegiatan <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="Nama barang / kegiatan..."
                            value={item.item_name}
                            onChange={(e) => handleUpdateItem(idx, 'item_name', e.target.value)}
                            className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:border-finance-blue focus:ring-1 focus:ring-finance-blue"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <div className="flex items-center justify-between mb-0.5">
                            <label className="block text-[10px] font-semibold text-slate-500">
                              Harga Satuan (Rp) <span className="text-red-500">*</span>
                            </label>
                            {item.item_name.trim() && (
                              <SSHBadge status={sshCheck.status} diff={sshCheck.diff} size="sm" />
                            )}
                          </div>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="0"
                            value={item.unit_price === 0 ? '' : item.unit_price}
                            onChange={(e) => handleUpdateItem(idx, 'unit_price', e.target.value)}
                            className={`w-full text-xs font-mono text-right border rounded-lg p-2 focus:border-finance-blue font-semibold ${
                              sshCheck.status === 'MELEBIHI' ? 'border-red-300 bg-red-50/40 text-red-700' : 'border-slate-200'
                            }`}
                          />
                          {sshCheck.sshPrice && (
                            <div className="text-[10px] text-slate-500 mt-0.5 text-right font-mono">
                              SSH: Rp{sshCheck.sshPrice.toLocaleString('id-ID')}
                            </div>
                          )}
                        </div>

                        <div className="sm:col-span-3">
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Satuan</label>
                          <input
                            type="text"
                            placeholder="Rim / Kotak / Orang"
                            value={item.unit}
                            onChange={(e) => handleUpdateItem(idx, 'unit', e.target.value)}
                            className="w-full text-xs border border-slate-200 rounded-lg p-2"
                          />
                        </div>
                      </div>

                      {/* Multi-Factor Volume Calculator Component (Section H) */}
                      <MultiFactorCalculator
                        unitPrice={Number(item.unit_price) || 0}
                        factors={item.multi_factors || []}
                        onChangeFactors={(factors) => handleUpdateItem(idx, 'multi_factors', factors)}
                        onTotalCalculated={(total, volume) => {
                          handleUpdateItem(idx, 'total_amount', total);
                          handleUpdateItem(idx, 'volume', volume);
                        }}
                      />

                      {/* Notes for this item */}
                      <div>
                        <input
                          type="text"
                          placeholder="Keterangan rincian (opsional)..."
                          value={item.notes || ''}
                          onChange={(e) => handleUpdateItem(idx, 'notes', e.target.value)}
                          className="w-full text-[11px] text-slate-600 border border-slate-200 bg-slate-50/50 rounded-lg px-2.5 py-1.5"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 rounded-b-xl">
              <div>
                <span className="text-xs text-slate-500 mr-2">Total Seluruh Pengajuan:</span>
                <span className="text-base font-bold text-finance-navy font-mono">
                  Rp{formGrandTotal.toLocaleString('id-ID')}
                </span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Batal
                </button>

                {/* Save as Draft */}
                <button
                  type="button"
                  onClick={() => handleSaveSubmission(false)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-800 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Draft</span>
                </button>

                {/* Submit to Bendahara */}
                <button
                  type="button"
                  onClick={() => handleSaveSubmission(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-finance-blue hover:bg-finance-blueHover rounded-lg transition-colors shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Ajukan ke Bendahara</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: EXCEL IMPORT PREVIEW & COLUMN MAPPER (Section G)
      ========================================================================= */}
      {showExcelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col border border-slate-200">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-xl shrink-0">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-finance-navy">Import Dokumen Excel RAB (.xlsx / .xls)</h3>
              </div>
              <button
                onClick={() => {
                  setShowExcelModal(false);
                  setExcelPreview(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {/* File input box */}
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-finance-blue transition-colors bg-slate-50/50">
                <input
                  type="file"
                  id="excelFileInput"
                  accept=".xlsx, .xls"
                  onChange={handleExcelFileChange}
                  className="hidden"
                />
                <label htmlFor="excelFileInput" className="cursor-pointer flex flex-col items-center">
                  <FileSpreadsheet className="w-10 h-10 text-finance-blue mb-2" />
                  <span className="text-xs font-bold text-slate-800">
                    {excelFile ? excelFile.name : 'Pilih File Excel RAB Yayasan'}
                  </span>
                  <span className="text-[11px] text-slate-500 mt-1">
                    Mendukung format kolom standar maupun multivolume perkalian dinamis
                  </span>
                  <span className="mt-3 inline-block px-3 py-1 text-xs font-semibold text-finance-blue bg-blue-50 border border-blue-200 rounded-lg">
                    Cari File di Komputer / HP
                  </span>
                </label>
              </div>

              {parsingExcel && (
                <div className="text-center py-4 text-xs text-slate-500">
                  Menganalisis lembar kerja dan memetakan struktur kolom...
                </div>
              )}

              {/* Preview table */}
              {excelPreview && (
                <div className="space-y-3">
                  {/* 5 Checkpoints Automatic Validation Summary (Section 1.D) */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                    <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-center">
                      <span className="text-[10px] text-slate-500 font-semibold block uppercase">Total Baris File</span>
                      <span className="font-mono font-bold text-slate-800 text-sm">{excelPreview.totalRowsInFile} baris</span>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg text-center">
                      <span className="text-[10px] text-emerald-700 font-semibold block uppercase">Item Berhasil Dibaca</span>
                      <span className="font-mono font-bold text-emerald-700 text-sm">{excelPreview.totalValid} item</span>
                    </div>
                    <div className={`p-2.5 rounded-lg text-center border ${excelPreview.totalErrors > 0 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                      <span className="text-[10px] font-semibold block uppercase">Item Gagal / Error</span>
                      <span className="font-mono font-bold text-sm">{excelPreview.totalErrors} item</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-center">
                      <span className="text-[10px] text-slate-500 font-semibold block uppercase">Total Nominal di Excel</span>
                      <span className="font-mono font-bold text-slate-900 text-xs truncate block" title={excelPreview.excelGrandTotal ? `Rp${excelPreview.excelGrandTotal.toLocaleString('id-ID')}` : 'Tidak tertera'}>
                        {excelPreview.excelGrandTotal ? `Rp${excelPreview.excelGrandTotal.toLocaleString('id-ID')}` : 'Tidak tertera'}
                      </span>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 p-2.5 rounded-lg text-center">
                      <span className="text-[10px] text-finance-blue font-semibold block uppercase">Total Hasil Import</span>
                      <span className="font-mono font-bold text-finance-navy text-xs truncate block">
                        Rp{excelPreview.importedGrandTotal.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>

                  {/* Discrepancy Warning if Excel total differs from Imported items */}
                  {excelPreview.excelGrandTotal !== null && Math.abs(excelPreview.discrepancy) > 1 && (
                    <div className="bg-amber-50 border border-amber-300 text-amber-900 p-3 rounded-lg text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <div>
                        <strong>Peringatan Selisih Nominal Excel:</strong> Terdapat selisih sebesar{' '}
                        <span className="font-mono font-bold">Rp{Math.abs(excelPreview.discrepancy).toLocaleString('id-ID')}</span>{' '}
                        antara total ringkasan pada berkas Excel (Rp{excelPreview.excelGrandTotal.toLocaleString('id-ID')}) dengan total kalkulasi item yang terbaca (Rp{excelPreview.importedGrandTotal.toLocaleString('id-ID')}).
                      </div>
                    </div>
                  )}

                  {/* Row errors listing */}
                  {excelPreview.rowErrors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg text-xs space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-red-900">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                        <span>Catatan Validasi Baris Excel ({excelPreview.rowErrors.length}):</span>
                      </div>
                      <div className="max-h-24 overflow-y-auto space-y-0.5 text-[11px] pl-5 list-disc">
                        {excelPreview.rowErrors.map((err, errIdx) => (
                          <div key={errIdx}>• {err.message}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-60">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] sticky top-0">
                        <tr>
                          <th className="px-3 py-2">No</th>
                          <th className="px-3 py-2">Kategori</th>
                          <th className="px-3 py-2">Uraian Barang/Kegiatan</th>
                          <th className="px-3 py-2 text-right">Harga (Rp)</th>
                          <th className="px-3 py-2">Uji SSH</th>
                          <th className="px-3 py-2 text-center">Vol</th>
                          <th className="px-3 py-2">Satuan</th>
                          <th className="px-3 py-2 text-right">Jumlah (Rp)</th>
                          <th className="px-3 py-2">Keterangan</th>
                          <th className="px-3 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {excelPreview.parsedItems.map((item, idx) => {
                          const sshCheck = sshService.checkPriceAgainstSSH(item.hargaSatuan, item.uraian, item.satuan, allSSH);
                          return (
                            <tr key={idx} className={item.errors.length > 0 ? 'bg-red-50/50' : ''}>
                              <td className="px-3 py-2 text-slate-500 font-mono">{item.item_number || idx + 1}</td>
                              <td className="px-3 py-2 text-slate-600 font-medium">{item.kategori}</td>
                              <td className="px-3 py-2 font-medium text-slate-800">{item.uraian}</td>
                              <td className="px-3 py-2 text-right font-mono">
                                Rp{item.hargaSatuan.toLocaleString('id-ID')}
                              </td>
                              <td className="px-3 py-2">
                                <SSHBadge status={sshCheck.status} diff={sshCheck.diff} percentageDiff={sshCheck.percentageDiff} size="sm" />
                              </td>
                              <td className="px-3 py-2 text-center font-mono font-semibold">{item.volume}</td>
                              <td className="px-3 py-2 text-slate-600">{item.satuan}</td>
                              <td className="px-3 py-2 text-right font-mono font-semibold">
                                Rp{item.jumlah.toLocaleString('id-ID')}
                              </td>
                              <td className="px-3 py-2 text-slate-500 text-[11px] truncate max-w-[150px]">{item.keterangan || '-'}</td>
                              <td className="px-3 py-2">
                                {item.errors.length === 0 ? (
                                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">
                                    Valid
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-red-700 bg-red-50 px-1.5 py-0.5 rounded font-bold" title={item.errors.join(', ')}>
                                    Error
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2 rounded-b-xl">
              <button
                type="button"
                onClick={() => {
                  setShowExcelModal(false);
                  setExcelPreview(null);
                }}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!excelPreview || excelPreview.totalValid === 0}
                onClick={handleApplyExcelImport}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50 transition-colors shadow-sm"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Konfirmasi & Terapkan ke Form</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
