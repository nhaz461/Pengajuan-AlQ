import React, { useState, useEffect } from 'react';
import { databaseService } from '../lib/databaseService';
import { useAuth } from '../lib/authContext';
import { Submission } from '../types/database';
import { StatusBadge } from '../components/StatusBadge';
import {
  History,
  FileText,
  Search,
  RefreshCw,
  Eye,
  CheckCircle,
  Building
} from 'lucide-react';

interface OperatorHistoryPageProps {
  onNavigate: (tab: any, params?: any) => void;
}

export const OperatorHistoryPage: React.FC<OperatorHistoryPageProps> = ({ onNavigate }) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      // Strictly scoped to Operator's unit
      const all = await databaseService.getSubmissions({
        unitId: currentUser?.unit_id || undefined
      });
      setSubmissions(all);
    } catch (err) {
      console.error('Error loading operator history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const filteredSubs = submissions.filter(s => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.submission_number.toLowerCase().includes(q) ||
      s.activity_name.toLowerCase().includes(q) ||
      s.person_in_charge.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-finance-navy">
            Riwayat Pengajuan Unit {currentUser?.unit_name || ''}
          </h1>
          <p className="text-xs text-slate-500">
            Daftar seluruh berkas usulan belanja yang pernah diajukan oleh unit Anda dan status terkininya.
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

      {/* Search Input */}
      <div className="relative w-full sm:w-80">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Cari nomor pengajuan atau nama kegiatan..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-finance-blue bg-white"
        />
      </div>

      {/* History Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Memuat riwayat pengajuan unit...</div>
        ) : filteredSubs.length === 0 ? (
          <div className="p-12 text-center">
            <History className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <div className="text-sm font-semibold text-slate-700">Belum Ada Riwayat Pengajuan</div>
            <div className="text-xs text-slate-400 mt-1">
              Unit Anda belum memiliki berkas pengajuan. Klik menu "Pengajuan Dana" untuk membuat pengajuan baru.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Nomor & Tanggal</th>
                  <th className="px-4 py-3">Nama Kegiatan</th>
                  <th className="px-4 py-3 text-right">Total Diajukan</th>
                  <th className="px-4 py-3 text-right">Hasil Analisis Disetujui</th>
                  <th className="px-3 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Rincian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSubs.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-mono font-bold text-slate-900">{sub.submission_number}</div>
                      <div className="text-[11px] text-slate-400">{sub.submission_date} • TA {sub.fiscal_year}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{sub.activity_name}</div>
                      <div className="text-[11px] text-slate-400">
                        {sub.category} • PJ: {sub.person_in_charge}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">
                      Rp{Number(sub.original_total).toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-800">
                      {sub.approved_total > 0 ? `Rp${Number(sub.approved_total).toLocaleString('id-ID')}` : '-'}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <StatusBadge status={sub.status} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setSelectedSub(sub)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-finance-blue bg-blue-50 hover:bg-blue-100 rounded border border-blue-200"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Lihat Rincian</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Detail for Operator */}
      {selectedSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-5 border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-finance-blue" />
                <h3 className="text-base font-bold text-finance-navy">
                  Rincian Berkas: {selectedSub.submission_number}
                </h3>
              </div>
              <button onClick={() => setSelectedSub(null)} className="text-slate-400 text-xl font-bold">
                ✕
              </button>
            </div>

            <div className="py-4 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 grid grid-cols-2 gap-2">
                <div>Unit: <strong>{selectedSub.unit_name}</strong></div>
                <div>Tanggal: <strong>{selectedSub.submission_date}</strong></div>
                <div>Kegiatan: <strong>{selectedSub.activity_name}</strong></div>
                <div>Status: <StatusBadge status={selectedSub.status} size="sm" /></div>
              </div>

              {/* Original Items list */}
              <div>
                <div className="font-bold text-slate-800 mb-1.5">Rincian Barang / Biaya Awal yang Diajukan:</div>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-600 text-[10px] uppercase font-bold">
                      <tr>
                        <th className="px-3 py-2">No</th>
                        <th className="px-3 py-2">Uraian</th>
                        <th className="px-3 py-2 text-right">Harga</th>
                        <th className="px-3 py-2 text-center">Vol</th>
                        <th className="px-3 py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {selectedSub.items?.map((it, idx) => (
                        <tr key={it.id || idx}>
                          <td className="px-3 py-1.5 text-slate-400 font-sans">{idx + 1}</td>
                          <td className="px-3 py-1.5 font-sans font-medium text-slate-900">{it.item_name}</td>
                          <td className="px-3 py-1.5 text-right">Rp{Number(it.unit_price).toLocaleString('id-ID')}</td>
                          <td className="px-3 py-1.5 text-center font-sans">{it.volume} {it.unit}</td>
                          <td className="px-3 py-1.5 text-right font-bold text-slate-900">
                            Rp{Number(it.total_amount).toLocaleString('id-ID')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Show allowed analysis feedback if available */}
              {selectedSub.treasurer_notes && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs">
                  <div className="font-bold text-amber-900 mb-1">Catatan Bendahara Umum:</div>
                  <div className="text-slate-800 italic">{selectedSub.treasurer_notes}</div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedSub(null)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
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
