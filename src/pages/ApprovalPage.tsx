import React, { useState, useEffect } from 'react';
import { databaseService } from '../lib/databaseService';
import { useAuth } from '../lib/authContext';
import { Submission } from '../types/database';
import { StatusBadge } from '../components/StatusBadge';
import {
  CheckCircle2,
  XCircle,
  Clock,
  FileCheck,
  Building,
  RefreshCw,
  Search,
  Eye,
  AlertCircle
} from 'lucide-react';

interface ApprovalPageProps {
  onNavigate: (tab: any, params?: any) => void;
}

export const ApprovalPage: React.FC<ApprovalPageProps> = ({ onNavigate }) => {
  const { currentUser, canApprove } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);

  // Approval modal state
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const all = await databaseService.getSubmissions();
      // Filter for items ready for approval decision
      setSubmissions(all);
    } catch (err) {
      console.error('Error loading submissions for approval:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async () => {
    if (!selectedSub) return;
    setProcessing(true);
    try {
      await databaseService.approveSubmission(
        selectedSub.id,
        notes,
        currentUser?.full_name || 'Bendahara Umum',
        currentUser?.role || 'BENDAHARA'
      );
      alert(`Pengajuan ${selectedSub.submission_number} berhasil disetujui dan siap dicairkan!`);
      setActionType(null);
      setSelectedSub(null);
      await loadData();
    } catch (err: any) {
      alert(`Gagal menyetujui: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedSub) return;
    if (!notes.trim()) {
      alert('Alasan penolakan wajib diisi.');
      return;
    }
    setProcessing(true);
    try {
      await databaseService.rejectSubmission(
        selectedSub.id,
        notes,
        currentUser?.full_name || 'Bendahara Umum',
        currentUser?.role || 'BENDAHARA'
      );
      alert(`Pengajuan ${selectedSub.submission_number} telah ditolak.`);
      setActionType(null);
      setSelectedSub(null);
      await loadData();
    } catch (err: any) {
      alert(`Gagal menolak: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  // Submissions waiting for approval
  const waitingApproval = submissions.filter(s => s.status === 'Menunggu Persetujuan');
  const otherSubmissions = submissions.filter(s => s.status !== 'Menunggu Persetujuan');

  return (
    <div className="space-y-5 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-finance-navy">Persetujuan & Disposisi Anggaran</h1>
          <p className="text-xs text-slate-500">
            Penetapan persetujuan resmi Yayasan sebelum dana masuk ke antrean Bagian Pengeluaran.
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

      {/* Priority: Menunggu Persetujuan */}
      <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-amber-200 bg-amber-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm font-bold text-amber-900">
              Menunggu Persetujuan ({waitingApproval.length} Berkas)
            </h2>
          </div>
          <span className="text-[11px] text-amber-700 font-medium">Perlu Keputusan Segera</span>
        </div>

        {waitingApproval.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Tidak ada pengajuan yang sedang menunggu persetujuan saat ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Nomor & Tanggal</th>
                  <th className="px-3 py-3">Unit</th>
                  <th className="px-4 py-3">Kegiatan</th>
                  <th className="px-4 py-3 text-right">Diajukan</th>
                  <th className="px-4 py-3 text-right">Disetujui Bendahara</th>
                  <th className="px-4 py-3 text-right">Selisih</th>
                  <th className="px-4 py-3 text-center">Keputusan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {waitingApproval.map((sub) => {
                  const selisih = Number(sub.original_total) - Number(sub.approved_total);
                  return (
                    <tr key={sub.id} className="hover:bg-amber-50/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-mono font-bold text-slate-900">{sub.submission_number}</div>
                        <div className="text-[11px] text-slate-400">{sub.submission_date}</div>
                      </td>
                      <td className="px-3 py-3 font-semibold text-slate-800">{sub.unit_name}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{sub.activity_name}</div>
                        <div className="text-[11px] text-slate-400">Dianalisis oleh: {sub.analyzed_by || 'Bendahara'}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-800">
                        Rp{Number(sub.original_total).toLocaleString('id-ID')}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-sky-800">
                        Rp{Number(sub.approved_total).toLocaleString('id-ID')}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-indigo-800">
                        Rp{selisih.toLocaleString('id-ID')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedSub(sub);
                              setActionType('APPROVE');
                              setNotes(sub.treasurer_notes || '');
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-finance-blue hover:bg-finance-blueHover rounded shadow-sm"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Setujui</span>
                          </button>

                          <button
                            onClick={() => {
                              setSelectedSub(sub);
                              setActionType('REJECT');
                              setNotes('');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Tolak</span>
                          </button>

                          <button
                            onClick={() => onNavigate('reports', { submissionId: sub.id })}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded border border-slate-200"
                            title="Tinjau Rincian"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
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

      {/* Decision Modal */}
      {actionType && selectedSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-5 border border-slate-200">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              {actionType === 'APPROVE' ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-finance-blue" />
                  <h3 className="text-base font-bold text-finance-navy">Konfirmasi Persetujuan Anggaran</h3>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-red-600" />
                  <h3 className="text-base font-bold text-red-600">Konfirmasi Penolakan Pengajuan</h3>
                </>
              )}
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Nomor Pengajuan:</span>
                  <span className="font-mono font-bold text-slate-800">{selectedSub.submission_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Unit Pemohon:</span>
                  <span className="font-semibold text-slate-800">{selectedSub.unit_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Kegiatan:</span>
                  <span className="text-slate-800">{selectedSub.activity_name}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span className="font-semibold text-slate-700">Nominal Disetujui:</span>
                  <span className="font-mono font-bold text-sky-800 text-sm">
                    Rp{Number(selectedSub.approved_total).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  {actionType === 'APPROVE' ? 'Catatan Disposisi / Instruksi Pencairan:' : 'Alasan Penolakan (Wajib Diisi):'}
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={
                    actionType === 'APPROVE'
                      ? 'Instruksi pembayaran untuk Bagian Pengeluaran...'
                      : 'Jelaskan alasan penolakan usulan anggaran...'
                  }
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:ring-1 focus:ring-finance-blue"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActionType(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Batal
              </button>
              {actionType === 'APPROVE' ? (
                <button
                  type="button"
                  disabled={processing}
                  onClick={handleApprove}
                  className="px-4 py-2 text-xs font-semibold text-white bg-finance-blue hover:bg-finance-blueHover rounded-lg transition-colors shadow-sm"
                >
                  {processing ? 'Menyimpan...' : 'Setujui Pengajuan'}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={processing}
                  onClick={handleReject}
                  className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm"
                >
                  {processing ? 'Menolak...' : 'Konfirmasi Tolak'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
