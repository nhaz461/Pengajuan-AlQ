import React, { useState, useEffect } from 'react';
import { databaseService } from '../lib/databaseService';
import { useAuth } from '../lib/authContext';
import { Submission, SubmissionItem, AnalysisItem, AnalysisItemType, MultiFactor } from '../types/database';
import { StatusBadge } from '../components/StatusBadge';
import { MultiFactorCalculator } from '../components/MultiFactorCalculator';
import {
  FileSearch,
  CheckCircle,
  Save,
  Send,
  Plus,
  Trash2,
  Edit3,
  Undo2,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ArrowRight,
  Calculator,
  RefreshCw
} from 'lucide-react';

interface AnalysisPageProps {
  initialSubmissionId?: string | null;
  onNavigate: (tab: any, params?: any) => void;
}

export const AnalysisPage: React.FC<AnalysisPageProps> = ({ initialSubmissionId, onNavigate }) => {
  const { currentUser, canPerformAnalysis } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

  // Analysis Workspace state
  const [analysisItems, setAnalysisItems] = useState<AnalysisItem[]>([]);
  const [treasurerNotes, setTreasurerNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      const data = await databaseService.getSubmissions();
      // Submissions that need analysis or are already analyzed
      const relevant = data.filter(s =>
        ['Diajukan', 'Sedang Dianalisis', 'Menunggu Persetujuan', 'Disetujui', 'Siap Dicairkan', 'Dicairkan Sebagian', 'Selesai Dicairkan'].includes(s.status)
      );
      setSubmissions(relevant);

      if (initialSubmissionId) {
        const target = data.find(s => s.id === initialSubmissionId);
        if (target) selectSubmission(target);
      } else if (relevant.length > 0 && !selectedSubmission) {
        selectSubmission(relevant[0]);
      }
    } catch (err) {
      console.error('Error loading submissions for analysis:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, [initialSubmissionId]);

  // Select a submission to analyze
  const selectSubmission = (sub: Submission) => {
    setSelectedSubmission(sub);
    setTreasurerNotes(sub.treasurer_notes || '');

    // If analysis items already exist, load them. Otherwise, initialize from original items as 'KEPT'
    if (sub.analysis_items && sub.analysis_items.length > 0) {
      setAnalysisItems(
        sub.analysis_items.map(it => ({
          ...it,
          multi_factors: it.multi_factors ? (typeof it.multi_factors === 'string' ? JSON.parse(it.multi_factors) : it.multi_factors) : []
        }))
      );
    } else if (sub.items && sub.items.length > 0) {
      const initialAnalysis: AnalysisItem[] = sub.items.map((orig, idx) => ({
        id: `analysis_item_${Date.now()}_${idx}`,
        original_item_id: orig.id,
        item_type: 'KEPT',
        category: orig.category,
        item_name: orig.item_name,
        unit_price: Number(orig.unit_price),
        volume: Number(orig.volume),
        unit: orig.unit,
        total_amount: Number(orig.total_amount),
        multi_factors: orig.multi_factors ? (typeof orig.multi_factors === 'string' ? JSON.parse(orig.multi_factors) : orig.multi_factors) : [],
        change_reason: '',
        sort_order: idx + 1
      }));
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

      // If user changed price, volume, unit, or factors, mark as MODIFIED unless it's an ADDED item
      if (target.item_type === 'KEPT' && field !== 'change_reason') {
        target.item_type = 'MODIFIED';
      }

      if (field === 'unit_price' || field === 'volume') {
        const p = field === 'unit_price' ? parseFloat(val) || 0 : target.unit_price;
        const v = field === 'volume' ? parseFloat(val) || 0 : target.volume;
        target.total_amount = Math.round(p * v * 100) / 100;
      }

      copy[index] = target;
      return copy;
    });
  };

  // Mark item as REMOVED (Exclude from approved total)
  const handleRemoveAnalysisItem = (index: number) => {
    setAnalysisItems(prev => {
      const copy = [...prev];
      const target = copy[index];
      if (target.item_type === 'ADDED') {
        // If it was added by bendahara, just delete row
        return prev.filter((_, i) => i !== index);
      } else {
        // Mark as REMOVED and set reason
        target.item_type = 'REMOVED';
        target.total_amount = 0;
        if (!target.change_reason) {
          target.change_reason = 'Dihapus dari rancangan pencairan oleh Bendahara.';
        }
        return copy;
      }
    });
  };

  // Restore removed item to KEPT
  const handleRestoreAnalysisItem = (index: number) => {
    if (!selectedSubmission) return;
    const target = analysisItems[index];
    const original = selectedSubmission.items?.find(it => it.id === target.original_item_id);

    if (original) {
      setAnalysisItems(prev => {
        const copy = [...prev];
        copy[index] = {
          ...copy[index],
          item_type: 'KEPT',
          unit_price: Number(original.unit_price),
          volume: Number(original.volume),
          unit: original.unit,
          total_amount: Number(original.total_amount),
          multi_factors: original.multi_factors || [],
          change_reason: ''
        };
        return copy;
      });
    }
  };

  // Add a brand new item into analyzed design
  const handleAddNewItem = () => {
    setAnalysisItems(prev => [
      ...prev,
      {
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
        change_reason: 'Pos biaya tambahan yang disetujui Bendahara.',
        sort_order: prev.length + 1
      }
    ]);
  };

  // Calculated totals & metrics
  const totalOriginal = Number(selectedSubmission?.original_total || 0);
  const totalApproved = analysisItems
    .filter(it => it.item_type !== 'REMOVED')
    .reduce((sum, it) => sum + Number(it.total_amount || 0), 0);
  const selisih = totalOriginal - totalApproved;
  const persentasePencairan = totalOriginal > 0 ? ((totalApproved / totalOriginal) * 100).toFixed(1) : '0';

  // Save Analysis (Draft or Submit to Approval)
  const handleSave = async (submitForApproval: boolean) => {
    if (!selectedSubmission) return;
    if (!canPerformAnalysis) {
      alert('Hanya Bendahara Umum atau Administrator yang memiliki hak melakukan analisis.');
      return;
    }

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
          sort_order: it.sort_order
        })),
        treasurerNotes: treasurerNotes,
        submitForApproval: submitForApproval,
        actorName: currentUser?.full_name || 'Bendahara Umum',
        actorRole: currentUser?.role || 'BENDAHARA'
      });

      alert(
        submitForApproval
          ? 'Hasil analisis berhasil disimpan dan diajukan ke tahap Persetujuan!'
          : 'Draft analisis bendahara berhasil disimpan.'
      );

      await loadSubmissions();
      // Re-fetch active submission
      const updated = await databaseService.getSubmissionById(selectedSubmission.id);
      if (updated) selectSubmission(updated);
    } catch (err: any) {
      alert(`Gagal menyimpan analisis: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-finance-navy">Analisis Pengajuan Bendahara</h1>
          <p className="text-xs text-slate-500">
            Tinjau usulan unit, sesuaikan harga satuan, ubah faktor multivolume, dan tetapkan nominal persetujuan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadSubmissions}
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
          <span className="text-xs font-semibold text-slate-700 shrink-0">Pilih Berkas Pengajuan:</span>
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
          <div className="text-sm font-semibold text-slate-700">Belum Ada Pengajuan yang Dipilih</div>
          <div className="text-xs text-slate-400 mt-1">
            Silakan pilih berkas pengajuan di atas untuk memulai tinjauan analisis bendahara.
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Executive Comparison Metric Cards (Section I) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Total Diajukan Awal */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-500 font-medium">Total Diajukan (Awal)</span>
              <div className="text-base font-bold text-slate-900 font-mono mt-1">
                Rp{totalOriginal.toLocaleString('id-ID')}
              </div>
              <div className="text-[10px] text-slate-400">RAB Asli Unit</div>
            </div>

            {/* Total Rancangan Disetujui */}
            <div className="bg-white p-3.5 rounded-xl border border-finance-blue/40 bg-blue-50/20 shadow-sm">
              <span className="text-xs text-finance-blue font-semibold">Total Rancangan Disetujui</span>
              <div className="text-base font-bold text-finance-blue font-mono mt-1">
                Rp{totalApproved.toLocaleString('id-ID')}
              </div>
              <div className="text-[10px] text-emerald-700 font-semibold">
                {persentasePencairan}% disetujui
              </div>
            </div>

            {/* Selisih Efisiensi */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-500 font-medium">Selisih Pengajuan</span>
              <div className="text-base font-bold text-indigo-900 font-mono mt-1">
                Rp{selisih.toLocaleString('id-ID')}
              </div>
              <div className="text-[10px] text-slate-400">Total Diajukan - Disetujui</div>
            </div>

            {/* Persentase Pencairan */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-500 font-medium">Persentase Pencairan</span>
              <div className="text-base font-bold text-finance-navy font-mono mt-1">
                {persentasePencairan}%
              </div>
              <div className="text-[10px] text-slate-400">Rasio Kelolosan Anggaran</div>
            </div>
          </div>

          {/* Submission Identity Header Card */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Nomor & Tanggal:</span>
              <span className="font-mono font-bold text-slate-800">{selectedSubmission.submission_number}</span>
              <span className="text-slate-500 block">{selectedSubmission.submission_date}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Unit & Kategori:</span>
              <span className="font-semibold text-slate-800">{selectedSubmission.unit_name}</span>
              <span className="text-slate-500 block">{selectedSubmission.category}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Kegiatan:</span>
              <span className="font-semibold text-slate-800">{selectedSubmission.activity_name}</span>
              <span className="text-slate-500 block">PJ: {selectedSubmission.person_in_charge}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Diajukan Oleh:</span>
              <span className="font-medium text-slate-800">{selectedSubmission.submitted_by || '-'}</span>
              <span className="text-slate-400 block text-[10px]">
                {selectedSubmission.submitted_at ? new Date(selectedSubmission.submitted_at).toLocaleString('id-ID') : ''}
              </span>
            </div>
          </div>

          {/* Side-by-Side Analysis Workspace */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-slate-50">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-finance-blue" />
                <h2 className="text-sm font-bold text-finance-navy">
                  Penyesuaian Item Belanja Bendahara (Flexible Multi-Volume)
                </h2>
              </div>

              <button
                type="button"
                onClick={handleAddNewItem}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-finance-blue bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Tambah Pos Baru</span>
              </button>
            </div>

            <div className="p-4 space-y-4">
              {analysisItems.map((item, idx) => {
                const isRemoved = item.item_type === 'REMOVED';
                const isModified = item.item_type === 'MODIFIED';
                const isAdded = item.item_type === 'ADDED';

                // Find corresponding original item
                const orig = selectedSubmission.items?.find(i => i.id === item.original_item_id);

                return (
                  <div
                    key={item.id}
                    className={`border rounded-xl p-3.5 transition-all ${
                      isRemoved
                        ? 'bg-red-50/40 border-red-200 opacity-70'
                        : isModified
                        ? 'bg-amber-50/30 border-amber-300 ring-1 ring-amber-200'
                        : isAdded
                        ? 'bg-emerald-50/30 border-emerald-300 ring-1 ring-emerald-200'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    {/* Item Type Badge and Original Comparison Header */}
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
                      </div>

                      {/* Original values comparison note */}
                      {orig && (
                        <div className="text-[11px] text-slate-500 font-mono">
                          Usulan Awal: Rp{Number(orig.unit_price).toLocaleString('id-ID')} × {orig.volume} {orig.unit} = <strong className="text-slate-800">Rp{Number(orig.total_amount).toLocaleString('id-ID')}</strong>
                        </div>
                      )}
                    </div>

                    {/* Editable Fields */}
                    <div className="grid grid-cols-12 gap-2.5 items-start mt-3">
                      <div className="col-span-12 sm:col-span-5">
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Uraian Belanja</label>
                        <input
                          type="text"
                          disabled={isRemoved}
                          value={item.item_name}
                          onChange={(e) => handleUpdateAnalysisItem(idx, 'item_name', e.target.value)}
                          className="w-full text-xs border border-slate-200 rounded p-1.5 focus:border-finance-blue disabled:bg-slate-100 font-medium text-slate-900"
                        />
                      </div>

                      <div className="col-span-6 sm:col-span-3">
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Harga Disetujui (Rp)</label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          disabled={isRemoved}
                          value={item.unit_price === 0 ? '' : item.unit_price}
                          onChange={(e) => handleUpdateAnalysisItem(idx, 'unit_price', e.target.value)}
                          className="w-full text-xs font-mono text-right border border-slate-200 rounded p-1.5 font-bold text-finance-navy disabled:bg-slate-100"
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
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded border border-transparent hover:border-red-200"
                            title="Hapus dari rancangan pencairan"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Multivolume Calculator Component */}
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

                    {/* Reason for Change (Required if Modified/Removed) */}
                    {(isModified || isRemoved || isAdded) && (
                      <div className="mt-2.5">
                        <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                          Alasan Perubahan / Penyesuaian Bendahara <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Jelaskan alasan penyesuaian nominal, volume, atau metode perhitungan..."
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

            {/* General Treasurer Notes */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-2">
              <label className="block text-xs font-bold text-finance-navy">
                Catatan Umum / Instruksi Bendahara Umum untuk Bagian Pengeluaran:
              </label>
              <textarea
                rows={3}
                placeholder="Tuliskan catatan disposisi, instruksi teknis pencairan bertahap, rekening tujuan yang dianjurkan, atau arahan bendahara..."
                value={treasurerNotes}
                onChange={(e) => setTreasurerNotes(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:ring-1 focus:ring-finance-blue bg-white"
              />
            </div>

            {/* Workspace Footer Actions */}
            <div className="p-4 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <span className="text-xs text-slate-500 mr-2">Total Disetujui Bendahara:</span>
                <span className="text-lg font-bold text-finance-navy font-mono">
                  Rp{totalApproved.toLocaleString('id-ID')}
                </span>
                <span className="text-xs text-slate-400 ml-2">
                  (Selisih Rp{selisih.toLocaleString('id-ID')})
                </span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {/* Save Draft Analysis */}
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSave(false)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors"
                >
                  <Save className="w-3.5 h-3.5 text-slate-600" />
                  <span>Simpan Draft Analisis</span>
                </button>

                {/* Submit to Approval */}
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSave(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-finance-blue hover:bg-finance-blueHover rounded-lg transition-colors shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Kirim untuk Persetujuan</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
