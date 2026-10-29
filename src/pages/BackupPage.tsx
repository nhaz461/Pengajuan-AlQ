import React, { useState, useEffect } from 'react';
import { databaseService } from '../lib/databaseService';
import { backupService, BackupDataPayload } from '../lib/backupService';
import { useAuth } from '../lib/authContext';
import { BackupLog } from '../types/database';
import {
  DatabaseBackup,
  Download,
  Upload,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  HardDrive,
  FileCheck,
  Server
} from 'lucide-react';

export const BackupPage: React.FC = () => {
  const { currentUser, canManageSettings } = useAuth();

  const [loading, setLoading] = useState(true);
  const [backupLogs, setBackupLogs] = useState<BackupLog[]>([]);
  const [backingUp, setBackingUp] = useState(false);
  const [backupSuccessMsg, setBackupSuccessMsg] = useState<string | null>(null);

  // Restore states
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [validating, setValidating] = useState(false);
  const [restorePayload, setRestorePayload] = useState<BackupDataPayload | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [restoring, setRestoring] = useState(false);
  const [restoreSuccessMsg, setRestoreSuccessMsg] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const logs = await databaseService.getBackupLogs();
      setBackupLogs(logs);
    } catch (err) {
      console.error('Error loading backup logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Trigger Backup Sekarang
  const handleBackupNow = async () => {
    setBackingUp(true);
    setBackupSuccessMsg(null);
    try {
      const result = await backupService.performBackup(
        currentUser?.full_name || 'Administrator Yayasan',
        'DOWNLOAD'
      );
      setBackupSuccessMsg(
        `Backup #${result.log.backup_number} berhasil dibuat! File cadangan otomatis diunduh ke perangkat Anda (${result.payload.manifest.total_records} record data terenkripsi dan terverifikasi checksum SHA-256).`
      );
      await loadData();
    } catch (err: any) {
      alert(`Backup gagal dilakukan: ${err.message}`);
    } finally {
      setBackingUp(false);
    }
  };

  // Select File for Restore
  const handleRestoreFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreFile(file);
    setValidating(true);
    setValidationErrors([]);
    setRestorePayload(null);
    setRestoreSuccessMsg(null);

    try {
      const validation = await backupService.validateBackupFile(file);
      if (validation.isValid && validation.payload) {
        setRestorePayload(validation.payload);
      } else {
        setValidationErrors(validation.errors);
      }
    } catch (err: any) {
      setValidationErrors([`File tidak dapat divalidasi: ${err.message}`]);
    } finally {
      setValidating(false);
    }
  };

  // Confirm and Execute Restore
  const handleExecuteRestore = async () => {
    if (!restorePayload) return;

    const confirmMsg =
      `PERINGATAN PEMULIHAN DATABASE!\n\n` +
      `Anda akan memulihkan data dari file backup #${restorePayload.manifest.backup_number} (${restorePayload.manifest.created_at}).\n` +
      `Sistem akan secara otomatis membuat backup kondisi terkini (Safety Snapshot) sebelum pemulihan diterapkan.\n\n` +
      `Apakah Anda yakin ingin melanjutkan proses pemulihan ini?`;

    if (!confirm(confirmMsg)) {
      return;
    }

    setRestoring(true);
    try {
      const res = await backupService.restoreDatabase(
        restorePayload,
        currentUser?.full_name || 'Administrator'
      );
      setRestoreSuccessMsg(
        `Pemulihan berhasil! Sebanyak ${res.restoredRecords} data transaksi berhasil dipulihkan dengan aman.`
      );
      setRestoreFile(null);
      setRestorePayload(null);
      await loadData();
    } catch (err: any) {
      alert(`Gagal memulihkan database: ${err.message}`);
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="space-y-5 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-finance-navy">Backup & Pemulihan Database</h1>
          <p className="text-xs text-slate-500">
            Pencadangan data berkala dan pemulihan darurat terpisah dari server utama Supabase.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Tombol Backup Sekarang (Section M) */}
          <button
            onClick={handleBackupNow}
            disabled={backingUp}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-finance-blue hover:bg-finance-blueHover rounded-lg transition-colors shadow-sm disabled:opacity-50"
          >
            <DatabaseBackup className={`w-4 h-4 ${backingUp ? 'animate-spin' : ''}`} />
            <span>{backingUp ? 'Memproses Backup...' : 'Backup Sekarang'}</span>
          </button>

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

      {/* Success Notification */}
      {backupSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3.5 rounded-xl text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{backupSuccessMsg}</span>
          </div>
          <button onClick={() => setBackupSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900 font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Architecture & Policy Information Banner */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="flex items-start gap-3">
          <Server className="w-6 h-6 text-finance-blue shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-slate-900">Database Utama</h3>
            <p className="text-slate-500 text-[11px] mt-0.5">
              Supabase PostgreSQL (AWS Cloud). Seluruh data transaksi tersimpan terenkripsi.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <HardDrive className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-slate-900">Penyimpanan Terpisah</h3>
            <p className="text-slate-500 text-[11px] mt-0.5">
              File backup disimpan di luar ekosistem Supabase, diverifikasi dengan SHA-256 Checksum.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <ShieldCheck className="w-6 h-6 text-purple-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-slate-900">Prosedur Keamanan Restore</h3>
            <p className="text-slate-500 text-[11px] mt-0.5">
              Snapshot otomatis dibuat sebelum restore diterapkan untuk mencegah kehilangan data berjalan.
            </p>
          </div>
        </div>
      </div>

      {/* Restore Workspace Card (Section M) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Upload className="w-4 h-4 text-finance-blue" />
          <h2 className="text-sm font-bold text-finance-navy">Prosedur Pemulihan Data (Restore Database)</h2>
        </div>

        <div className="text-xs text-slate-600">
          Unggah file backup <strong>(.json)</strong> resmi untuk memulihkan berkas pengajuan, item rancangan, dan data transaksi:
        </div>

        {/* File Drop Area */}
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-5 text-center bg-slate-50/50 hover:border-finance-blue transition-colors">
          <input
            type="file"
            id="restoreFileInput"
            accept=".json"
            onChange={handleRestoreFileSelected}
            className="hidden"
          />
          <label htmlFor="restoreFileInput" className="cursor-pointer flex flex-col items-center">
            <Upload className="w-8 h-8 text-slate-400 mb-1" />
            <span className="text-xs font-bold text-slate-800">
              {restoreFile ? restoreFile.name : 'Pilih File Backup JSON untuk Dipulihkan'}
            </span>
            <span className="text-[11px] text-slate-500 mt-0.5">
              File harus memuat manifest dan checksum integritas SHA-256 yang valid
            </span>
            <span className="mt-2.5 inline-block px-3 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg">
              Telusuri File
            </span>
          </label>
        </div>

        {validating && (
          <div className="text-center py-2 text-xs text-slate-500">
            Memeriksa format struktur dan memverifikasi integritas checksum SHA-256...
          </div>
        )}

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg text-xs space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span>File Backup Tidak Valid:</span>
            </div>
            <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
              {validationErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Validation Passed Preview */}
        {restorePayload && (
          <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between font-semibold text-finance-navy">
              <div className="flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                <span>File Valid: #{restorePayload.manifest.backup_number}</span>
              </div>
              <span className="text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded text-[10px]">
                Integritas Checksum Cocok
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-700">
              <div>Waktu Dibuat: <strong>{new Date(restorePayload.manifest.created_at).toLocaleString('id-ID')}</strong></div>
              <div>Versi Format: <strong>{restorePayload.manifest.version}</strong></div>
              <div>Total Records: <strong>{restorePayload.manifest.total_records}</strong></div>
              <div>Pengajuan: <strong>{restorePayload.manifest.record_counts.submissions} berkas</strong></div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                disabled={restoring}
                onClick={handleExecuteRestore}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
              >
                {restoring ? 'Memulihkan Data...' : 'Konfirmasi & Pulihkan Data Sekarang'}
              </button>
            </div>
          </div>
        )}

        {restoreSuccessMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3 rounded-lg text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{restoreSuccessMsg}</span>
          </div>
        )}
      </div>

      {/* Backup History Table (Section M) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-finance-blue" />
            <h2 className="text-sm font-bold text-finance-navy">
              Riwayat Cadangan Data (Backup Logs)
            </h2>
          </div>
          <span className="text-xs text-slate-500">{backupLogs.length} Catatan Backup</span>
        </div>

        {backupLogs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Belum ada riwayat backup database. Klik tombol "Backup Sekarang" untuk membuat cadangan pertama.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">No. Backup & Versi</th>
                  <th className="px-3 py-3">Waktu Pencadangan</th>
                  <th className="px-4 py-3">Nama Berkas</th>
                  <th className="px-3 py-3 text-center">Total Record</th>
                  <th className="px-3 py-3">Ukuran File</th>
                  <th className="px-3 py-3 text-center">Status</th>
                  <th className="px-4 py-3 font-mono">Checksum SHA-256</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {backupLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">
                      {log.backup_number}
                      <span className="block text-[10px] text-slate-400 font-normal">{log.version}</span>
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      {new Date(log.backup_date).toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-800 text-[11px]">
                      {log.file_name}
                    </td>
                    <td className="px-3 py-3 text-center font-bold text-slate-800 font-mono">
                      {log.total_records}
                    </td>
                    <td className="px-3 py-3 font-mono text-slate-600 text-[11px]">
                      {(log.file_size_bytes / 1024).toFixed(1)} KB
                    </td>
                    <td className="px-3 py-3 text-center">
                      {log.status === 'SUCCESS' ? (
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Berhasil
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                          Gagal
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-[10px] text-slate-400 truncate max-w-xs" title={log.checksum_sha256}>
                      {log.checksum_sha256 ? log.checksum_sha256.substring(0, 16) + '...' : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
