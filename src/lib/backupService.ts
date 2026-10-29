import { supabase } from './supabase';
import { databaseService } from './databaseService';
import { BackupLog } from '../types/database';

export interface BackupDataPayload {
  manifest: {
    backup_number: string;
    version: string;
    created_at: string;
    system: string;
    destination: string;
    record_counts: {
      units: number;
      app_users: number;
      submissions: number;
      submission_items: number;
      analysis_items: number;
      disbursements: number;
      audit_logs: number;
    };
    total_records: number;
    checksum_sha256?: string;
  };
  data: {
    units: any[];
    app_users: any[];
    submissions: any[];
    submission_items: any[];
    analysis_items: any[];
    disbursements: any[];
    audit_logs: any[];
    fund_app_settings: any[];
  };
}

export const backupService = {
  // Compute simple SHA-256 in browser using Web Crypto API
  async computeChecksum(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  // Perform full database backup
  async performBackup(actorName: string, destination: 'EXTERNAL_STORAGE' | 'LOCAL_ARCHIVE' | 'DOWNLOAD' = 'DOWNLOAD'): Promise<{ log: BackupLog; payload: BackupDataPayload }> {
    try {
      const timestamp = new Date().toISOString();
      const backupNumber = `BKP-${Date.now()}`;
      const fileName = `Backup_Yayasan_AlQuraniyyah_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

      // Fetch all required tables
      const [unitsRes, usersRes, subsRes, itemsRes, analysisRes, disbRes, auditRes, settingsRes] = await Promise.all([
        supabase.from('units').select('*'),
        supabase.from('app_users').select('*'),
        supabase.from('submissions').select('*'),
        supabase.from('submission_items').select('*'),
        supabase.from('analysis_items').select('*'),
        supabase.from('disbursements').select('*'),
        supabase.from('audit_logs').select('*'),
        supabase.from('fund_app_settings').select('*')
      ]);

      const units = unitsRes.data || [];
      const app_users = usersRes.data || [];
      const submissions = subsRes.data || [];
      const submission_items = itemsRes.data || [];
      const analysis_items = analysisRes.data || [];
      const disbursements = disbRes.data || [];
      const audit_logs = auditRes.data || [];
      const fund_app_settings = settingsRes.data || [];

      const recordCounts = {
        units: units.length,
        app_users: app_users.length,
        submissions: submissions.length,
        submission_items: submission_items.length,
        analysis_items: analysis_items.length,
        disbursements: disbursements.length,
        audit_logs: audit_logs.length
      };

      const totalRecords = Object.values(recordCounts).reduce((a, b) => a + b, 0);

      const payload: BackupDataPayload = {
        manifest: {
          backup_number: backupNumber,
          version: '1.0.0',
          created_at: timestamp,
          system: "Sistem Pengajuan & Analisis Pencairan Dana Al-Qur'aniyyah",
          destination: destination,
          record_counts: recordCounts,
          total_records: totalRecords
        },
        data: {
          units,
          app_users,
          submissions,
          submission_items,
          analysis_items,
          disbursements,
          audit_logs,
          fund_app_settings
        }
      };

      // Calculate integrity checksum
      const rawJson = JSON.stringify(payload.data);
      const checksum = await this.computeChecksum(rawJson);
      payload.manifest.checksum_sha256 = checksum;

      const fullJson = JSON.stringify(payload, null, 2);
      const fileSizeBytes = new Blob([fullJson]).size;

      // Save log to Supabase backup_logs
      const { data: logData, error: logError } = await supabase
        .from('backup_logs')
        .insert([
          {
            backup_number: backupNumber,
            version: 'v1.0',
            backup_date: timestamp,
            file_name: fileName,
            file_size_bytes: fileSizeBytes,
            total_records: totalRecords,
            status: 'SUCCESS',
            destination: destination,
            checksum_sha256: checksum,
            metadata: payload.manifest
          }
        ])
        .select()
        .single();

      if (logError) {
        console.error('Error saving backup log:', logError);
      }

      // Log in audit trail
      await databaseService.logAudit({
        userName: actorName,
        userRole: 'ADMIN',
        action: 'BACKUP_DATABASE',
        entity: 'backup',
        entityId: backupNumber,
        newValue: { totalRecords, fileName, checksum },
        note: `Backup database berhasil dibuat: ${fileName} (${totalRecords} records)`
      });

      // Automatically trigger download of backup file
      const blob = new Blob([fullJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return {
        log: logData || {
          id: backupNumber,
          backup_number: backupNumber,
          version: 'v1.0',
          backup_date: timestamp,
          file_name: fileName,
          file_size_bytes: fileSizeBytes,
          total_records: totalRecords,
          status: 'SUCCESS',
          destination: destination,
          checksum_sha256: checksum,
          created_at: timestamp
        },
        payload
      };
    } catch (err: any) {
      // Record failed backup attempt in logs
      await supabase.from('backup_logs').insert([
        {
          backup_number: `BKP-FAIL-${Date.now()}`,
          version: 'v1.0',
          backup_date: new Date().toISOString(),
          file_name: 'NONE',
          file_size_bytes: 0,
          total_records: 0,
          status: 'FAILED',
          destination: destination,
          error_message: err.message
        }
      ]);

      await databaseService.logAudit({
        userName: actorName,
        userRole: 'ADMIN',
        action: 'BACKUP_FAILED',
        entity: 'backup',
        note: `Backup gagal: ${err.message}`
      });

      throw err;
    }
  },

  // Validate backup file before restore
  async validateBackupFile(file: File): Promise<{ isValid: boolean; payload?: BackupDataPayload; errors: string[] }> {
    const errors: string[] = [];
    try {
      const text = await file.text();
      const payload: BackupDataPayload = JSON.parse(text);

      if (!payload.manifest || !payload.data) {
        errors.push('Struktur file backup tidak valid (manifest atau data tidak ditemukan).');
        return { isValid: false, errors };
      }

      // Verify SHA256 checksum if provided
      if (payload.manifest.checksum_sha256) {
        const rawJson = JSON.stringify(payload.data);
        const calcChecksum = await this.computeChecksum(rawJson);
        if (calcChecksum !== payload.manifest.checksum_sha256) {
          errors.push('Integritas data rusak! Checksum SHA-256 tidak cocok dengan file backup.');
        }
      }

      // Check required entity arrays
      const requiredTables = ['submissions', 'submission_items', 'disbursements'];
      for (const t of requiredTables) {
        if (!Array.isArray((payload.data as any)[t])) {
          errors.push(`Tabel penting "${t}" tidak ditemukan dalam file backup.`);
        }
      }

      return {
        isValid: errors.length === 0,
        payload,
        errors
      };
    } catch (err: any) {
      return {
        isValid: false,
        errors: [`Format file tidak dapat dibaca: ${err.message}`]
      };
    }
  },

  // Restore database from valid backup payload
  // Safety rule: automatically creates a fresh backup of current state before applying restore!
  async restoreDatabase(payload: BackupDataPayload, actorName: string): Promise<{ success: boolean; restoredRecords: number }> {
    try {
      // 1. Create a safety snapshot of current state before restoring
      await this.performBackup(`${actorName} (Auto Safety Snapshot)`, 'EXTERNAL_STORAGE');

      const { data } = payload;
      let totalRestored = 0;

      // 2. Restore Submissions and Items
      if (data.submissions && data.submissions.length > 0) {
        for (const sub of data.submissions) {
          await supabase.from('submissions').upsert([sub], { onConflict: 'id' });
          totalRestored++;
        }
      }

      if (data.submission_items && data.submission_items.length > 0) {
        for (const item of data.submission_items) {
          await supabase.from('submission_items').upsert([item], { onConflict: 'id' });
          totalRestored++;
        }
      }

      if (data.analysis_items && data.analysis_items.length > 0) {
        for (const item of data.analysis_items) {
          await supabase.from('analysis_items').upsert([item], { onConflict: 'id' });
          totalRestored++;
        }
      }

      if (data.disbursements && data.disbursements.length > 0) {
        for (const disb of data.disbursements) {
          await supabase.from('disbursements').upsert([disb], { onConflict: 'id' });
          totalRestored++;
        }
      }

      // 3. Log restore operation
      await databaseService.logAudit({
        userName: actorName,
        userRole: 'ADMIN',
        action: 'RESTORE_DATABASE',
        entity: 'backup',
        entityId: payload.manifest.backup_number,
        newValue: { totalRestored, version: payload.manifest.version },
        note: `Database berhasil dipulihkan dari backup ${payload.manifest.backup_number} (${totalRestored} records restored)`
      });

      return { success: true, restoredRecords: totalRestored };
    } catch (err: any) {
      console.error('Error in restoreDatabase:', err);
      throw err;
    }
  }
};
