import React, { useState, useEffect } from 'react';
import { databaseService } from '../lib/databaseService';
import { Submission, AuditLog } from '../types/database';
import { StatusBadge } from '../components/StatusBadge';
import {
  Archive,
  Search,
  Filter,
  FileText,
  Clock,
  ShieldCheck,
  RefreshCw,
  Eye,
  Download
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface ArchivePageProps {
  onNavigate: (tab: any, params?: any) => void;
}

export const ArchivePage: React.FC<ArchivePageProps> = ({ onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activeTab, setActiveTab] = useState<'SUBMISSIONS' | 'AUDIT_LOGS'>('SUBMISSIONS');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [subs, logs] = await Promise.all([
        databaseService.getSubmissions(),
        databaseService.getAuditLogs(100)
      ]);
      setSubmissions(subs);
      setAuditLogs(logs);
    } catch (err) {
      console.error('Error loading archive data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredSubs = submissions.filter(s => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.submission_number.toLowerCase().includes(q) ||
      s.activity_name.toLowerCase().includes(q) ||
      s.unit_name.toLowerCase().includes(q) ||
      s.person_in_charge.toLowerCase().includes(q)
    );
  });

  const filteredLogs = auditLogs.filter(l => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      l.action.toLowerCase().includes(q) ||
      l.user_name.toLowerCase().includes(q) ||
      (l.note && l.note.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-5 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-finance-navy">Arsip & Jejak Audit Lengkap</h1>
          <p className="text-xs text-slate-500">
            Penyimpanan permanen berkas pengajuan, persetujuan, dan catatan log integritas transaksi.
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

      {/* Tabs */}
      <div className="flex border-b border-slate-200 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('SUBMISSIONS')}
          className={`pb-2.5 px-4 border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'SUBMISSIONS'
              ? 'border-finance-blue text-finance-blue'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Archive className="w-4 h-4" />
          <span>Arsip Seluruh Berkas ({submissions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('AUDIT_LOGS')}
          className={`pb-2.5 px-4 border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'AUDIT_LOGS'
              ? 'border-finance-blue text-finance-blue'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Jejak Audit Keamanan ({auditLogs.length})</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative w-full sm:w-80">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Cari arsip atau log aktivitas..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-finance-blue bg-white"
        />
      </div>

      {/* Table Content */}
      {activeTab === 'SUBMISSIONS' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Nomor & Tanggal</th>
                  <th className="px-3 py-3">Unit</th>
                  <th className="px-4 py-3">Kegiatan</th>
                  <th className="px-4 py-3 text-right">Diajukan</th>
                  <th className="px-4 py-3 text-right">Disetujui</th>
                  <th className="px-4 py-3 text-right">Dicairkan</th>
                  <th className="px-3 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSubs.map((sub) => (
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
                    <td className="px-4 py-3 text-right font-mono text-slate-800">
                      Rp{Number(sub.original_total).toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-sky-800">
                      {sub.approved_total > 0 ? `Rp${Number(sub.approved_total).toLocaleString('id-ID')}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-finance-navy">
                      {sub.disbursed_total > 0 ? `Rp${Number(sub.disbursed_total).toLocaleString('id-ID')}` : '-'}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <StatusBadge status={sub.status} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => onNavigate('reports', { submissionId: sub.id })}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-finance-blue bg-blue-50 hover:bg-blue-100 rounded border border-blue-200"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Buka Lembar</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* AUDIT LOGS TABLE */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Waktu</th>
                  <th className="px-3 py-3">Pengguna</th>
                  <th className="px-3 py-3">Tindakan (Action)</th>
                  <th className="px-3 py-3">Entitas</th>
                  <th className="px-4 py-3">Catatan Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 text-slate-500 font-mono whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('id-ID')}
                    </td>
                    <td className="px-3 py-3 font-semibold text-slate-800 whitespace-nowrap">
                      {log.user_name}
                      <span className="block text-[10px] text-slate-400 font-normal">{log.user_role}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-mono text-[11px] font-bold text-finance-navy bg-slate-100 px-2 py-0.5 rounded">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-600 uppercase text-[11px] font-semibold">
                      {log.entity}
                    </td>
                    <td className="px-4 py-3 text-slate-800">
                      {log.note || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
