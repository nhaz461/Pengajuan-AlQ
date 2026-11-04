import React, { useState, useEffect, useRef } from 'react';
import { databaseService } from '../lib/databaseService';
import { sshService, SSHCheckResult } from '../lib/sshService';
import { reportExportService } from '../lib/reportExportService';
import { useAuth } from '../lib/authContext';
import { Submission, AnalysisItem, MasterSSH, MultiFactor, SubmissionStatus } from '../types/database';
import { SSHBadge } from '../components/StatusBadge';
import {
  FileSearch,
  Save,
  Plus,
  Trash2,
  Undo2,
  AlertTriangle,
  RefreshCw,
  FileCheck2,
  Printer,
  Copy,
  CheckCircle,
  X,
  Edit,
  Sliders,
  Info,
  Check,
  Ban,
  Calendar,
  Layers,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  ShieldCheck
} from 'lucide-react';

interface AnalysisPageProps {
  initialSubmissionId?: string | null;
  onNavigate: (tab: any, params?: any) => void;
}

// Indonesian date formatter
function formatIndonesianDate(dateStr?: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const dayName = days[d.getDay()];
    const dateNum = String(d.getDate()).padStart(2, '0');
    const monthName = months[d.getMonth()];
    const year = d.getFullYear();
    return `${dayName}, ${dateNum} ${monthName} ${year}`;
  } catch {
    return dateStr;
  }
}

// Currency cell formatter: "Rp  40.000" or "Rp -"
function formatCurrencyCell(amount: number | null | undefined): string {
  if (amount === undefined || amount === null || Number(amount) === 0) {
    return 'Rp                -';
  }
  return `Rp  ${Math.round(Number(amount)).toLocaleString('id-ID')}`;
}

export const AnalysisPage: React.FC<AnalysisPageProps> = ({ initialSubmissionId, onNavigate }) => {
  const { currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [allSSH, setAllSSH] = useState<MasterSSH[]>([]);

  // Analysis Workspace state
  const [analysisItems, setAnalysisItems] = useState<AnalysisItem[]>([]);
  const [treasurerNotes, setTreasurerNotes] = useState('');
  const [documentStatus, setDocumentStatus] = useState<SubmissionStatus>('Sedang Dianalisis');
  const [disbursementDate, setDisbursementDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  // Revision Modal State
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [revisedName, setRevisedName] = useState('');
  const [revisedPrice, setRevisedPrice] = useState<number>(0);
  const [revisedFactors, setRevisedFactors] = useState<MultiFactor[]>([]);
  const [revisedReason, setRevisedReason] = useState('');
  const [activeSSHCheck, setActiveSSHCheck] = useState<SSHCheckResult | null>(null);

  // Add New Item Modal State
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [newItemData, setNewItemData] = useState<{
    category: string;
    item_name: string;
    unit_price: number;
    factors: MultiFactor[];
    reason: string;
  }>({
    category: 'Operasional',
    item_name: '',
    unit_price: 0,
    factors: [{ id: 'f1', name: 'Paket', value: 1, satuan: 'Paket' }],
    reason: 'Pos belanja tambahan yang ditetapkan oleh Bendahara Umum'
  });

  // SSH Detail Inspector Modal
  const [inspectingSSH, setInspectingSSH] = useState<{
    itemName: string;
    unitPrice: number;
    checkResult: SSHCheckResult;
  } | null>(null);

  const reportContainerRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [subsData, sshData] = await Promise.all([
        databaseService.getSubmissions(),
        sshService.getMasterSSH()
      ]);

      setAllSSH(sshData);

      const relevant = subsData.filter(s =>
        ['Diajukan', 'Sedang Dianalisis', 'Menunggu Persetujuan', 'Draft Siap Dicairkan', 'Disetujui', 'Siap Dicairkan', 'Dicairkan Sebagian', 'Selesai Dicairkan'].includes(s.status)
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

  const selectSubmission = (sub: Submission, sshCatalog: MasterSSH[] = allSSH) => {
    setSelectedSubmission(sub);
    setTreasurerNotes(sub.treasurer_notes || '');
    setDocumentStatus(sub.status || 'Sedang Dianalisis');

    if (sub.analysis_items && sub.analysis_items.length > 0) {
      setAnalysisItems(
        sub.analysis_items.map(it => {
          let factors: MultiFactor[] = [];
          if (it.multi_factors) {
            factors = typeof it.multi_factors === 'string' ? JSON.parse(it.multi_factors) : it.multi_factors;
          }
          if (!factors || factors.length === 0) {
            factors = [{ id: `f_${Date.now()}_0`, name: it.unit || 'Paket', value: Number(it.volume) || 1, satuan: it.unit || 'Paket' }];
          }

          const sshCheck = sshService.checkPriceAgainstSSH(Number(it.unit_price), it.item_name, it.unit, sshCatalog);
          return {
            ...it,
            multi_factors: factors,
            ssh_item_id: it.ssh_item_id || sshCheck.sshItem?.id || null,
            ssh_status: sshCheck.status,
            ssh_price: sshCheck.sshPrice,
            ssh_diff: sshCheck.diff
          };
        })
      );
    } else if (sub.items && sub.items.length > 0) {
      const initialAnalysis: AnalysisItem[] = sub.items.map((orig, idx) => {
        let factors: MultiFactor[] = [];
        if (orig.multi_factors) {
          factors = typeof orig.multi_factors === 'string' ? JSON.parse(orig.multi_factors as any) : orig.multi_factors;
        }
        if (!factors || factors.length === 0) {
          factors = [{ id: `f_${Date.now()}_${idx}`, name: orig.unit || 'Paket', value: Number(orig.volume) || 1, satuan: orig.unit || 'Paket' }];
        }

        const sshCheck = sshService.checkPriceAgainstSSH(Number(orig.unit_price), orig.item_name, orig.unit, sshCatalog);

        return {
          id: `analysis_item_${Date.now()}_${idx}`,
          original_item_id: orig.id,
          item_type: 'KEPT',
          category: orig.category || 'Operasional',
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

  // Open Revision Modal for an item
  const handleOpenRevisionModal = (index: number) => {
    const it = analysisItems[index];
    setEditingItemIndex(index);
    setRevisedName(it.item_name);
    setRevisedPrice(Number(it.unit_price) || 0);
    setRevisedReason(it.change_reason || '');

    let factors = it.multi_factors && it.multi_factors.length > 0 ? [...it.multi_factors] : [];
    if (factors.length === 0) {
      factors = [{ id: `f_${Date.now()}_0`, name: it.unit || 'Paket', value: Number(it.volume) || 1, satuan: it.unit || 'Paket' }];
    }
    setRevisedFactors(factors);

    const check = sshService.checkPriceAgainstSSH(Number(it.unit_price), it.item_name, it.unit, allSSH);
    setActiveSSHCheck(check);
  };

  // Handle Price Change in Revision Modal
  const handleRevisedPriceChange = (price: number) => {
    setRevisedPrice(price);
    if (editingItemIndex !== null) {
      const it = analysisItems[editingItemIndex];
      const check = sshService.checkPriceAgainstSSH(price, revisedName || it.item_name, it.unit, allSSH);
      setActiveSSHCheck(check);
    }
  };

  // Apply Revision from Modal
  const handleApplyRevision = () => {
    if (editingItemIndex === null) return;

    setAnalysisItems(prev => {
      const copy = [...prev];
      const target = { ...copy[editingItemIndex] };
      const orig = selectedSubmission?.items?.find(i => i.id === target.original_item_id);

      target.item_name = revisedName.trim() || target.item_name;
      target.unit_price = Math.max(0, revisedPrice);
      target.multi_factors = [...revisedFactors];

      // Calculate effective volume from multiple factors
      const effectiveVol = revisedFactors.reduce((acc, f) => acc * (Number(f.value) || 0), 1);
      target.volume = effectiveVol;
      target.unit = revisedFactors.map(f => f.satuan || f.name).filter(Boolean).join(' × ') || target.unit;
      target.total_amount = Math.round(target.unit_price * effectiveVol * 100) / 100;
      target.change_reason = revisedReason.trim();

      // Check if price or volume changed compared to original
      if (orig) {
        const priceChanged = target.unit_price !== Number(orig.unit_price);
        const volChanged = target.volume !== Number(orig.volume);
        const nameChanged = target.item_name !== orig.item_name;

        if (target.unit_price === 0) {
          target.item_type = 'REMOVED';
          if (!target.change_reason) target.change_reason = 'Ditiadakan dari pencairan (nominal Rp0)';
        } else if (priceChanged || volChanged || nameChanged) {
          target.item_type = 'MODIFIED';
        } else {
          target.item_type = 'KEPT';
        }
      }

      // Check SSH
      const check = sshService.checkPriceAgainstSSH(target.unit_price, target.item_name, target.unit, allSSH);
      target.ssh_status = check.status;
      target.ssh_price = check.sshPrice;
      target.ssh_diff = check.diff;
      target.ssh_item_id = check.sshItem?.id || null;

      copy[editingItemIndex] = target;
      return copy;
    });

    setEditingItemIndex(null);
  };

  // Reset Revision to Original Unit Values
  const handleResetToOriginal = (index: number) => {
    if (!selectedSubmission) return;
    const target = analysisItems[index];
    const orig = selectedSubmission.items?.find(i => i.id === target.original_item_id);

    if (orig) {
      setAnalysisItems(prev => {
        const copy = [...prev];
        let origFactors: MultiFactor[] = [];
        if (orig.multi_factors) {
          origFactors = typeof orig.multi_factors === 'string' ? JSON.parse(orig.multi_factors as any) : orig.multi_factors;
        }
        if (!origFactors || origFactors.length === 0) {
          origFactors = [{ id: `f_${Date.now()}_0`, name: orig.unit || 'Paket', value: Number(orig.volume) || 1, satuan: orig.unit || 'Paket' }];
        }

        const check = sshService.checkPriceAgainstSSH(Number(orig.unit_price), orig.item_name, orig.unit, allSSH);

        copy[index] = {
          ...copy[index],
          item_type: 'KEPT',
          category: orig.category,
          item_name: orig.item_name,
          unit_price: Number(orig.unit_price),
          volume: Number(orig.volume),
          unit: orig.unit,
          total_amount: Number(orig.total_amount),
          multi_factors: origFactors,
          change_reason: '',
          ssh_status: check.status,
          ssh_price: check.sshPrice,
          ssh_diff: check.diff,
          ssh_item_id: check.sshItem?.id || null
        };
        return copy;
      });
    }
    setEditingItemIndex(null);
  };

  // Quick Exclude / Set Rp0 (like rows 1.1.4 and 1.1.5)
  const handleExcludeItem = (index: number) => {
    setAnalysisItems(prev => {
      const copy = [...prev];
      const target = { ...copy[index] };
      target.item_type = 'REMOVED';
      target.unit_price = 0;
      target.total_amount = 0;
      if (!target.change_reason) {
        target.change_reason = 'Ditiadakan / Dihapus dari pencairan oleh Bendahara Umum';
      }
      copy[index] = target;
      return copy;
    });
  };

  // Add Brand New Item into Pencairan
  const handleCreateNewItem = () => {
    if (!newItemData.item_name.trim()) {
      alert('Mohon isi uraian kebutuhan barang atau kegiatan.');
      return;
    }

    const effectiveVol = newItemData.factors.reduce((acc, f) => acc * (Number(f.value) || 0), 1);
    const unitStr = newItemData.factors.map(f => f.satuan || f.name).filter(Boolean).join(' × ') || 'Paket';
    const total = Math.round(newItemData.unit_price * effectiveVol * 100) / 100;

    const check = sshService.checkPriceAgainstSSH(newItemData.unit_price, newItemData.item_name, unitStr, allSSH);

    const newItem: AnalysisItem = {
      id: `added_${Date.now()}`,
      original_item_id: null,
      item_type: 'ADDED',
      category: newItemData.category || 'Operasional',
      item_name: newItemData.item_name.trim(),
      unit_price: newItemData.unit_price,
      volume: effectiveVol,
      unit: unitStr,
      total_amount: total,
      multi_factors: [...newItemData.factors],
      change_reason: newItemData.reason.trim() || 'Pos belanja tambahan yang ditetapkan oleh Bendahara Umum',
      ssh_item_id: check.sshItem?.id || null,
      ssh_status: check.status,
      ssh_price: check.sshPrice,
      ssh_diff: check.diff,
      sort_order: analysisItems.length + 1
    };

    setAnalysisItems(prev => [...prev, newItem]);
    setShowAddItemModal(false);
    setNewItemData({
      category: 'Operasional',
      item_name: '',
      unit_price: 0,
      factors: [{ id: 'f1', name: 'Paket', value: 1, satuan: 'Paket' }],
      reason: 'Pos belanja tambahan yang ditetapkan oleh Bendahara Umum'
    });
  };

  // Remove newly added item
  const handleDeleteAddedItem = (index: number) => {
    setAnalysisItems(prev => prev.filter((_, i) => i !== index));
  };

  // Save to Database
  const handleSaveToDatabase = async (targetStatus?: SubmissionStatus) => {
    if (!selectedSubmission) return;

    setSaving(true);
    const finalStatus = targetStatus || documentStatus;

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
          total_amount: it.item_type === 'REMOVED' ? 0 : it.total_amount,
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
        targetStatus: finalStatus,
        actorName: currentUser?.full_name || 'Bendahara Umum',
        actorRole: currentUser?.role || 'BENDAHARA'
      });

      if (finalStatus === 'Siap Dicairkan' || finalStatus === 'Draft Siap Dicairkan') {
        alert('Hasil analisis SPPD berhasil ditetapkan dengan status "Siap Dicairkan"!');
        onNavigate('draft-siap-dicairkan', { submissionId: selectedSubmission.id });
      } else {
        alert(`Perubahan SPPD berhasil disimpan dengan status "${finalStatus}".`);
        await loadData();
      }
    } catch (err: any) {
      alert(`Gagal menyimpan ke database: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Copy Image to Clipboard
  const handleCopyImage = async () => {
    if (!reportContainerRef.current) return;
    setCopyStatus('Menyiapkan gambar dokumen SPPD beresolusi tinggi...');
    try {
      const res = await reportExportService.copyImageToClipboard(reportContainerRef.current);
      setCopyStatus(res.message);
      setTimeout(() => setCopyStatus(null), 5000);
    } catch (err: any) {
      setCopyStatus(`Gagal menyalin: ${err.message}`);
      setTimeout(() => setCopyStatus(null), 4000);
    }
  };

  // Print
  const handlePrint = () => {
    reportExportService.printReport();
  };

  // Totals & Calculations
  const totalOriginal = Number(selectedSubmission?.original_total || 0);
  const totalApproved = analysisItems
    .filter(it => it.item_type !== 'REMOVED')
    .reduce((sum, it) => sum + Number(it.total_amount || 0), 0);

  const selisihAnggaran = totalOriginal - totalApproved;
  const efisiensiPersen = totalOriginal > 0 ? ((selisihAnggaran / totalOriginal) * 100).toFixed(1) : '0';

  const tanggalPelaksanaan = formatIndonesianDate(selectedSubmission?.submission_date);
  const formattedDisbursementDate = formatIndonesianDate(disbursementDate);

  // Group items by category to display structured headers (like Image 1: 1. Konsumsi, 2. Perlengkapan, 3. Acara)
  const categories = Array.from(new Set(analysisItems.map(it => it.category || 'Operasional')));

  return (
    <div className="space-y-5 pb-16">
      {/* Top Header & Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <div>
          <h1 className="text-xl font-bold text-finance-navy">Surat Perintah Pencairan Dana (SPPD)</h1>
          <p className="text-xs text-slate-500">
            Evaluasi berkas usulan Pengajuan Dana vs Pencairan Dana berdasarkan Standar Satuan Harga (SSH) dan rincian dinamis.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </button>

          <button
            onClick={handleCopyImage}
            disabled={!selectedSubmission}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-finance-blue hover:bg-finance-blueHover rounded-lg transition-colors shadow-sm"
            title="Salin tampilan form SPPD sebagai gambar untuk WhatsApp"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Salin Gambar</span>
          </button>

          <button
            onClick={handlePrint}
            disabled={!selectedSubmission}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors shadow-sm"
            title="Cetak SPPD dalam format A4 Landscape"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>Cetak A4</span>
          </button>
        </div>
      </div>

      {/* Copy Toast Notification */}
      {copyStatus && (
        <div className="bg-blue-50 border border-blue-200 text-blue-900 px-4 py-2.5 rounded-xl text-xs flex items-center justify-between no-print animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-finance-blue" />
            <span>{copyStatus}</span>
          </div>
          <button onClick={() => setCopyStatus(null)} className="text-blue-500 font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Select Submission Dropdown Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between no-print">
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
            <button
              type="button"
              onClick={() => setShowAddItemModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-300 rounded-lg hover:bg-emerald-100 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Tambah Kebutuhan Baru</span>
            </button>
          </div>
        )}
      </div>

      {!selectedSubmission ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center">
          <FileSearch className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <div className="text-sm font-semibold text-slate-700">Belum Ada Pengajuan Terpilih</div>
          <div className="text-xs text-slate-400 mt-1">Pilih berkas pengajuan di atas untuk memulai analisis komparasi dana.</div>
        </div>
      ) : (
        /* =========================================================================
            OFFICIAL SPPD SIDE-BY-SIDE SPREADSHEET (IMAGE 1 & 2 SPECIFICATION)
        ========================================================================= */
        <div className="space-y-4 w-full">
          {/* Main SPPD Document Card (Full-width, No Narrow Max-width Box) */}
          <div className="bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden w-full" ref={reportContainerRef}>
            <div className="w-full font-sans text-slate-900">
              
              {/* TOP HEADER BANNER: Elegant Navy Header with Crisp White & Blue Accents */}
              <div className="text-center py-4 px-6 bg-finance-navy text-white border-b-2 border-finance-blue space-y-1">
                <div className="text-base sm:text-xl font-black uppercase tracking-wider text-white">
                  SURAT PERINTAH PENCAIRAN DANA
                </div>
                <div className="text-xs sm:text-sm font-bold text-blue-200 uppercase tracking-wide">
                  YAYASAN PENDIDIKAN ISLAM PONDOK PESANTREN AL-QUR'ANIYYAH
                </div>
                <div className="text-[11px] sm:text-xs text-blue-300 font-medium">
                  Tahun Ajaran {selectedSubmission.fiscal_year || '2026-2027'}
                </div>
              </div>

              {/* METADATA SECTION: Pelaksanaan (Kiri) & Biaya Kegiatan (Kanan) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 text-xs bg-slate-50/60 border-b border-slate-300">
                {/* Left Side: Metadata Pelaksanaan */}
                <div className="lg:col-span-7 space-y-2">
                  <div className="grid grid-cols-12 gap-1 items-center">
                    <span className="col-span-4 sm:col-span-3 font-semibold text-slate-600">Tanggal Pelaksanaan</span>
                    <span className="col-span-1 text-center font-bold text-slate-400">:</span>
                    <span className="col-span-7 sm:col-span-8 text-slate-900 font-bold">{tanggalPelaksanaan}</span>
                  </div>
                  <div className="grid grid-cols-12 gap-1 items-center">
                    <span className="col-span-4 sm:col-span-3 font-semibold text-slate-600">Nomor Surat</span>
                    <span className="col-span-1 text-center font-bold text-slate-400">:</span>
                    <span className="col-span-7 sm:col-span-8 text-slate-900 font-mono font-bold">{selectedSubmission.submission_number}</span>
                  </div>
                  <div className="grid grid-cols-12 gap-1 items-center">
                    <span className="col-span-4 sm:col-span-3 font-semibold text-slate-600">Unit/Lembaga</span>
                    <span className="col-span-1 text-center font-bold text-slate-400">:</span>
                    <span className="col-span-7 sm:col-span-8 text-slate-900 font-bold">{selectedSubmission.unit_name}</span>
                  </div>
                  <div className="grid grid-cols-12 gap-1 items-center">
                    <span className="col-span-4 sm:col-span-3 font-semibold text-slate-600">Agenda Kegiatan</span>
                    <span className="col-span-1 text-center font-bold text-slate-400">:</span>
                    <span className="col-span-7 sm:col-span-8 text-slate-900 font-semibold">{selectedSubmission.activity_name}</span>
                  </div>
                </div>

                {/* Right Side: Tanggal Pencairan, Status, Biaya Kegiatan */}
                <div className="lg:col-span-5 flex flex-col justify-between space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs text-slate-700">
                      <span className="font-semibold">Tanggal Pencairan :</span>
                      <strong className="text-slate-900 ml-1.5 font-bold">{formattedDisbursementDate}</strong>
                    </div>
                    {/* Status Badge */}
                    <div
                      className="px-3 py-1 font-black text-white text-[11px] uppercase tracking-wider rounded shadow-xs"
                      style={{ backgroundColor: documentStatus === 'Selesai Dicairkan' ? '#00A2E8' : '#2563EB' }}
                    >
                      {documentStatus === 'Selesai Dicairkan' ? 'SUDAH CAIR' : documentStatus.toUpperCase()}
                    </div>
                  </div>

                  <div className="border border-slate-300 rounded-lg overflow-hidden bg-white shadow-xs">
                    <div className="bg-slate-100 px-3 py-1 font-bold uppercase text-[10px] tracking-wider text-slate-700 border-b border-slate-300">
                      BIAYA KEGIATAN
                    </div>
                    {/* Pengajuan Dana Row (Soft Slate Gray) */}
                    <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-200 bg-slate-50/70">
                      <span className="text-slate-700 font-bold">Pengajuan Dana</span>
                      <span className="font-mono font-bold text-slate-900 whitespace-nowrap">
                        Rp {totalOriginal.toLocaleString('id-ID')}
                      </span>
                    </div>
                    {/* Pencairan Dana Row (Soft Blue) */}
                    <div className="flex items-center justify-between px-3 py-1.5 bg-blue-50/80">
                      <span className="text-finance-navy font-black">Pencairan Dana</span>
                      <span className="font-mono font-black text-finance-blue text-sm whitespace-nowrap">
                        Rp {totalApproved.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* MAIN COMPARISON SPREADSHEET TABLE: FULL WIDTH WITH RESPONSIVE OVERFLOW */}
              <div className="overflow-x-auto w-full">
                <table className="w-full min-w-[1100px] border-collapse text-xs">
                  <thead>
                    {/* Header Row 1: Left (PENGAJUAN DANA) vs Right (PENCAIRAN DANA) */}
                    <tr className="border-b-2 border-slate-400 font-bold text-center uppercase tracking-wide">
                      <th
                        colSpan={5}
                        className="py-2.5 px-3 border-r-2 border-slate-400 bg-slate-100 text-slate-800 text-xs font-black tracking-wider"
                      >
                        PENGAJUAN DANA
                      </th>
                      <th
                        colSpan={4}
                        className="py-2.5 px-3 bg-blue-100 text-finance-navy text-xs font-black tracking-wider"
                      >
                        PENCAIRAN DANA
                      </th>
                    </tr>

                    {/* Header Row 2: Sub-columns */}
                    <tr className="border-b border-slate-300 font-bold text-center">
                      {/* Left: Pengajuan Sub-columns */}
                      <th className="py-2 px-2 border-r border-slate-300 bg-slate-50 text-slate-700 w-12 text-[11px]">No</th>
                      <th className="py-2 px-3 border-r border-slate-300 bg-slate-50 text-slate-700 text-left min-w-[180px] text-[11px]">Kebutuhan</th>
                      <th className="py-2 px-2 border-r border-slate-300 bg-slate-50 text-slate-700 text-right w-28 whitespace-nowrap text-[11px]">Harga Satuan</th>
                      <th className="py-2 px-2 border-r border-slate-300 bg-slate-50 text-slate-700 text-center w-40 text-[11px]">Rincian</th>
                      <th className="py-2 px-3 border-r-2 border-slate-400 bg-slate-50 text-slate-700 text-right w-32 whitespace-nowrap text-[11px]">Total</th>

                      {/* Right: Pencairan Sub-columns */}
                      <th className="py-2 px-2 border-r border-slate-300 bg-blue-50/70 text-blue-900 font-bold text-right w-28 whitespace-nowrap text-[11px]">Harga Satuan</th>
                      <th className="py-2 px-2 border-r border-slate-300 bg-blue-50/70 text-blue-900 font-bold text-center w-40 text-[11px]">Rincian</th>
                      <th className="py-2 px-3 border-r border-slate-300 bg-blue-50/70 text-blue-950 font-black text-right w-32 whitespace-nowrap text-[11px]">Total</th>
                      <th className="py-2 px-2 w-52 min-w-[200px] bg-blue-50/70 text-blue-900 font-bold text-center text-[11px] no-print">Aksi Revisi</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200">
                    {/* Activity Section Header (Row A. Agenda Kegiatan) */}
                    <tr className="border-b border-slate-300 font-bold bg-white">
                      <td className="py-2 px-2 border-r border-slate-300 text-center font-bold text-slate-700">A.</td>
                      <td colSpan={4} className="py-2 px-3 border-r-2 border-slate-400 font-black uppercase tracking-wide text-finance-navy">
                        {selectedSubmission.activity_name || 'Rencana Kegiatan'}
                      </td>
                      <td colSpan={4} className="py-2 px-3 bg-blue-50/20"></td>
                    </tr>

                    {/* Grouped by Category (Row 1. Konsumsi, 2. Perlengkapan, etc.) */}
                    {categories.map((cat, catIdx) => {
                      const categoryItems = analysisItems
                        .map((item, idx) => ({ item, index: idx }))
                        .filter(({ item }) => (item.category || 'Operasional') === cat);

                      if (categoryItems.length === 0) return null;

                      return (
                        <React.Fragment key={cat || catIdx}>
                          {/* Category Header Row */}
                          <tr className="border-b border-slate-300 font-bold bg-slate-100/70">
                            <td className="py-1.5 px-2 border-r border-slate-300 text-center font-bold text-slate-800">
                              {catIdx + 1}.
                            </td>
                            <td colSpan={4} className="py-1.5 px-3 border-r-2 border-slate-400 font-bold text-slate-900 uppercase text-[11px]">
                              {cat}
                            </td>
                            <td colSpan={4} className="py-1.5 px-3 bg-blue-50/20"></td>
                          </tr>

                          {/* Items belonging to this Category (1.1, 1.2, 1.3...) */}
                          {categoryItems.map(({ item, index: idx }, itemSubIdx) => {
                            const isRemoved = item.item_type === 'REMOVED' || Number(item.unit_price) === 0;
                            const isModified = item.item_type === 'MODIFIED';
                            const isAdded = item.item_type === 'ADDED';
                            const orig = selectedSubmission.items?.find(i => i.id === item.original_item_id);

                            // Original item data (Left table)
                            const origPrice = orig ? Number(orig.unit_price) : 0;
                            const origTotal = orig ? Number(orig.total_amount) : 0;
                            let origFactors: MultiFactor[] = [];
                            if (orig?.multi_factors) {
                              origFactors = typeof orig.multi_factors === 'string' ? JSON.parse(orig.multi_factors as any) : orig.multi_factors;
                            }
                            if (orig && (!origFactors || origFactors.length === 0)) {
                              origFactors = [{ id: 'orig0', name: orig.unit || 'Paket', value: Number(orig.volume) || 1, satuan: orig.unit || 'Paket' }];
                            }

                            // Revised item data (Right table)
                            const pencairanFactors = item.multi_factors && item.multi_factors.length > 0
                              ? item.multi_factors
                              : [{ id: 'f0', name: item.unit || 'Paket', value: Number(item.volume) || 1, satuan: item.unit || 'Paket' }];

                            const sshCheck = sshService.checkPriceAgainstSSH(Number(item.unit_price), item.item_name, item.unit, allSSH);

                            return (
                              <tr
                                key={item.id || idx}
                                className={`border-b border-slate-200 transition-colors ${
                                  isRemoved
                                    ? 'bg-slate-100/70 text-slate-400'
                                    : isModified
                                    ? 'bg-blue-50/30'
                                    : isAdded
                                    ? 'bg-emerald-50/30'
                                    : 'bg-white hover:bg-slate-50/70'
                                }`}
                              >
                                {/* ================= TABEL KIRI: PENGAJUAN DANA (ORIGINAL) ================= */}
                                {/* 1. No */}
                                <td className="py-2 px-2 border-r border-slate-300 text-center font-mono font-medium text-[11px] text-slate-600">
                                  {catIdx + 1}.{itemSubIdx + 1}
                                </td>

                                {/* 2. Kebutuhan Pengajuan */}
                                <td className="py-2 px-3 border-r border-slate-300 text-slate-900 font-medium">
                                  <div className="flex items-start gap-1.5 flex-wrap">
                                    <span className="leading-snug">{orig ? orig.item_name : item.item_name}</span>
                                    {isAdded && (
                                      <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded shrink-0">
                                        + Usulan Tambahan
                                      </span>
                                    )}
                                  </div>
                                  {orig?.notes && (
                                    <div className="text-[10px] text-slate-500 italic mt-0.5 leading-snug">
                                      Ket: {orig.notes}
                                    </div>
                                  )}
                                </td>

                                {/* 3. Harga Satuan Pengajuan */}
                                <td className="py-2 px-2 border-r border-slate-300 text-right font-mono text-[11px] whitespace-nowrap text-slate-800">
                                  {orig ? formatCurrencyCell(origPrice) : 'Rp -'}
                                </td>

                                {/* 4. Rincian Multiple Components Pengajuan (Structured Chips) */}
                                <td className="py-2 px-2 border-r border-slate-300 text-center font-mono text-[11px]">
                                  {orig ? (
                                    <div className="flex flex-wrap items-center justify-center gap-1">
                                      {origFactors.map((f, fi) => (
                                        <span
                                          key={fi}
                                          className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[10px]"
                                        >
                                          <strong className="mr-1 text-slate-900">{f.value}</strong> {f.satuan || f.name}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 text-[10px]">-</span>
                                  )}
                                </td>

                                {/* 5. Total Pengajuan */}
                                <td className="py-2 px-3 border-r-2 border-slate-400 text-right font-mono font-semibold text-[11px] whitespace-nowrap text-slate-900">
                                  {orig ? formatCurrencyCell(origTotal) : 'Rp -'}
                                </td>

                                {/* ================= TABEL KANAN: PENCAIRAN DANA (BENDAHARA) ================= */}
                                {/* 1. Harga Satuan Pencairan */}
                                <td className="py-2 px-2 border-r border-slate-300 text-right font-mono text-[11px] whitespace-nowrap font-bold">
                                  {isRemoved ? (
                                    <span className="text-slate-400 line-through">Rp -</span>
                                  ) : (
                                    <span className={isModified ? 'text-finance-navy font-bold' : 'text-slate-900'}>
                                      {formatCurrencyCell(item.unit_price)}
                                    </span>
                                  )}
                                </td>

                                {/* 2. Rincian Multiple Components Pencairan (Structured Chips) */}
                                <td
                                  className="py-2 px-2 border-r border-slate-300 text-center font-mono text-[11px] cursor-pointer hover:bg-blue-100/50 transition-colors"
                                  onClick={() => handleOpenRevisionModal(idx)}
                                  title="Klik untuk merevisi rincian multiple components"
                                >
                                  {isRemoved ? (
                                    <span className="text-slate-400 text-[10px] line-through">
                                      {origFactors.map(f => `${f.value} ${f.satuan || f.name}`).join(' ')}
                                    </span>
                                  ) : (
                                    <div className="flex flex-wrap items-center justify-center gap-1">
                                      {pencairanFactors.map((f, fi) => (
                                        <span
                                          key={fi}
                                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] border ${
                                            isModified
                                              ? 'bg-blue-50 text-finance-navy border-blue-200'
                                              : 'bg-slate-100 text-slate-800 border-slate-200'
                                          }`}
                                        >
                                          <strong className="mr-1 text-slate-900">{f.value}</strong> {f.satuan || f.name}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </td>

                                {/* 3. Total Pencairan */}
                                <td className="py-2 px-3 border-r border-slate-300 text-right font-mono font-bold text-[11px] whitespace-nowrap">
                                  {isRemoved ? (
                                    <span className="text-slate-400 line-through">Rp -</span>
                                  ) : (
                                    <span className={isModified ? 'text-finance-blue font-black' : 'text-slate-900'}>
                                      {formatCurrencyCell(item.total_amount)}
                                    </span>
                                  )}
                                </td>

                                {/* 4. Aksi Revisi (Tombol Edit, Coret, Pulihkan, SSH Indicator) */}
                                <td className="py-2 px-2 text-center no-print">
                                  <div className="flex items-center justify-center gap-1.5 flex-nowrap">
                                    {/* SSH Badge with click-to-inspect */}
                                    <button
                                      type="button"
                                      onClick={() => setInspectingSSH({ itemName: item.item_name, unitPrice: Number(item.unit_price), checkResult: sshCheck })}
                                      className="cursor-pointer shrink-0"
                                      title="Klik untuk melihat perbandingan acuan Master SSH"
                                    >
                                      <SSHBadge
                                        status={sshCheck.status}
                                        diff={sshCheck.diff}
                                        percentageDiff={sshCheck.percentageDiff}
                                        size="sm"
                                      />
                                    </button>

                                    {/* Tombol EDIT / REVISI */}
                                    <button
                                      type="button"
                                      onClick={() => handleOpenRevisionModal(idx)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-finance-blue bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors shrink-0 shadow-xs"
                                      title="Revisi harga satuan, multiple components, atau uraian"
                                    >
                                      <Edit className="w-3 h-3" />
                                      <span>Revisi</span>
                                    </button>

                                    {/* Quick Coret / Nol-kan or Pulihkan */}
                                    {isRemoved ? (
                                      <button
                                        type="button"
                                        onClick={() => handleResetToOriginal(idx)}
                                        className="p-1 text-blue-600 hover:bg-blue-100 rounded shrink-0"
                                        title="Pulihkan sesuai usulan pengajuan awal"
                                      >
                                        <Undo2 className="w-3.5 h-3.5" />
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => handleExcludeItem(idx)}
                                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded shrink-0"
                                        title="Coret / Nol-kan (Tidak dicairkan)"
                                      >
                                        <Ban className="w-3.5 h-3.5" />
                                      </button>
                                    )}

                                    {isAdded && (
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteAddedItem(idx)}
                                        className="p-1 text-red-500 hover:bg-red-100 rounded shrink-0"
                                        title="Hapus baris pos tambahan ini"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </tbody>

                  {/* TABLE FOOTER: TOTAL PENGAJUAN DANA vs TOTAL PENCAIRAN DANA */}
                  <tfoot>
                    <tr className="border-t-2 border-slate-400 font-bold font-mono text-xs">
                      {/* Left: TOTAL PENGAJUAN DANA */}
                      <td
                        colSpan={4}
                        className="py-3 px-3 border-r border-slate-300 text-center font-sans font-bold uppercase tracking-wider text-slate-800 bg-slate-100"
                      >
                        TOTAL PENGAJUAN DANA
                      </td>
                      <td className="py-3 px-3 border-r-2 border-slate-400 text-right font-bold text-slate-900 whitespace-nowrap bg-slate-100 text-xs">
                        Rp  {totalOriginal.toLocaleString('id-ID')}
                      </td>

                      {/* Right: TOTAL PENCAIRAN DANA */}
                      <td
                        colSpan={2}
                        className="py-3 px-3 border-r border-slate-300 text-center font-sans font-black uppercase tracking-wider text-finance-navy bg-blue-100"
                      >
                        TOTAL PENCAIRAN DANA
                      </td>
                      <td className="py-3 px-3 border-r border-slate-300 text-right font-black text-finance-blue whitespace-nowrap bg-blue-100 text-sm">
                        Rp  {totalApproved.toLocaleString('id-ID')}
                      </td>
                      <td className="no-print bg-blue-100"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

            </div>
          </div>

          {/* =========================================================================
              SECTION 5: 4 MODERN FINANCE SUMMARY CARDS (RINGKASAN ANGGARAN RESMI)
          ========================================================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-3 no-print">
            {/* Card 1: Total Pengajuan Awal */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Total Pengajuan Awal
                </span>
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="font-mono font-extrabold text-xl text-slate-900">
                  Rp {totalOriginal.toLocaleString('id-ID')}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Usulan Rencana Anggaran Biaya unit
                </div>
              </div>
            </div>

            {/* Card 2: Total Disetujui / Pencairan */}
            <div className="bg-gradient-to-br from-blue-50/80 to-white p-4 rounded-xl border border-blue-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-finance-blue uppercase tracking-wider">
                  Total Disetujui (Cair)
                </span>
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-finance-blue">
                  <FileCheck2 className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="font-mono font-extrabold text-xl text-finance-navy">
                  Rp {totalApproved.toLocaleString('id-ID')}
                </div>
                <div className="text-[11px] text-blue-700/80 mt-1 font-medium">
                  Plafon ketetapan Bendahara Umum
                </div>
              </div>
            </div>

            {/* Card 3: Selisih Anggaran */}
            <div className={`p-4 rounded-xl border shadow-sm flex flex-col justify-between ${
              selisihAnggaran >= 0
                ? 'bg-gradient-to-br from-emerald-50/80 to-white border-emerald-200'
                : 'bg-gradient-to-br from-red-50/80 to-white border-red-200'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${
                  selisihAnggaran >= 0 ? 'text-emerald-700' : 'text-red-700'
                }`}>
                  Selisih Anggaran
                </span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  selisihAnggaran >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                }`}>
                  <TrendingDown className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className={`font-mono font-extrabold text-xl ${
                  selisihAnggaran >= 0 ? 'text-emerald-700' : 'text-red-700'
                }`}>
                  {selisihAnggaran >= 0 ? '+' : '-'}Rp {Math.abs(selisihAnggaran).toLocaleString('id-ID')}
                </div>
                <div className={`text-[11px] mt-1 font-medium ${
                  selisihAnggaran >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}>
                  {selisihAnggaran >= 0 ? 'Efisiensi kas berhasil dicapai' : 'Melebihi usulan awal'}
                </div>
              </div>
            </div>

            {/* Card 4: Efisiensi Anggaran */}
            <div className="bg-gradient-to-br from-sky-50/80 to-white p-4 rounded-xl border border-sky-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-sky-800 uppercase tracking-wider">
                  Efisiensi Anggaran
                </span>
                <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center text-sky-700">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="font-mono font-extrabold text-xl text-sky-900">
                  {efisiensiPersen}%
                </div>
                <div className="text-[11px] text-sky-700/80 mt-1 font-medium">
                  Rasio penghematan dari usulan awal
                </div>
              </div>
            </div>
          </div>

          {/* CATATAN DISPOSISI BENDAHARA & STATUS PENETAPAN */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 no-print">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
              {/* Catatan Disposisi */}
              <div className="md:col-span-8 space-y-1.5">
                <label className="block text-xs font-bold text-finance-navy uppercase tracking-wide">
                  Catatan Koreksi & Instruksi Bendahara Umum:
                </label>
                <textarea
                  rows={2}
                  placeholder="Tuliskan arahan pencairan, instruksi pergeseran anggaran, atau catatan untuk Bendahara Pengeluaran..."
                  value={treasurerNotes}
                  onChange={(e) => setTreasurerNotes(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-3 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-finance-blue focus:border-finance-blue transition-colors"
                />
              </div>

              {/* Status Dokumen & Tanggal Pencairan */}
              <div className="md:col-span-4 space-y-2.5 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase">
                    Status Dokumen SPPD:
                  </label>
                  <select
                    value={documentStatus}
                    onChange={(e) => setDocumentStatus(e.target.value as SubmissionStatus)}
                    className="w-full text-xs border border-slate-300 rounded p-1.5 bg-white font-bold text-finance-navy focus:ring-1 focus:ring-finance-blue"
                  >
                    <option value="Sedang Dianalisis">Sedang Dianalisis</option>
                    <option value="Menunggu Persetujuan">Menunggu Persetujuan</option>
                    <option value="Siap Dicairkan">Siap Dicairkan</option>
                    <option value="Selesai Dicairkan">Sudah Cair (Selesai Dicairkan)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase">
                    Tanggal Pencairan:
                  </label>
                  <input
                    type="date"
                    value={disbursementDate}
                    onChange={(e) => setDisbursementDate(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded p-1 bg-white font-medium focus:ring-1 focus:ring-finance-blue"
                  />
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS: Simpan Revisi, Siap Dicairkan */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="text-xs text-slate-500">
                Data usulan awal tetap <strong>read-only</strong>. Seluruh revisi tersimpan di database secara terpisah.
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                {/* Simpan Revisi / Draft */}
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSaveToDatabase('Sedang Dianalisis')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors shadow-xs"
                >
                  <Save className="w-3.5 h-3.5 text-slate-600" />
                  <span>Simpan Revisi SPPD</span>
                </button>

                {/* Tetapkan Siap Dicairkan */}
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSaveToDatabase('Siap Dicairkan')}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-finance-blue hover:bg-finance-blueHover rounded-lg transition-colors shadow-sm"
                >
                  <FileCheck2 className="w-4 h-4" />
                  <span>Tetapkan Siap Dicairkan</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: REVISI ITEM & MULTIPLE COMPONENTS (SECTION 2.D & 2.F)
      ========================================================================= */}
      {editingItemIndex !== null && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 my-6">
            {/* Modal Header */}
            <div className="bg-slate-50 px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-finance-navy uppercase tracking-wide">
                  Form Revisi Pencairan Dana
                </h3>
                <p className="text-[11px] text-slate-500">
                  Penyesuaian harga satuan dan rincian multiple components oleh Bendahara Umum.
                </p>
              </div>
              <button
                onClick={() => setEditingItemIndex(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
              {/* Original Proposal Reference Card (Read-Only) */}
              {selectedSubmission?.items?.find(i => i.id === analysisItems[editingItemIndex]?.original_item_id) && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Usulan Asli Pengajuan Unit (Read-Only):
                  </span>
                  <div className="font-semibold text-slate-900 text-xs">
                    {selectedSubmission.items.find(i => i.id === analysisItems[editingItemIndex].original_item_id)?.item_name}
                  </div>
                  <div className="font-mono text-[11px] text-slate-700">
                    Harga: Rp{Number(selectedSubmission.items.find(i => i.id === analysisItems[editingItemIndex].original_item_id)?.unit_price).toLocaleString('id-ID')} • Total: Rp{Number(selectedSubmission.items.find(i => i.id === analysisItems[editingItemIndex].original_item_id)?.total_amount).toLocaleString('id-ID')}
                  </div>
                </div>
              )}

              {/* 1. Uraian Kebutuhan */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Uraian Kebutuhan Belanja:
                </label>
                <input
                  type="text"
                  value={revisedName}
                  onChange={(e) => setRevisedName(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded p-2 font-medium"
                />
              </div>

              {/* 2. Harga Satuan Pencairan & SSH Live Check */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-700">
                    Harga Satuan Pencairan (Rp):
                  </label>
                  {activeSSHCheck && (
                    <SSHBadge
                      status={activeSSHCheck.status}
                      diff={activeSSHCheck.diff}
                      percentageDiff={activeSSHCheck.percentageDiff}
                      size="sm"
                    />
                  )}
                </div>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={revisedPrice === 0 ? '' : revisedPrice}
                  onChange={(e) => handleRevisedPriceChange(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="0"
                  className="w-full text-xs font-mono font-bold border border-slate-300 rounded p-2 text-finance-navy"
                />

                {/* SSH Info Card */}
                {activeSSHCheck && activeSSHCheck.sshItem && (
                  <div className="mt-1.5 p-2 rounded bg-slate-50 border border-slate-200 flex items-center justify-between text-[11px]">
                    <div className="text-slate-600">
                      Standar SSH: <strong className="font-mono text-slate-900">Rp{Number(activeSSHCheck.sshPrice).toLocaleString('id-ID')}</strong> ({activeSSHCheck.sshItem.nama_barang})
                    </div>
                    {revisedPrice !== activeSSHCheck.sshPrice && (
                      <button
                        type="button"
                        onClick={() => handleRevisedPriceChange(Number(activeSSHCheck.sshPrice))}
                        className="text-[10px] font-bold text-finance-blue hover:underline"
                      >
                        Gunakan Harga SSH
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* 3. Dynamic Multiple Components (Section 2.D) */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-700">
                    Rincian Multiple Components (Dinamis):
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const newF: MultiFactor = {
                        id: `f_${Date.now()}_${revisedFactors.length}`,
                        name: '',
                        value: 1,
                        satuan: ''
                      };
                      setRevisedFactors(prev => [...prev, newF]);
                    }}
                    className="text-[11px] font-bold text-finance-blue hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah Komponen
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {revisedFactors.map((f, fIdx) => (
                    <div key={f.id || fIdx} className="flex items-center gap-2 bg-slate-50 p-2 rounded border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 w-5">#{fIdx + 1}</span>
                      <div className="w-24">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={f.value}
                          onChange={(e) => {
                            const v = Math.max(0, parseFloat(e.target.value) || 0);
                            setRevisedFactors(prev => prev.map((item, i) => i === fIdx ? { ...item, value: v } : item));
                          }}
                          placeholder="Nilai"
                          className="w-full text-xs font-mono font-bold text-center border border-slate-300 rounded p-1 bg-white"
                        />
                      </div>
                      <div className="flex-1">
                        <input
                          type="text"
                          value={f.satuan || f.name}
                          onChange={(e) => {
                            const s = e.target.value;
                            setRevisedFactors(prev => prev.map((item, i) => i === fIdx ? { ...item, satuan: s, name: s } : item));
                          }}
                          placeholder="Satuan (orang, kali, hari, paket, sesi)"
                          className="w-full text-xs border border-slate-300 rounded p-1 bg-white font-medium"
                        />
                      </div>
                      {revisedFactors.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setRevisedFactors(prev => prev.filter((_, i) => i !== fIdx))}
                          className="text-red-400 hover:text-red-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Realtime Live Calculation Preview */}
                <div className="bg-blue-50 border border-blue-200 p-2.5 rounded-lg text-[11px] text-blue-900 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span>Formula Perhitungan:</span>
                    <span className="font-mono font-bold">
                      Rp{revisedPrice.toLocaleString('id-ID')} × {revisedFactors.map(f => `${f.value} ${f.satuan || f.name}`).join(' × ')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-blue-200 pt-1 font-bold">
                    <span>Total Hasil Pencairan:</span>
                    <span className="font-mono text-sm text-finance-navy">
                      Rp{(revisedPrice * revisedFactors.reduce((acc, f) => acc * (Number(f.value) || 0), 1)).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. Catatan Koreksi Bendahara */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Catatan Koreksi Bendahara / Alasan Penyesuaian:
                </label>
                <textarea
                  rows={2}
                  value={revisedReason}
                  onChange={(e) => setRevisedReason(e.target.value)}
                  placeholder="Contoh: Disesuaikan dengan batas SSH, kuota peserta dikurangi 9 orang..."
                  className="w-full text-xs border border-slate-300 rounded p-2"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleResetToOriginal(editingItemIndex)}
                  className="px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-200 rounded font-medium border border-slate-300"
                  title="Kembalikan semua nilai ke usulan awal unit"
                >
                  Reset ke Awal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleExcludeItem(editingItemIndex);
                    setEditingItemIndex(null);
                  }}
                  className="px-2.5 py-1.5 text-xs text-red-700 bg-red-50 hover:bg-red-100 rounded font-medium border border-red-200"
                  title="Coret pos belanja ini (set Rp0)"
                >
                  Coret / Nol-kan
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingItemIndex(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded font-medium"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleApplyRevision}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-finance-blue hover:bg-finance-blueHover rounded shadow-sm"
                >
                  Terapkan Revisi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: TAMBAH KEBUTUHAN BARU OLEH BENDAHARA
      ========================================================================= */}
      {showAddItemModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-slate-50 px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-finance-navy uppercase tracking-wide">
                Tambah Pos Belanja Baru
              </h3>
              <button onClick={() => setShowAddItemModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Kategori:</label>
                <input
                  type="text"
                  value={newItemData.category}
                  onChange={(e) => setNewItemData(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="Konsumsi / Perlengkapan / Acara / Operasional"
                  className="w-full text-xs border border-slate-300 rounded p-2"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Uraian Kebutuhan Belanja:</label>
                <input
                  type="text"
                  value={newItemData.item_name}
                  onChange={(e) => setNewItemData(prev => ({ ...prev, item_name: e.target.value }))}
                  placeholder="Nama pos belanja atau kegiatan baru..."
                  className="w-full text-xs border border-slate-300 rounded p-2"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Harga Satuan (Rp):</label>
                <input
                  type="number"
                  min="0"
                  value={newItemData.unit_price === 0 ? '' : newItemData.unit_price}
                  onChange={(e) => setNewItemData(prev => ({ ...prev, unit_price: Math.max(0, parseFloat(e.target.value) || 0) }))}
                  placeholder="0"
                  className="w-full text-xs font-mono font-bold border border-slate-300 rounded p-2"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Rincian Komponen:</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min="1"
                    value={newItemData.factors[0]?.value || 1}
                    onChange={(e) => {
                      const v = Math.max(1, parseFloat(e.target.value) || 1);
                      setNewItemData(prev => ({ ...prev, factors: [{ ...prev.factors[0], value: v }] }));
                    }}
                    placeholder="Volume"
                    className="text-xs border border-slate-300 rounded p-2 font-mono"
                  />
                  <input
                    type="text"
                    value={newItemData.factors[0]?.satuan || 'Paket'}
                    onChange={(e) => {
                      const s = e.target.value;
                      setNewItemData(prev => ({ ...prev, factors: [{ ...prev.factors[0], satuan: s, name: s }] }));
                    }}
                    placeholder="Satuan"
                    className="text-xs border border-slate-300 rounded p-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Alasan Penambahan:</label>
                <input
                  type="text"
                  value={newItemData.reason}
                  onChange={(e) => setNewItemData(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full text-xs border border-slate-300 rounded p-2"
                />
              </div>
            </div>

            <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddItemModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded font-medium"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleCreateNewItem}
                className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow-sm"
              >
                Tambahkan Pos Belanja
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: INSPEKTOR DETAIL ACUAN MASTER SSH
      ========================================================================= */}
      {inspectingSSH && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 p-5 space-y-3 animate-in fade-in zoom-in-95 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-finance-blue" />
                <h3 className="font-bold text-finance-navy text-sm uppercase">Pemeriksaan Master SSH</h3>
              </div>
              <button onClick={() => setInspectingSSH(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Item Belanja</span>
                <span className="font-bold text-slate-900 text-sm">{inspectingSSH.itemName}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-500 block">Harga Pengajuan:</span>
                  <span className="font-mono font-bold text-slate-900">
                    Rp{inspectingSSH.unitPrice.toLocaleString('id-ID')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Standar SSH:</span>
                  <span className="font-mono font-bold text-finance-navy">
                    {inspectingSSH.checkResult.sshPrice ? `Rp${inspectingSSH.checkResult.sshPrice.toLocaleString('id-ID')}` : 'Belum Ada'}
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded border flex items-center justify-between font-semibold">
                <span>Status Evaluasi:</span>
                <SSHBadge
                  status={inspectingSSH.checkResult.status}
                  diff={inspectingSSH.checkResult.diff}
                  percentageDiff={inspectingSSH.checkResult.percentageDiff}
                />
              </div>

              <div className="text-[11px] text-slate-600 leading-relaxed bg-blue-50/50 p-2.5 rounded border border-blue-100">
                <strong>Catatan Sistem:</strong> {inspectingSSH.checkResult.message}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setInspectingSSH(null)}
                className="px-4 py-1.5 text-xs font-bold text-white bg-finance-blue hover:bg-finance-blueHover rounded shadow-sm"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
