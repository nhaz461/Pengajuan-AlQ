import React, { useState, useEffect } from 'react';
import { databaseService } from '../lib/databaseService';
import { useAuth } from '../lib/authContext';
import { Submission, Disbursement } from '../types/database';
import { StatusBadge } from '../components/StatusBadge';
import {
  Wallet,
  Plus,
  Receipt,
  Building,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  CreditCard,
  FileCheck2,
  FileText
} from 'lucide-react';

interface DisbursementPageProps {
  onNavigate: (tab: any, params?: any) => void;
}

export const DisbursementPage: React.FC<DisbursementPageProps> = ({ onNavigate }) => {
  const { currentUser, canDisburse } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [disbursementList, setDisbursementList] = useState<Disbursement[]>([]);

  // Modal Record Disbursement
  const [showModal, setShowModal] = useState(false);
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);

  // Form Fields
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'TRANSFER' | 'TUNAI'>('TRANSFER');
  const [bankName, setBankName] = useState('BSI (Bank Syariah Indonesia)');
  const [accountNumber, setAccountNumber] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [proofReference, setProofReference] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const all = await databaseService.getSubmissions();
      // Only approved or partially disbursed submissions can have disbursements recorded
      const readyForDisb = all.filter(s =>
        ['Disetujui', 'Siap Dicairkan', 'Dicairkan Sebagian', 'Selesai Dicairkan'].includes(s.status)
      );
      setSubmissions(readyForDisb);

      // Collect all disbursement transactions
      const disbs: Disbursement[] = [];
      readyForDisb.forEach(s => {
        if (s.disbursements) {
          disbs.push(...s.disbursements);
        }
      });
      disbs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setDisbursementList(disbs);
    } catch (err) {
      console.error('Error loading disbursements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenDisburseModal = (sub: Submission) => {
    setSelectedSub(sub);
    const approved = Number(sub.approved_total);
    const alreadyDisbursed = Number(sub.disbursed_total);
    const remaining = Math.max(0, approved - alreadyDisbursed);

    setAmount(remaining); // Default to full remaining balance
    setRecipientName(sub.person_in_charge);
    setPaymentMethod('TRANSFER');
    setBankName('BSI (Bank Syariah Indonesia)');
    setAccountNumber('');
    setProofReference('');
    setNotes('');
    setShowModal(true);
  };

  const handleSaveDisbursement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub) return;

    if (!canDisburse) {
      alert('Hanya Bagian Pengeluaran atau Administrator yang memiliki hak mencatat pencairan dana.');
      return;
    }

    if (amount <= 0) {
      alert('Nominal pencairan harus lebih besar dari Rp0.');
      return;
    }

    const approved = Number(selectedSub.approved_total);
    const alreadyDisbursed = Number(selectedSub.disbursed_total);
    const remaining = approved - alreadyDisbursed;

    if (amount > remaining) {
      alert(`Nominal pencairan melebihi kuota sisa yang belum dicairkan (Maksimal: Rp${remaining.toLocaleString('id-ID')}).`);
      return;
    }

    if (!recipientName.trim()) {
      alert('Nama penerima pencairan wajib diisi.');
      return;
    }

    setSaving(true);
    try {
      await databaseService.recordDisbursement({
        submissionId: selectedSub.id,
        amount: amount,
        paymentMethod: paymentMethod,
        bankName: paymentMethod === 'TRANSFER' ? bankName : undefined,
        accountNumber: paymentMethod === 'TRANSFER' ? accountNumber : undefined,
        recipientName: recipientName,
        proofReference: proofReference,
        notes: notes,
        actorName: currentUser?.full_name || 'Petugas Pengeluaran',
        actorRole: currentUser?.role || 'PENGELUARAN'
      });

      alert(`Pencairan sebesar Rp${amount.toLocaleString('id-ID')} berhasil dicatat!`);
      setShowModal(false);
      setSelectedSub(null);
      await loadData();
    } catch (err: any) {
      alert(`Gagal mencatat pencairan: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-finance-navy">Pencairan Dana (Bagian Pengeluaran)</h1>
          <p className="text-xs text-slate-500">
            Pencatatan realisasi pengeluaran kas/bank bertahap dengan validasi batas persetujuan.
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

      {/* Submissions Ready for Disbursement */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-finance-blue" />
            <h2 className="text-sm font-bold text-finance-navy">
              Daftar Kuota Pencairan Berkas Disetujui
            </h2>
          </div>
          <span className="text-xs text-slate-500">Mendukung Pencairan Bertahap</span>
        </div>

        {submissions.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Belum ada berkas yang disetujui untuk dicairkan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Nomor Pengajuan</th>
                  <th className="px-3 py-3">Unit</th>
                  <th className="px-4 py-3">Kegiatan</th>
                  <th className="px-4 py-3 text-right">Disetujui</th>
                  <th className="px-4 py-3 text-right">Sudah Dicairkan</th>
                  <th className="px-4 py-3 text-right">Belum Dicairkan</th>
                  <th className="px-3 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {submissions.map((sub) => {
                  const approved = Number(sub.approved_total);
                  const disbursed = Number(sub.disbursed_total);
                  const remaining = Math.max(0, approved - disbursed);
                  const isDone = remaining <= 0;

                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-mono font-bold text-slate-900">{sub.submission_number}</div>
                        <div className="text-[11px] text-slate-400">{sub.submission_date}</div>
                      </td>
                      <td className="px-3 py-3 font-semibold text-slate-800">{sub.unit_name}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{sub.activity_name}</div>
                        <div className="text-[11px] text-slate-400">PJ: {sub.person_in_charge}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-sky-800">
                        Rp{approved.toLocaleString('id-ID')}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-finance-navy">
                        Rp{disbursed.toLocaleString('id-ID')}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-orange-700">
                        Rp{remaining.toLocaleString('id-ID')}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <StatusBadge status={sub.status} size="sm" />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {!isDone ? (
                            <button
                              onClick={() => handleOpenDisburseModal(sub)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-finance-blue hover:bg-finance-blueHover rounded shadow-sm"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>Cairkan Dana</span>
                            </button>
                          ) : (
                            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                              Lunas / Selesai
                            </span>
                          )}

                          <button
                            onClick={() => onNavigate('reports', { submissionId: sub.id })}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded border border-slate-200"
                            title="Buka Laporan"
                          >
                            <FileText className="w-3.5 h-3.5" />
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

      {/* History of Recorded Disbursements */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-700" />
            <h2 className="text-sm font-bold text-finance-navy">
              Riwayat Transaksi Realisasi Pengeluaran Kas/Bank
            </h2>
          </div>
          <span className="text-xs text-slate-500">{disbursementList.length} Transaksi Tercatat</span>
        </div>

        {disbursementList.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Belum ada riwayat transaksi pencairan yang dicatat.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">No. Transaksi</th>
                  <th className="px-3 py-3">Tanggal</th>
                  <th className="px-4 py-3 text-right">Nominal Realisasi</th>
                  <th className="px-3 py-3">Metode</th>
                  <th className="px-4 py-3">Penerima & Rekening</th>
                  <th className="px-4 py-3">Petugas Pengeluaran</th>
                  <th className="px-4 py-3">Bukti / No. Ref</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {disbursementList.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900">{d.transaction_number}</td>
                    <td className="px-3 py-3 text-slate-600 font-sans">{d.disbursement_date}</td>
                    <td className="px-4 py-3 text-right font-bold text-finance-navy">
                      Rp{Number(d.amount).toLocaleString('id-ID')}
                    </td>
                    <td className="px-3 py-3 font-sans">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        d.payment_method === 'TRANSFER'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {d.payment_method}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-sans">
                      <div className="font-semibold text-slate-800">{d.recipient_name}</div>
                      {d.bank_name && (
                        <div className="text-[11px] text-slate-500 font-mono">
                          {d.bank_name} {d.account_number ? `(${d.account_number})` : ''}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-sans text-slate-700">{d.officer_name}</td>
                    <td className="px-4 py-3 font-sans text-slate-500">
                      {d.proof_reference || d.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Disbursement Modal */}
      {showModal && selectedSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-4 sm:p-5 border border-slate-200 max-h-[92vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-finance-blue" />
                <h3 className="text-base font-bold text-finance-navy">Pencatatan Realisasi Pencairan</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDisbursement} className="py-4 space-y-3.5 text-xs">
              {/* Summary of Approved vs Disbursed vs Remaining */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5 font-mono">
                <div className="flex justify-between text-slate-600 font-sans">
                  <span>Nomor Pengajuan:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedSub.submission_number}</span>
                </div>
                <div className="flex justify-between text-slate-600 font-sans">
                  <span>Unit & Kegiatan:</span>
                  <span className="font-semibold text-slate-900">{selectedSub.unit_name} - {selectedSub.activity_name}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span className="font-sans text-slate-700">Total Disetujui:</span>
                  <span className="font-bold text-sky-800">Rp{Number(selectedSub.approved_total).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-sans text-slate-700">Sudah Dicairkan:</span>
                  <span className="font-bold text-finance-navy">Rp{Number(selectedSub.disbursed_total).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between font-bold text-orange-700 bg-orange-50 p-1.5 rounded">
                  <span className="font-sans">Sisa Kuota Belum Dicairkan:</span>
                  <span>Rp{(Number(selectedSub.approved_total) - Number(selectedSub.disbursed_total)).toLocaleString('id-ID')}</span>
                </div>
              </div>

              {/* Amount to Disburse */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Nominal Pencairan Transaksi Ini (Rp) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  max={Number(selectedSub.approved_total) - Number(selectedSub.disbursed_total)}
                  value={amount === 0 ? '' : amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  className="w-full text-sm font-bold font-mono text-finance-navy border border-slate-200 rounded-lg p-2.5 focus:ring-1 focus:ring-finance-blue"
                  required
                />
              </div>

              {/* Payment Method */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Metode Pembayaran</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white"
                  >
                    <option value="TRANSFER">Transfer Bank</option>
                    <option value="TUNAI">Kas Tunai</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nama Penerima</label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2"
                    required
                  />
                </div>
              </div>

              {paymentMethod === 'TRANSFER' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Bank Tujuan</label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-lg p-2"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nomor Rekening</label>
                    <input
                      type="text"
                      placeholder="Nomor rekening tujuan"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-lg p-2 font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Proof / Reference */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nomor Bukti / Kuitansi / Ref Transfer</label>
                <input
                  type="text"
                  placeholder="Contoh: BSI-TRX-98234 atau Kuitansi #04"
                  value={proofReference}
                  onChange={(e) => setProofReference(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Catatan Tambahan</label>
                <input
                  type="text"
                  placeholder="Keterangan pengeluaran..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-semibold text-white bg-finance-blue hover:bg-finance-blueHover rounded-lg transition-colors shadow-sm"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Transaksi Pencairan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
