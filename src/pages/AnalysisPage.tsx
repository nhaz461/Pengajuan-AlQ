import React, { useState, useEffect } from 'react';
import { databaseService } from '../lib/databaseService';
import { sshService } from '../lib/sshService';
import { useAuth } from '../lib/authContext';
import { Submission, AnalysisItem, MasterSSH, MultiFactor } from '../types/database';
import { StatusBadge, SSHBadge } from '../components/StatusBadge';
import { MultiFactorCalculator } from '../components/MultiFactorCalculator';
import {
  FileSearch,
  Save,
  Send,
  Plus,
  Trash2,
  Undo2,
  AlertTriangle,
  RefreshCw,
  Calculator,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Layers,
  FileCheck2,
  Info
} from 'lucide-react';

interface AnalysisPageProps {
  initialSubmissionId?: string | null;
  onNavigate: (tab: any, params?: any) => void;
}

export const AnalysisPage: React.FC<AnalysisPageProps> = ({ initialSubmissionId, onNavigate }) => {
  const { currentUser, isBendahara } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [allSSH, setAllSSH] = useState<MasterSSH[]>([]);

  // View Mode: 'SPLIT' (Side-by-Side) or 'TAB' (Pengajuan Asli vs Hasil Analisis)
  const [activeTab, setActiveTab] = useState<'ANALYSIS' | 'ORIGINAL'>('ANALYSIS');

  // Analysis Workspace state
  const [analysisItems, setAnalysisItems] = useState<AnalysisItem[]>([]);
  const [treasurerNotes, setTreasurerNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [subsData, sshData] = await Promise.all([
        databaseService.getSubmissions(),
        sshService.getMasterSSH()
      ]);

      setAllSSH(sshData);

      // Submissions available for analysis
      const relevant = subsData.filter(s =>
        ['Diajukan', 'Sedang Dianalisis', 'Draft Siap Dicairkan', 'Disetujui'].includes(s.status)
      );
      setSubmissions(relevant);

      if (initialSubmissionId) {
        const target = subsData.find(s => s.id === initialSubmissionId);
        if (target) selectSubmission(target, sshData);
      } else if (relevant.length > 0 && !selectedSubmission) {
        selectSubmission(relevant[0], sshData);
      }
    } catch (err) {
      console.error('Error loading submissions for analysis:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [initialSubmissionId]);

  // Select a submission to analyze and perform SSH check
  const selectSubmission = (sub: Submission, sshCatalog: MasterSSH[] = allSSH) => {
    setSelectedSubmission(sub);
    setTreasurerNotes(sub.treasurer_notes || '');

    if (sub.analysis_items && sub.analysis_items.length > 0) {
      // Load existing analyzed items and re-verify SSH status
      setAnalysisItems(
        sub.analysis_items.map(it => {
          const factors = it.multi_factors ? (typeof it.multi_factors === 'string' ? JSON.parse(it.multi_factors) : it.multi_factors) : [];
          const sshCheck = sshService.checkPriceAgainstSSH(Number(it.unit_price), it.item_name, it.unit, sshCatalog);
          return {
            ...it,
            multi_factors: factors,
            ssh_item_id: it.ssh_item_id || sshCheck.sshItem?.id || null,
            ssh_status: it.ssh_status || sshCheck.status,
            ssh_price: it.ssh_price || sshCheck.sshPrice,
            ssh_diff: it.ssh_diff || sshCheck.diff
          };
        })
      );
    } else if (sub.items && sub.items.length > 0) {
      // Initialize from original items as 'KEPT'
      const initialAnalysis: AnalysisItem[] = sub.items.map((orig, idx) => {
        const factors = orig.multi_factors ? (typeof orig.multi_factors === 'string' ? JSON.parse(orig.multi_factors as any) : orig.multi_factors) : [];
        const sshCheck = sshService.checkPriceAgainstSSH(Number(orig.unit_price), orig.item_name, orig.unit, sshCatalog);

        return {
          id: `analysis_item_${Date.now()}_${idx}`,
          original_item_id: orig.id,
          item_type: 'KEPT',
          category: orig.category,
          item_name: orig.item_name,
          unit_price: Number(orig.unit_price),
          volume: Number(orig.volume),
          unit: orig.unit,
          total_amount: Number(orig.total_amount),
          multi_factors: factors,
          change_reason: '',
          ssh_item_id: sshCheck.sshItem?.id || null,
          ssh_status: sshCheck.status,
          ssh_price: sshCheck.sshPrice,
          ssh_diff: sshCheck.diff,
          sort_order: idx + 1
        };
      });
      setAnalysisItems(initialAnalysis);
    } else {
      setAnalysisItems([]);
    }
  };

  // Modify an analyzed item
  const handleUpdateAnalysisItem = (index: number, field: keyof AnalysisItem, val: any) => {
    setAnalysisItems(prev => {
      const copy = [...prev];
      const target = { ...copy[index], [field]: val };

      if (target.item_type === 'KEPT' && field !== 'change_reason') {
        target.item_type = 'MODIFIED';
      }

      if (field === 'unit_price' || field === 'volume') {
        const p = field === 'unit_price' ? parseFloat(val) || 0 : target.unit_price;
        const v = field === 'volume' ? parseFloat(val) || 0 : target.volume;
        target.total_amount = Math.round(p * v * 100) / 100;
      }

      // Recheck SSH when price, name, or unit is changed
      if (field === 'unit_price' || field === 'item_name' || field === 'unit') {
        const check = sshService.checkPriceAgainstSSH(Number(target.unit_price), target.item_name, target.unit, allSSH);
        target.ssh_status = check.status;
        target.ssh_price = check.sshPrice;
        target.ssh_diff = check.diff;
        target.ssh_item_id = check.sshItem?.id || null;
      }

      copy[index] = target;
      return copy;
    });
  };

  // Remove item from analyzed design
  const handleRemoveAnalysisItem = (index: number) => {
    setAnalysisItems(prev => {
      const copy = [...prev];
      const target = copy[index];
      if (target.item_type === 'ADDED') {
        return prev.filter((_, i) => i !== index);
      } else {
        target.item_type = 'REMOVED';
        target.total_amount = 0;
        if (!target.change_reason) {
          target.change_reason = 'Dihapus dari rancangan pencairan oleh Bendahara Umum.';
        }
        return copy;
      }
    });
  };

  // Restore removed item
  const handleRestoreAnalysisItem = (index: number) => {
    if (!selectedSubmission) return;
    const target = analysisItems[index];
    const orig = selectedSubmission.items?.find(i => i.id === target.original_item_id);

    if (orig) {
      setAnalysisItems(prev => {
        const copy = [...prev];
        const factors = orig.multi_factors || [];
        const check = sshService.checkPriceAgainstSSH(Number(orig.unit_price), orig.item_name, orig.unit, allSSH);

        copy[index] = {
          ...copy[index],
          item_type: 'KEPT',
          unit_price: Number(orig.unit_price),
          volume: Number(orig.volume),
          unit: orig.unit,
          total_amount: Number(orig.total_amount),
          multi_factors: factors,
          change_reason: '',
          ssh_status: check.status,
          ssh_price: check.sshPrice,
          ssh_diff: check.diff,
          ssh_item_id: check.sshItem?.id || null
        };
        return copy;
      });
    }
  };

  // Add a brand new item into analyzed design
  const handleAddNewItem = () => {
    const newItem: AnalysisItem = {
      id: `added_${Date.now()}`,
      original_item_id: null,
      item_type: 'ADDED',
      category: selectedSubmission?.category || 'Operasional',
      item_name: '',
      unit_price: 0,
      volume: 1,
      unit: 'Paket',
      total_amount: 0,
      multi_factors: [],
      change_reason: 'Pos biaya tambahan yang ditetapkan oleh Bendahara Umum.',
      ssh_status: 'BELUM_DITEMUKAN',
      sort_order: analysisItems.length + 1
    };
    setAnalysisItems(prev => [...prev, newItem]);
  };

  // Calculated Totals
  const totalOriginal = Number(selectedSubmission?.original_total || 0);
  const totalApproved = analysisItems
    .filter(it => it.item_type !== 'REMOVED')
    .reduce((sum, it) => sum + Number(it.total_amount || 0), 0);

  // Exact formula: Selisih = Total Pengajuan Awal − Total Hasil Analisis (Clearly shows negative if analysis is higher)
  const selisih = totalOriginal - totalApproved;
  const persentasePencairan = totalOriginal > 0 ? ((totalApproved / totalOriginal) * 100).toFixed(1) : '0';

  // Save Analysis (Draft OR "Simpan ke Draft Anggaran Siap Dicairkan")
  const handleSave = async (saveToDraftSiapDicairkan: boolean) => {
    if (!selectedSubmission) return;

    // Check if any MODIFIED item lacks a change reason
    const unreasoned = analysisItems.find(it => it.item_type === 'MODIFIED' && !it.change_reason?.trim());
    if (unreasoned) {
      alert(`Mohon berikan alasan perubahan untuk item: "${unreasoned.item_name}"`);
      return;
    }

    setSaving(true);
    try {
      await databaseService.saveAnalysis({
        submissionId: selectedSubmission.id,
        analysisItems: analysisItems.map(it => ({
          original_item_id: it.original_item_id,
          item_type: it.item_type,
          category: it.category,
          item_name: it.item_name,
          unit_price: it.unit_price,
          volume: it.volume,
          unit: it.unit,
          total_amount: it.total_amount,
          multi_factors: it.multi_factors,
          change_reason: it.change_reason,
          treasurer_notes: it.treasurer_notes,
          ssh_item_id: it.ssh_item_id,
          ssh_status: it.ssh_status,
          ssh_price: it.ssh_price,
          ssh_diff: it.ssh_diff,
          sort_order: it.sort_order
        })),
        treasurerNotes: treasurerNotes,
        saveToDraftSiapDicairkan: saveToDraftSiapDicairkan,
        actorName: currentUser?.full_name || 'Bendahara Umum',
        actorRole: currentUser?.role || 'BENDAHARA'
      });

      if (saveToDraftSiapDicairkan) {
        alert('Hasil analisis berhasil ditetapkan dan masuk ke menu "Draft Anggaran Siap Dicairkan"!');
        onNavigate('draft-siap-dicairkan', { submissionId: selectedSubmission.id });
      } else {
        alert('Draft analisis bendahara berhasil disimpan.');
        await loadData();
      }
    } catch (err: any) {
      alert(`Gagal menyimpan: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-finance-navy">Analisis Pengajuan Multi-Faktor & SSH</h1>
          <p className="text-xs text-slate-500">
            Penyesuaian metode perhitungan anggaran (2, 3, 4 faktor atau lebih) dan pemeriksaan otomatis Standar Satuan Harga (SSH).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </button>
        </div>
      </div>

      {/* Select Submission Dropdown Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="w-full sm:w-auto flex-1 flex items-center gap-2">
          <FileSearch className="w-4 h-4 text-finance-blue shrink-0" />
          <span className="text-xs font-semibold text-slate-700 shrink-0">Pilih Berkas Pengajuan Unit:</span>
          <select
            value={selectedSubmission?.id || ''}
            onChange={(e) => {
              const sub = submissions.find(s => s.id === e.target.value);
              if (sub) selectSubmission(sub);
            }}
            className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-finance-blue bg-white font-medium"
          >
            {submissions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.submission_number} • {s.unit_name} - {s.activity_name} (Rp{Number(s.original_total).toLocaleString('id-ID')}) [{s.status}]
              </option>
            ))}
          </select>
        </div>

        {selectedSubmission && (
          <div className="flex items-center gap-2 shrink-0">
            <StatusBadge status={selectedSubmission.status} size="sm" />
          </div>
        )}
      </div>

      {!selectedSubmission ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center">
          <FileSearch className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <div className="text-sm font-semibold text-slate-700">Belum Ada Pengajuan Terpilih</div>
          <div className="text-xs text-slate-400 mt-1">Pilih berkas pengajuan di atas untuk memulai analisis.</div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Executive Comparison Metric Cards (Section D & E) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Total Diajukan Awal */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-500 font-medium">Total Pengajuan Awal (Unit)</span>
              <div className="text-base font-bold text-slate-900 font-mono mt-1">
                Rp{totalOriginal.toLocaleString('id-ID')}
              </div>
              <div className="text-[10px] text-slate-400">RAB Asli Unit Pemohon</div>
            </div>

            {/* Total Hasil Analisis Bendahara */}
            <div className="bg-white p-3.5 rounded-xl border border-finance-blue/40 bg-blue-50/20 shadow-sm">
              <span className="text-xs text-finance-blue font-bold">Total Hasil Analisis (Disetujui)</span>
              <div className="text-base font-bold text-finance-blue font-mono mt-1">
                Rp{totalApproved.toLocaleString('id-ID')}
              </div>
              <div className="text-[10px] text-emerald-700 font-semibold">
                Rasio: {persentasePencairan}%
              </div>
            </div>

            {/* Selisih Nominal (Selisih = Total Pengajuan Awal - Total Hasil Analisis) */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-500 font-medium">Selisih Nominal</span>
              <div className={`text-base font-bold font-mono mt-1 ${selisih < 0 ? 'text-red-600' : 'text-indigo-900'}`}>
                {selisih < 0 ? '-' : ''}Rp{Math.abs(selisih).toLocaleString('id-ID')}
              </div>
              <div className="text-[10px] text-slate-400">
                {selisih < 0 ? 'Penambahan dari pengajuan' : 'Efisiensi / Pengurangan'}
              </div>
            </div>

            {/* Status Pemeriksaan SSH */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-500 font-medium">Pemeriksaan Master SSH</span>
              <div className="flex items-center gap-1.5 mt-1.5">
                {analysisItems.some(it => it.ssh_status === 'MELEBIHI' && it.item_type !== 'REMOVED') ? (
                  <span className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                    Ada Melebihi SSH
                  </span>
                ) : (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Sesuai Standar SSH
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">Acuan Master SSH 2026</div>
            </div>
          </div>

          {/* Tab Navigation: Pengajuan Asli vs Hasil Analisis (Section E) */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('ANALYSIS')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
                  activeTab === 'ANALYSIS'
                    ? 'bg-finance-navy text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Calculator className="w-4 h-4" />
                <span>Hasil Analisis Bendahara ({analysisItems.filter(i => i.item_type !== 'REMOVED').length} Item)</span>
              </button>

              <button
                onClick={() => setActiveTab('ORIGINAL')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
                  activeTab === 'ORIGINAL'
                    ? 'bg-finance-navy text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Pengajuan Asli Unit ({selectedSubmission.items?.length || 0} Item)</span>
              </button>
            </div>

            {activeTab === 'ANALYSIS' && (
              <button
                type="button"
                onClick={handleAddNewItem}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-finance-blue bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Tambah Pos Belanja Baru</span>
              </button>
            )}
          </div>

          {/* VIEW TAB 1: HASIL ANALISIS BENDAHARA UMUM */}
          {activeTab === 'ANALYSIS' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-4 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
                <span className="font-semibold text-slate-700">
                  Rincian Penyesuaian Bendahara (Mendukung 2, 3, 4 faktor perkalian dinamis):
                </span>
                <span className="text-[11px] text-slate-500">
                  Data pengajuan asli unit tetap utuh dan tersimpan terpisah
                </span>
              </div>

              <div className="space-y-3">
                {analysisItems.map((item, idx) => {
                  const isRemoved = item.item_type === 'REMOVED';
                  const isModified = item.item_type === 'MODIFIED';
                  const isAdded = item.item_type === 'ADDED';
                  const orig = selectedSubmission.items?.find(i => i.id === item.original_item_id);

                  return (
                    <div
                      key={item.id}
                      className={`border rounded-xl p-3.5 transition-all ${
                        isRemoved
                          ? 'bg-red-50/40 border-red-200 opacity-60'
                          : isModified
                          ? 'bg-amber-50/30 border-amber-300 ring-1 ring-amber-200'
                          : isAdded
                          ? 'bg-emerald-50/30 border-emerald-300 ring-1 ring-emerald-200'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      {/* Item Header & Status */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-400">#{idx + 1}</span>
                          {isAdded && (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                              Pos Tambahan Bendahara
                            </span>
                          )}
                          {isModified && (
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded">
                              Disesuaikan oleh Bendahara
                            </span>
                          )}
                          {isRemoved && (
                            <span className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded">
                              Dihapus dari Pencairan
                            </span>
                          )}
                          {!isAdded && !isModified && !isRemoved && (
                            <span className="bg-slate-100 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded">
                              Sesuai Pengajuan Asli
                            </span>
                          )}

                          {/* SSH Badge: Hijau, Merah, Kuning */}
                          {!isRemoved && (
                            <SSHBadge status={item.ssh_status} diff={item.ssh_diff} />
                          )}
                        </div>

                        {/* Original Comparison Reference */}
                        {orig && (
                          <div className="text-[11px] text-slate-500 font-mono">
                            Usulan Awal: Rp{Number(orig.unit_price).toLocaleString('id-ID')} × {orig.volume} {orig.unit} = <strong className="text-slate-800">Rp{Number(orig.total_amount).toLocaleString('id-ID')}</strong>
                          </div>
                        )}
                      </div>

                      {/* Warning if price exceeds SSH */}
                      {item.ssh_status === 'MELEBIHI' && !isRemoved && (
                        <div className="bg-red-50 border border-red-200 text-red-800 p-2 rounded text-xs flex items-center gap-1.5 mt-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                          <span>
                            <strong>Peringatan Plafon SSH:</strong> Harga satuan Rp{Number(item.unit_price).toLocaleString('id-ID')} melebihi acuan standar (SSH: Rp{Number(item.ssh_price).toLocaleString('id-ID')}). Harap sesuaikan harga atau tuliskan alasan pengecualian pada catatan.
                          </span>
                        </div>
                      )}

                      {/* Main input fields */}
                      <div className="grid grid-cols-12 gap-2.5 items-start mt-3">
                        <div className="col-span-12 sm:col-span-5">
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Uraian Kebutuhan Belanja</label>
                          <input
                            type="text"
                            disabled={isRemoved}
                            value={item.item_name}
                            onChange={(e) => handleUpdateAnalysisItem(idx, 'item_name', e.target.value)}
                            className="w-full text-xs border border-slate-200 rounded p-1.5 focus:border-finance-blue font-medium text-slate-900 disabled:bg-slate-100"
                          />
                        </div>

                        <div className="col-span-6 sm:col-span-3">
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Harga Dasar (Rp)</label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            disabled={isRemoved}
                            value={item.unit_price === 0 ? '' : item.unit_price}
                            onChange={(e) => handleUpdateAnalysisItem(idx, 'unit_price', e.target.value)}
                            className="w-full text-xs font-mono font-bold text-finance-navy text-right border border-slate-200 rounded p-1.5 disabled:bg-slate-100"
                          />
                        </div>

                        <div className="col-span-4 sm:col-span-2">
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Satuan</label>
                          <input
                            type="text"
                            disabled={isRemoved}
                            value={item.unit}
                            onChange={(e) => handleUpdateAnalysisItem(idx, 'unit', e.target.value)}
                            className="w-full text-xs border border-slate-200 rounded p-1.5 disabled:bg-slate-100"
                          />
                        </div>

                        <div className="col-span-2 sm:col-span-2 text-right pt-4">
                          {isRemoved ? (
                            <button
                              type="button"
                              onClick={() => handleRestoreAnalysisItem(idx)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-blue-600 hover:bg-blue-50 border border-blue-200 rounded font-medium"
                            >
                              <Undo2 className="w-3.5 h-3.5" />
                              <span>Pulihkan</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleRemoveAnalysisItem(idx)}
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                              title="Hapus dari rancangan pencairan"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Multi-Factor Dynamic Multiplication Component (Section D) */}
                      {!isRemoved && (
                        <div className="mt-2.5">
                          <MultiFactorCalculator
                            unitPrice={Number(item.unit_price) || 0}
                            factors={item.multi_factors || []}
                            onChangeFactors={(factors) => handleUpdateAnalysisItem(idx, 'multi_factors', factors)}
                            onTotalCalculated={(total, volume) => {
                              handleUpdateAnalysisItem(idx, 'total_amount', total);
                              handleUpdateAnalysisItem(idx, 'volume', volume);
                            }}
                          />
                        </div>
                      )}

                      {/* Reason for Change (Required if Modified/Removed/Added) */}
                      {(isModified || isRemoved || isAdded) && (
                        <div className="mt-2.5">
                          <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                            Alasan Perubahan / Penyesuaian Bendahara <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="Tuliskan alasan penyesuaian nominal, durasi, jumlah orang, atau metode perhitungan..."
                            value={item.change_reason || ''}
                            onChange={(e) => handleUpdateAnalysisItem(idx, 'change_reason', e.target.value)}
                            className="w-full text-xs border border-amber-300 rounded p-1.5 bg-amber-50/50 text-slate-800 focus:bg-white"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Treasurer Notes */}
              <div className="p-3.5 border-t border-slate-200 bg-slate-50 rounded-lg space-y-1.5">
                <label className="block text-xs font-bold text-finance-navy">
                  Catatan & Instruksi Bendahara Umum:
                </label>
                <textarea
                  rows={3}
                  placeholder="Catatan arahan penetapan anggaran untuk diserahkan ke Bendahara Pengeluaran..."
                  value={treasurerNotes}
                  onChange={(e) => setTreasurerNotes(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white"
                />
              </div>

              {/* Action Buttons: Save Draft vs "Simpan ke Draft Anggaran Siap Dicairkan" */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200">
                <div>
                  <span className="text-xs text-slate-500 mr-2">Total Hasil Analisis:</span>
                  <span className="text-base font-bold text-finance-navy font-mono">
                    Rp{totalApproved.toLocaleString('id-ID')}
                  </span>
                  <span className="text-xs text-slate-400 ml-2">
                    (Selisih: {selisih < 0 ? '-' : ''}Rp{Math.abs(selisih).toLocaleString('id-ID')})
                  </span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  {/* Save Draft */}
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleSave(false)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors"
                  >
                    <Save className="w-3.5 h-3.5 text-slate-600" />
                    <span>Simpan Draft Analisis</span>
                  </button>

                  {/* Simpan ke Draft Anggaran Siap Dicairkan (Section G Core Action) */}
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleSave(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm"
                  >
                    <FileCheck2 className="w-4 h-4" />
                    <span>Simpan ke Draft Anggaran Siap Dicairkan</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* VIEW TAB 2: PENGAJUAN ASLI UNIT (Section E) */}
          {activeTab === 'ORIGINAL' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-4 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
                <span className="font-semibold text-slate-700">
                  Data Rincian Usulan Asli Unit Pemohon (Tersimpan Permanen):
                </span>
                <span className="font-mono font-bold text-slate-900">
                  Total Diajukan: Rp{totalOriginal.toLocaleString('id-ID')}
                </span>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2.5 text-center">No</th>
                      <th className="px-3 py-2.5">Kategori</th>
                      <th className="px-4 py-2.5">Uraian Barang / Kegiatan</th>
                      <th className="px-3 py-2.5 text-right">Harga Satuan</th>
                      <th className="px-3 py-2.5 text-center">Volume</th>
                      <th className="px-3 py-2.5">Satuan</th>
                      <th className="px-4 py-2.5 text-right">Jumlah Total</th>
                      <th className="px-4 py-2.5">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedSubmission.items?.map((it, idx) => (
                      <tr key={it.id || idx} className="hover:bg-slate-50/60">
                        <td className="px-3 py-2.5 text-center text-slate-400 font-mono">{idx + 1}</td>
                        <td className="px-3 py-2.5 text-slate-600">{it.category}</td>
                        <td className="px-4 py-2.5 font-semibold text-slate-900">{it.item_name}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-slate-800">
                          Rp{Number(it.unit_price).toLocaleString('id-ID')}
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono">{it.volume}</td>
                        <td className="px-3 py-2.5 text-slate-600">{it.unit}</td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-900">
                          Rp{Number(it.total_amount).toLocaleString('id-ID')}
                        </td>
                        <td className="px-4 py-2.5 text-slate-500">{it.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 font-bold border-t border-slate-200 font-mono text-xs">
                    <tr>
                      <td colSpan={6} className="px-4 py-2.5 text-right uppercase text-slate-700 font-sans">
                        Total Pengajuan Awal Unit:
                      </td>
                      <td className="px-4 py-2.5 text-right text-finance-navy font-bold">
                        Rp{totalOriginal.toLocaleString('id-ID')}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
