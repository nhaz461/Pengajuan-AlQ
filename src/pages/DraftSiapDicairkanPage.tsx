import React, { useState, useEffect, useRef } from 'react';
import { databaseService } from '../lib/databaseService';
import { reportExportService } from '../lib/reportExportService';
import { Submission, AnalysisItem } from '../types/database';
import { StatusBadge, SSHBadge } from '../components/StatusBadge';
import {
  FileCheck2,
  Copy,
  Download,
  Printer,
  Search,
  RefreshCw,
  Building,
  CheckCircle,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';

interface DraftSiapDicairkanPageProps {
  initialSubmissionId?: string | null;
  onNavigate: (tab: any, params?: any) => void;
}

export const DraftSiapDicairkanPage: React.FC<DraftSiapDicairkanPageProps> = ({
  initialSubmissionId,
  onNavigate
}) => {
  const [loading, setLoading] = useState(true);
  const [draftList, setDraftList] = useState<Submission[]>([]);
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);

  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const reportRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const all = await databaseService.getSubmissions();
      // Filter for items that have been analyzed and finalized as 'Draft Siap Dicairkan' (or 'Disetujui')
      const readyDrafts = all.filter(s =>
        ['Draft Siap Dicairkan', 'Disetujui', 'Siap Dicairkan', 'Dicairkan Sebagian', 'Selesai Dicairkan'].includes(s.status)
      );
      setDraftList(readyDrafts);

      if (initialSubmissionId) {
        const found = readyDrafts.find(s => s.id === initialSubmissionId) || all.find(s => s.id === initialSubmissionId);
        if (found) setSelectedSub(found);
      } else if (readyDrafts.length > 0 && !selectedSub) {
        setSelectedSub(readyDrafts[0]);
      }
    } catch (err) {
      console.error('Error loading ready drafts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [initialSubmissionId]);

  // 1. Salin Sebagai Gambar (Direct Clipboard for WhatsApp)
  const handleCopyImage = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    setCopyStatus('Menyiapkan gambar dokumen beresolusi tinggi...');
    try {
      const res = await reportExportService.copyImageToClipboard(reportRef.current);
      setCopyStatus(res.message);
      setTimeout(() => setCopyStatus(null), 5000);
    } catch (err: any) {
      setCopyStatus(`Gagal menyalin: ${err.message}`);
      setTimeout(() => setCopyStatus(null), 4000);
    } finally {
      setIsExporting(false);
    }
  };

  // 2. Unduh PNG
  const handleDownloadPng = async () => {
    if (!reportRef.current || !selectedSub) return;
    setIsExporting(true);
    try {
      const cleanNum = selectedSub.submission_number.replace(/\//g, '_');
      await reportExportService.downloadPng(reportRef.current, `Draft_Siap_Dicairkan_${cleanNum}.png`);
    } catch (err: any) {
      alert(`Gagal mengunduh PNG: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // 3. Unduh PDF
  const handleDownloadPdf = async () => {
    if (!reportRef.current || !selectedSub) return;
    setIsExporting(true);
    try {
      const cleanNum = selectedSub.submission_number.replace(/\//g, '_');
      await reportExportService.downloadPdf(reportRef.current, `Draft_Siap_Dicairkan_${cleanNum}.pdf`);
    } catch (err: any) {
      alert(`Gagal mengunduh PDF: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // 4. Cetak
  const handlePrint = () => {
    reportExportService.printReport();
  };

  const totalOriginal = Number(selectedSub?.original_total || 0);
  const totalApproved = Number(selectedSub?.approved_total || 0);
  const selisih = totalOriginal - totalApproved;

  // Group analysis items by category to display subtotals per category
  const activeItems: AnalysisItem[] = selectedSub?.analysis_items && selectedSub.analysis_items.length > 0
    ? selectedSub.analysis_items.filter(it => it.item_type !== 'REMOVED')
    : (selectedSub?.items as any[]) || [];

  const categories = Array.from(new Set(activeItems.map(it => it.category || 'Umum')));

  return (
    <div className="space-y-5 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <div>
          <h1 className="text-xl font-bold text-finance-navy">Draft Anggaran Siap Dicairkan</h1>
          <p className="text-xs text-slate-500">
            Dokumen resmi hasil penetapan analisis Bendahara Umum yang siap diserahkan kepada Bendahara Pengeluaran.
          </p>
        </div>

        {/* Action Toolbar (Section H) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Salin sebagai Gambar */}
          <button
            onClick={handleCopyImage}
            disabled={isExporting || !selectedSub}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-finance-blue hover:bg-finance-blueHover rounded-lg transition-colors shadow-sm disabled:opacity-50"
            title="Salin langsung sebagai gambar untuk dikirim ke WhatsApp Bendahara Pengeluaran"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Salin sebagai Gambar</span>
          </button>

          {/* Unduh PNG */}
          <button
            onClick={handleDownloadPng}
            disabled={isExporting || !selectedSub}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Unduh PNG</span>
          </button>

          {/* Unduh PDF */}
          <button
            onClick={handleDownloadPdf}
            disabled={isExporting || !selectedSub}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-red-500" />
            <span>Unduh PDF</span>
          </button>

          {/* Cetak */}
          <button
            onClick={handlePrint}
            disabled={!selectedSub}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors shadow-sm"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>Cetak</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
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

      {/* Select Draft Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2 no-print">
        <FileCheck2 className="w-4 h-4 text-emerald-600 shrink-0" />
        <span className="text-xs font-semibold text-slate-700 shrink-0">Pilih Berkas Draft:</span>
        <select
          value={selectedSub?.id || ''}
          onChange={(e) => {
            const found = draftList.find(s => s.id === e.target.value);
            if (found) setSelectedSub(found);
          }}
          className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-finance-blue bg-white font-medium"
        >
          {draftList.map((s) => (
            <option key={s.id} value={s.id}>
              {s.submission_number} • {s.unit_name} - {s.activity_name} (Disetujui: Rp{Number(s.approved_total).toLocaleString('id-ID')}) [{s.status}]
            </option>
          ))}
        </select>
      </div>

      {!selectedSub ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center">
          <FileCheck2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <div className="text-sm font-semibold text-slate-700">Belum Ada Draft Anggaran Siap Dicairkan</div>
          <div className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Buka menu "Analisis Pengajuan", selesaikan penyesuaian nominal, lalu tekan tombol "Simpan ke Draft Anggaran Siap Dicairkan".
          </div>
        </div>
      ) : (
        /* =========================================================================
            OFFICIAL DRAFT ANGGARAN SIAP DICAIRKAN (FORMAT RESMI YAYASAN)
        ========================================================================= */
        <div className="w-full">
          <div
            ref={reportRef}
            className="bg-white rounded-xl border border-slate-300 shadow-md p-4 sm:p-6 lg:p-8 w-full text-slate-900 font-sans"
          >
            {/* Header Yayasan */}
            <div className="flex flex-col sm:flex-row items-center justify-between pb-4 border-b-2 border-slate-800 gap-3">
              <div className="flex items-center gap-3 text-center sm:text-left">
                <img src="/logo.svg" alt="Logo" className="w-12 h-12 sm:w-14 sm:h-14 shrink-0" />
                <div>
                  <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-wide text-finance-navy">
                    YAYASAN PENDIDIKAN ISLAM PONDOK PESANTREN AL-QUR'ANIYYAH
                  </h2>
                  <p className="text-[10px] sm:text-[11px] text-slate-600 font-medium">
                    Komp. Pesantren Al-Qur'aniyyah • Manna, Bengkulu Selatan
                  </p>
                  <p className="text-[9px] sm:text-[10px] text-slate-400">
                    Sistem Perencanaan & Disposisi Anggaran Keuangan
                  </p>
                </div>
              </div>

              <div className="text-center sm:text-right shrink-0">
                <div className="text-[10px] uppercase font-bold text-slate-400">Keterangan Dokumen</div>
                <div className="mt-1">
                  <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold px-2.5 py-1 rounded-md inline-block">
                    DRAFT SIAP DICAIRKAN
                  </span>
                </div>
              </div>
            </div>

            {/* Title */}
            <div className="py-4 text-center">
              <h1 className="text-sm sm:text-base font-bold text-finance-navy uppercase tracking-wider">
                RENCANA ANGGARAN BIAYA (RAB) HASIL ANALISIS BENDAHARA UMUM
              </h1>
              <div className="text-xs text-slate-500 font-mono mt-0.5">
                Nomor: <strong className="text-slate-900 font-bold">{selectedSub.submission_number}</strong>
              </div>
            </div>

            {/* Metadata Grid */}
            <div className="bg-slate-50 rounded-lg p-3 sm:p-4 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs mb-4">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-semibold">Unit Pemohon</span>
                <span className="font-bold text-slate-900">{selectedSub.unit_name}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-semibold">Tahun Anggaran</span>
                <span className="font-semibold text-slate-900">{selectedSub.fiscal_year}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-semibold">Tanggal Pengajuan</span>
                <span className="font-semibold text-slate-900">{selectedSub.submission_date}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-semibold">Penanggung Jawab</span>
                <span className="font-semibold text-slate-900">{selectedSub.person_in_charge}</span>
              </div>
              <div className="col-span-2 sm:col-span-4 pt-2 border-t border-slate-200 flex flex-col sm:flex-row justify-between gap-1">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-semibold">Nama Kegiatan / Kebutuhan</span>
                  <span className="font-bold text-slate-900 text-xs sm:text-sm">{selectedSub.activity_name}</span>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-[10px] text-slate-400 block uppercase font-semibold">Kategori Utama</span>
                  <span className="font-medium text-slate-700">{selectedSub.category}</span>
                </div>
              </div>
            </div>

            {/* Financial Summary Comparison Boxes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-center mb-5 font-mono">
              <div className="bg-slate-50 p-2.5 sm:p-3 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 font-sans block font-semibold">Total Pengajuan Awal Unit</span>
                <span className="text-sm sm:text-base font-bold text-slate-800 block mt-1">
                  Rp{totalOriginal.toLocaleString('id-ID')}
                </span>
              </div>

              <div className="bg-emerald-50/70 p-2.5 sm:p-3 rounded-lg border border-emerald-300">
                <span className="text-[10px] text-emerald-800 font-sans font-bold block">Total Disetujui (Siap Dicairkan)</span>
                <span className="text-sm sm:text-base font-black text-emerald-900 block mt-1">
                  Rp{totalApproved.toLocaleString('id-ID')}
                </span>
              </div>

              <div className="bg-slate-50 p-2.5 sm:p-3 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 font-sans block font-semibold">Selisih Efisiensi Nominal</span>
                <span className={`text-sm sm:text-base font-bold block mt-1 ${selisih < 0 ? 'text-red-600' : 'text-indigo-900'}`}>
                  {selisih < 0 ? '-' : ''}Rp{Math.abs(selisih).toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {/* Rincian Item Berdasarkan Kategori Fleksibel (Section H) */}
            <div className="space-y-4 mb-5">
              {categories.map((catName) => {
                const catItems = activeItems.filter(it => (it.category || 'Umum') === catName);
                const subtotal = catItems.reduce((sum, it) => sum + Number(it.total_amount || 0), 0);

                return (
                  <div key={catName} className="border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
                    <div className="bg-slate-100 px-3 py-2 flex items-center justify-between font-bold text-xs text-finance-navy border-b border-slate-200">
                      <span>Kategori: {catName}</span>
                      <span className="font-mono text-slate-800 font-extrabold">Subtotal: Rp{subtotal.toLocaleString('id-ID')}</span>
                    </div>

                    <div className="overflow-x-auto w-full">
                      <table className="w-full min-w-[700px] text-xs text-left">
                        <thead className="bg-slate-50 text-slate-600 text-[10px] uppercase font-semibold border-b border-slate-200">
                          <tr>
                            <th className="px-3 py-2 w-8 text-center">No</th>
                            <th className="px-3 py-2">Uraian Kebutuhan</th>
                            <th className="px-3 py-2 text-right">Harga Satuan</th>
                            <th className="px-3 py-2 text-center">Rincian Multi-Faktor Volume</th>
                            <th className="px-3 py-2 text-center">SSH</th>
                            <th className="px-3 py-2 text-right">Jumlah (Rp)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {catItems.map((item: any, idx: number) => {
                            const factors: any[] = item.multi_factors
                              ? (typeof item.multi_factors === 'string' ? JSON.parse(item.multi_factors) : item.multi_factors)
                              : [];
                            return (
                              <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                                <td className="px-3 py-2 text-center text-slate-400 font-mono">{idx + 1}</td>
                                <td className="px-3 py-2 font-medium text-slate-900">
                                  {item.item_name}
                                  {item.change_reason && (
                                    <span className="block text-[10px] text-indigo-700 italic">
                                      Catatan: {item.change_reason}
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-right font-mono text-slate-800 whitespace-nowrap">
                                  Rp{Number(item.unit_price).toLocaleString('id-ID')}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <div className="flex flex-wrap items-center justify-center gap-1 font-mono text-[10px]">
                                    {factors.length > 0 ? (
                                      factors.map((f, fi) => (
                                        <span key={fi} className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded">
                                          <strong>{f.value}</strong> {f.satuan || f.name}
                                        </span>
                                      ))
                                    ) : (
                                      <span>{item.volume} {item.unit}</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-3 py-2 text-center whitespace-nowrap">
                                  <SSHBadge status={item.ssh_status} size="sm" />
                                </td>
                                <td className="px-3 py-2 text-right font-mono font-bold text-finance-navy whitespace-nowrap">
                                  Rp{Number(item.total_amount).toLocaleString('id-ID')}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Catatan & Instruksi Bendahara Umum */}
            <div className="bg-amber-50/50 border border-amber-200 rounded-lg p-3 text-xs mb-6">
              <span className="font-bold text-amber-900 block text-[11px] uppercase">
                Catatan & Instruksi Bendahara Umum:
              </span>
              <p className="text-slate-800 mt-1 italic leading-relaxed">
                {selectedSub.treasurer_notes || 'Ditetapkan sebagai Draft Anggaran Siap Dicairkan. Pembayaran dapat direalisasikan oleh Bendahara Pengeluaran sesuai pagu hasil analisis.'}
              </p>
            </div>

            {/* Signatures */}
            <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-4 text-center text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-medium">Pemohon Unit</span>
                <div className="h-14 flex items-center justify-center font-medium text-slate-800">
                  {selectedSub.person_in_charge}
                </div>
                <div className="border-t border-slate-300 pt-1 font-semibold text-slate-700">
                  {selectedSub.unit_name}
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-medium">Ditetapkan Oleh</span>
                <div className="h-14 flex items-center justify-center font-semibold text-finance-navy">
                  {selectedSub.analyzed_by || 'Bendahara Umum Yayasan'}
                </div>
                <div className="border-t border-slate-300 pt-1 font-semibold text-slate-700">
                  Bendahara Umum Yayasan
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
