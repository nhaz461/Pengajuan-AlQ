import React, { useState, useEffect, useRef } from 'react';
import { databaseService } from '../lib/databaseService';
import { reportExportService } from '../lib/reportExportService';
import { Submission } from '../types/database';
import { StatusBadge } from '../components/StatusBadge';
import {
  FileText,
  Copy,
  Download,
  Printer,
  History,
  Building,
  CheckCircle,
  Share2,
  AlertCircle,
  ArrowRight,
  Receipt,
  FileCheck2
} from 'lucide-react';

interface DisbursementReportPageProps {
  initialSubmissionId?: string | null;
  onNavigate: (tab: any, params?: any) => void;
}

export const DisbursementReportPage: React.FC<DisbursementReportPageProps> = ({
  initialSubmissionId,
  onNavigate
}) => {
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const reportCardRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await databaseService.getSubmissions();
      setSubmissions(data);

      if (initialSubmissionId) {
        const target = data.find(s => s.id === initialSubmissionId);
        if (target) setSelectedSub(target);
      } else if (data.length > 0 && !selectedSub) {
        // Default to first approved or submitted
        const best = data.find(s => ['Disetujui', 'Siap Dicairkan', 'Dicairkan Sebagian', 'Selesai Dicairkan'].includes(s.status)) || data[0];
        setSelectedSub(best);
      }
    } catch (err) {
      console.error('Error loading report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [initialSubmissionId]);

  // 1. Salin Sebagai Gambar
  const handleCopyImage = async () => {
    if (!reportCardRef.current) return;
    setIsExporting(true);
    setCopyStatus('Menyiapkan gambar laporan berkualitas tinggi...');

    try {
      const result = await reportExportService.copyImageToClipboard(reportCardRef.current);
      setCopyStatus(result.message);
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
    if (!reportCardRef.current || !selectedSub) return;
    setIsExporting(true);
    try {
      const cleanNum = selectedSub.submission_number.replace(/\//g, '_');
      await reportExportService.downloadPng(reportCardRef.current, `Lembar_Disposisi_${cleanNum}.png`);
    } catch (err: any) {
      alert(`Gagal mengunduh PNG: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // 3. Unduh PDF
  const handleDownloadPdf = async () => {
    if (!reportCardRef.current || !selectedSub) return;
    setIsExporting(true);
    try {
      const cleanNum = selectedSub.submission_number.replace(/\//g, '_');
      await reportExportService.downloadPdf(reportCardRef.current, `Lembar_Disposisi_${cleanNum}.pdf`);
    } catch (err: any) {
      alert(`Gagal mengunduh PDF: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // 4. Cetak (Print)
  const handlePrint = () => {
    reportExportService.printReport();
  };

  const originalTotal = Number(selectedSub?.original_total || 0);
  const approvedTotal = Number(selectedSub?.approved_total || 0);
  const disbursedTotal = Number(selectedSub?.disbursed_total || 0);
  const remainingTotal = Math.max(0, approvedTotal - disbursedTotal);
  const selisihTotal = Math.max(0, originalTotal - approvedTotal);

  // Active items: if analysis items exist, use them (excluding REMOVED), otherwise fallback to submission original items
  const displayItems = selectedSub?.analysis_items && selectedSub.analysis_items.length > 0
    ? selectedSub.analysis_items.filter(it => it.item_type !== 'REMOVED')
    : selectedSub?.items || [];

  return (
    <div className="space-y-5 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <div>
          <h1 className="text-xl font-bold text-finance-navy">Lembar Laporan & Disposisi Pencairan</h1>
          <p className="text-xs text-slate-500">
            Laporan ringkas resmi siap disalin ke WhatsApp atau dicetak untuk Bagian Pengeluaran.
          </p>
        </div>

        {/* Action Toolbar (Section K Required Buttons) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Salin sebagai Gambar */}
          <button
            onClick={handleCopyImage}
            disabled={isExporting || !selectedSub}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-finance-blue hover:bg-finance-blueHover rounded-lg transition-colors shadow-sm disabled:opacity-50"
            title="Salin langsung sebagai gambar untuk ditempel di WhatsApp"
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
            <FileText className="w-3.5 h-3.5 text-red-500" />
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

          {/* Lihat Riwayat */}
          <button
            onClick={() => setShowHistoryModal(true)}
            disabled={!selectedSub}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors shadow-sm"
          >
            <History className="w-3.5 h-3.5 text-finance-blue" />
            <span>Lihat Riwayat</span>
          </button>
        </div>
      </div>

      {/* Copy Notification Toast */}
      {copyStatus && (
        <div className="bg-blue-50 border border-blue-200 text-blue-900 px-4 py-2.5 rounded-xl text-xs flex items-center justify-between no-print animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-finance-blue" />
            <span>{copyStatus}</span>
          </div>
          <button onClick={() => setCopyStatus(null)} className="text-blue-500 hover:text-blue-700 font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Select Submission Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2 no-print">
        <FileText className="w-4 h-4 text-finance-blue shrink-0" />
        <span className="text-xs font-semibold text-slate-700 shrink-0">Pilih Dokumen Pengajuan:</span>
        <select
          value={selectedSub?.id || ''}
          onChange={(e) => {
            const found = submissions.find(s => s.id === e.target.value);
            if (found) setSelectedSub(found);
          }}
          className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-finance-blue bg-white font-medium"
        >
          {submissions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.submission_number} • {s.unit_name} - {s.activity_name} (Rp{Number(s.approved_total || s.original_total).toLocaleString('id-ID')}) [{s.status}]
            </option>
          ))}
        </select>
      </div>

      {!selectedSub ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <div className="text-sm font-semibold text-slate-700">Belum Ada Pengajuan Terpilih</div>
        </div>
      ) : (
        /* =========================================================================
            OFFICIAL REPORT SHEET (CAPTURED AS HIGH-RES PNG / PDF)
        ========================================================================= */
        <div className="flex justify-center">
          <div
            ref={reportCardRef}
            className="bg-white rounded-xl border border-slate-300 shadow-lg p-6 sm:p-8 max-w-3xl w-full text-slate-900 font-sans"
            style={{ width: '100%', maxWidth: '780px' }}
          >
            {/* 1. Header Identitas Yayasan (Section K) */}
            <div className="flex items-center justify-between pb-4 border-b-2 border-slate-800">
              <div className="flex items-center gap-3">
                <img src="/logo.svg" alt="Logo" className="w-14 h-14" />
                <div>
                  <h2 className="text-sm font-extrabold uppercase tracking-wide text-finance-navy">
                    YAYASAN PENDIDIKAN ISLAM AL-QUR'ANIYYAH
                  </h2>
                  <p className="text-[11px] text-slate-600 font-medium">
                    Pondok Pesantren Al-Qur'aniyyah • Manna, Bengkulu Selatan
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Sistem Administrasi & Analisis Pencairan Keuangan Resmi
                  </p>
                </div>
              </div>

              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-slate-400">Status Berkas</div>
                <div className="mt-1">
                  <StatusBadge status={selectedSub.status} size="md" />
                </div>
              </div>
            </div>

            {/* Document Title */}
            <div className="py-4 text-center">
              <h1 className="text-base font-bold text-finance-navy uppercase tracking-wider">
                LEMBAR DISPOSISI & PERSETUJUAN PENCAIRAN DANA
              </h1>
              <div className="text-xs text-slate-500 font-mono mt-0.5">
                Nomor: <strong className="text-slate-900">{selectedSub.submission_number}</strong>
              </div>
            </div>

            {/* 2. Metadata Grid (Section K) */}
            <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs mb-4">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-semibold">Unit Pemohon</span>
                <span className="font-bold text-slate-900">{selectedSub.unit_name}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-semibold">Tahun Anggaran</span>
                <span className="font-semibold text-slate-900">{selectedSub.fiscal_year}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-semibold">Tanggal Berkas</span>
                <span className="font-semibold text-slate-900">{selectedSub.submission_date}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-semibold">Penanggung Jawab</span>
                <span className="font-semibold text-slate-900">{selectedSub.person_in_charge}</span>
              </div>
              <div className="col-span-2 sm:col-span-4 pt-1.5 border-t border-slate-200 flex justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-semibold">Nama Kegiatan / Kebutuhan</span>
                  <span className="font-bold text-slate-900 text-sm">{selectedSub.activity_name}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block uppercase font-semibold">Kategori</span>
                  <span className="font-medium text-slate-700">{selectedSub.category}</span>
                </div>
              </div>
            </div>

            {/* 3. Executive Financial Comparison Boxes (Section K) */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center mb-5 font-mono">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 font-sans block">Total Diajukan</span>
                <span className="text-xs font-bold text-slate-800 block mt-1">
                  Rp{originalTotal.toLocaleString('id-ID')}
                </span>
              </div>

              <div className="bg-sky-50/70 p-2.5 rounded-lg border border-sky-300">
                <span className="text-[10px] text-sky-800 font-sans font-bold block">Total Disetujui</span>
                <span className="text-xs font-bold text-sky-900 block mt-1">
                  Rp{approvedTotal.toLocaleString('id-ID')}
                </span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 font-sans block">Selisih Pengajuan</span>
                <span className="text-xs font-bold text-indigo-900 block mt-1">
                  Rp{selisihTotal.toLocaleString('id-ID')}
                </span>
              </div>

              <div className="bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-300">
                <span className="text-[10px] text-emerald-800 font-sans font-bold block">Telah Dicairkan</span>
                <span className="text-xs font-bold text-finance-navy block mt-1">
                  Rp{disbursedTotal.toLocaleString('id-ID')}
                </span>
              </div>

              <div className="bg-orange-50/70 p-2.5 rounded-lg border border-orange-300 col-span-2 sm:col-span-1">
                <span className="text-[10px] text-orange-800 font-sans font-bold block">Belum Dicairkan</span>
                <span className="text-xs font-bold text-orange-900 block mt-1">
                  Rp{remainingTotal.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {/* 4. Rincian Item yang Disetujui (Section K) */}
            <div className="mb-5">
              <div className="text-xs font-bold text-finance-navy uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Rincian Item Belanja yang Disetujui</span>
                <span className="text-[11px] text-slate-500 font-normal">
                  ({displayItems.length} Pos Rincian)
                </span>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 text-[10px] uppercase font-bold border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2 w-8 text-center">No</th>
                      <th className="px-3 py-2">Uraian Belanja</th>
                      <th className="px-3 py-2 text-right">Harga Satuan</th>
                      <th className="px-3 py-2 text-center">Vol</th>
                      <th className="px-3 py-2">Satuan</th>
                      <th className="px-3 py-2 text-right">Total Disetujui</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayItems.map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-3 py-2 text-center text-slate-400 font-mono">{idx + 1}</td>
                        <td className="px-3 py-2">
                          <div className="font-semibold text-slate-800">{item.item_name}</div>
                          {item.change_reason && (
                            <div className="text-[10px] text-amber-700 italic">
                              *Catatan: {item.change_reason}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-slate-700">
                          Rp{Number(item.unit_price).toLocaleString('id-ID')}
                        </td>
                        <td className="px-3 py-2 text-center font-mono text-slate-700">{item.volume}</td>
                        <td className="px-3 py-2 text-slate-600">{item.unit}</td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">
                          Rp{Number(item.total_amount).toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t border-slate-200 font-mono text-xs">
                    <tr>
                      <td colSpan={5} className="px-3 py-2 text-right uppercase text-slate-700 font-sans">
                        Total Anggaran Disetujui:
                      </td>
                      <td className="px-3 py-2 text-right text-sky-900 font-bold">
                        Rp{approvedTotal.toLocaleString('id-ID')}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* 5. Catatan Bendahara & Disposisi (Section K) */}
            <div className="bg-amber-50/50 border border-amber-200 rounded-lg p-3 text-xs mb-6">
              <span className="font-bold text-amber-900 block text-[11px] uppercase">
                Catatan / Instruksi Disposisi Bendahara Umum:
              </span>
              <p className="text-slate-800 mt-1 italic leading-relaxed">
                {selectedSub.treasurer_notes || 'Disetujui untuk dicairkan sesuai ketentuan anggaran Yayasan.'}
              </p>
            </div>

            {/* 6. Signature Disposisi Section */}
            <div className="pt-2 border-t border-slate-200 grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-medium">Pemohon</span>
                <div className="h-14 flex items-center justify-center font-medium text-slate-800">
                  {selectedSub.person_in_charge}
                </div>
                <div className="border-t border-slate-300 pt-1 font-semibold text-slate-700">
                  {selectedSub.unit_name}
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-medium">Dianalisis & Disetujui</span>
                <div className="h-14 flex items-center justify-center font-semibold text-finance-navy">
                  {selectedSub.analyzed_by || 'Bendahara Umum'}
                </div>
                <div className="border-t border-slate-300 pt-1 font-semibold text-slate-700">
                  Bendahara Umum Yayasan
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-medium">Bagian Pengeluaran</span>
                <div className="h-14 flex items-center justify-center font-medium text-slate-700">
                  {selectedSub.disbursements && selectedSub.disbursements.length > 0
                    ? selectedSub.disbursements[0].officer_name
                    : '(Petugas Kasir)'}
                </div>
                <div className="border-t border-slate-300 pt-1 font-semibold text-slate-700">
                  Realisasi Kas / Bank
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && selectedSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full p-5 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-finance-blue" />
                <h3 className="text-base font-bold text-finance-navy">Riwayat Transaksi Pencairan</h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div className="font-semibold text-slate-800">
                Berkas: {selectedSub.submission_number} ({selectedSub.activity_name})
              </div>

              {!selectedSub.disbursements || selectedSub.disbursements.length === 0 ? (
                <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-lg">
                  Belum ada realisasi pencairan kas yang dicatat untuk pengajuan ini.
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {selectedSub.disbursements.map((d) => (
                    <div key={d.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between font-mono">
                      <div>
                        <div className="font-bold text-slate-900">{d.transaction_number}</div>
                        <div className="text-[11px] text-slate-500 font-sans">
                          {d.disbursement_date} • {d.payment_method} ({d.recipient_name})
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-finance-navy">
                          Rp{Number(d.amount).toLocaleString('id-ID')}
                        </div>
                        <div className="text-[10px] text-slate-400 font-sans">
                          Petugas: {d.officer_name}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
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
