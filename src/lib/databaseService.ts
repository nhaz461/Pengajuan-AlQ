import { supabase } from './supabase';
import {
  Submission,
  SubmissionItem,
  AnalysisItem,
  Disbursement,
  Unit,
  FiscalYear,
  AuditLog,
  BackupLog,
  SubmissionStatus
} from '../types/database';

export const databaseService = {
  // =========================================================================
  // AUDIT LOGGING
  // =========================================================================
  async logAudit(params: {
    userName: string;
    userRole: string;
    action: string;
    entity: string;
    entityId?: string;
    oldValue?: any;
    newValue?: any;
    note?: string;
  }) {
    try {
      await supabase.from('audit_logs').insert([
        {
          user_name: params.userName,
          user_role: params.userRole,
          action: params.action,
          entity: params.entity,
          entity_id: params.entityId,
          old_value: params.oldValue ? JSON.stringify(params.oldValue) : null,
          new_value: params.newValue ? JSON.stringify(params.newValue) : null,
          note: params.note,
          ip_address: window.location.hostname
        }
      ]);
    } catch (err) {
      console.warn('Audit logging failed silently:', err);
    }
  },

  // =========================================================================
  // UNITS & FISCAL YEARS
  // =========================================================================
  async getUnits(): Promise<Unit[]> {
    const { data, error } = await supabase
      .from('units')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async createUnit(unit: Partial<Unit>, actorName: string): Promise<Unit> {
    const { data, error } = await supabase
      .from('units')
      .insert([unit])
      .select()
      .single();

    if (error) throw error;

    await this.logAudit({
      userName: actorName,
      userRole: 'ADMIN',
      action: 'CREATE_UNIT',
      entity: 'unit',
      entityId: data.id,
      newValue: data,
      note: `Unit baru dibuat: ${data.name} (${data.code})`
    });

    return data;
  },

  async getFiscalYears(): Promise<FiscalYear[]> {
    const { data, error } = await supabase
      .from('fiscal_years')
      .select('*')
      .order('year', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // =========================================================================
  // SUBMISSIONS
  // =========================================================================
  async getNextSubmissionNumber(unitCode: string, year: string): Promise<string> {
    const prefix = `PND/${year}/${unitCode}/`;
    const { data, error } = await supabase
      .from('submissions')
      .select('submission_number')
      .like('submission_number', `${prefix}%`)
      .order('submission_number', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return `${prefix}0001`;
    }

    const lastNumStr = data[0].submission_number.split('/').pop() || '0';
    const nextNum = parseInt(lastNumStr, 10) + 1;
    return `${prefix}${nextNum.toString().padStart(4, '0')}`;
  },

  async getSubmissions(filter?: {
    unitId?: string | null;
    status?: string;
    fiscalYear?: string;
    category?: string;
  }): Promise<Submission[]> {
    let query = supabase
      .from('submissions')
      .select(`
        *,
        items:submission_items(*),
        analysis_items:analysis_items(*),
        disbursements:disbursements(*)
      `)
      .order('created_at', { ascending: false });

    if (filter?.unitId) {
      query = query.eq('unit_id', filter.unitId);
    }
    if (filter?.status && filter.status !== 'ALL') {
      query = query.eq('status', filter.status);
    }
    if (filter?.fiscalYear && filter.fiscalYear !== 'ALL') {
      query = query.eq('fiscal_year', filter.fiscalYear);
    }
    if (filter?.category && filter.category !== 'ALL') {
      query = query.eq('category', filter.category);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getSubmissionById(id: string): Promise<Submission | null> {
    const { data, error } = await supabase
      .from('submissions')
      .select(`
        *,
        items:submission_items(*),
        analysis_items:analysis_items(*),
        disbursements:disbursements(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  // Create submission + items
  async createSubmission(
    submissionData: Omit<Submission, 'id' | 'created_at' | 'updated_at' | 'original_total' | 'approved_total' | 'disbursed_total' | 'remaining_total'>,
    items: Omit<SubmissionItem, 'id' | 'submission_id'>[],
    actorName: string,
    actorRole: string
  ): Promise<Submission> {
    const calculatedTotal = items.reduce((sum, item) => sum + Number(item.total_amount), 0);

    const { data: submission, error: subError } = await supabase
      .from('submissions')
      .insert([
        {
          ...submissionData,
          original_total: calculatedTotal,
          approved_total: 0,
          disbursed_total: 0,
          remaining_total: 0,
          status: submissionData.status || 'Draft',
          submitted_at: submissionData.status === 'Diajukan' ? new Date().toISOString() : null
        }
      ])
      .select()
      .single();

    if (subError) throw subError;

    // Insert items
    if (items.length > 0) {
      const itemsToInsert = items.map((item, idx) => ({
        submission_id: submission.id,
        item_number: idx + 1,
        category: item.category,
        item_name: item.item_name,
        unit_price: Number(item.unit_price),
        volume: Number(item.volume),
        unit: item.unit,
        total_amount: Number(item.total_amount),
        notes: item.notes || null,
        multi_factors: item.multi_factors ? JSON.stringify(item.multi_factors) : '[]',
        ssh_item_id: item.ssh_item_id || null,
        ssh_status: item.ssh_status || 'BELUM_DITEMUKAN',
        ssh_price: item.ssh_price || null,
        ssh_diff: item.ssh_diff || null
      }));

      const { error: itemsError } = await supabase
        .from('submission_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;
    }

    await this.logAudit({
      userName: actorName,
      userRole: actorRole,
      action: submission.status === 'Draft' ? 'CREATE_DRAFT' : 'SUBMIT_APPLICATION',
      entity: 'submission',
      entityId: submission.id,
      newValue: { ...submission, items_count: items.length },
      note: `${submission.status === 'Draft' ? 'Draft' : 'Pengajuan'} dibuat: ${submission.submission_number} (${submission.activity_name}) - Total Rp${calculatedTotal.toLocaleString('id-ID')}`
    });

    return submission;
  },

  // Update draft submission & items
  async updateDraft(
    submissionId: string,
    submissionData: Partial<Submission>,
    items: Omit<SubmissionItem, 'id' | 'submission_id'>[],
    actorName: string,
    actorRole: string
  ): Promise<void> {
    const existing = await this.getSubmissionById(submissionId);
    if (!existing) throw new Error('Pengajuan tidak ditemukan');
    if (existing.status !== 'Draft') {
      throw new Error('Pengajuan tidak dapat diedit karena sudah diajukan atau dalam proses.');
    }

    const calculatedTotal = items.reduce((sum, item) => sum + Number(item.total_amount), 0);

    const { error: updateError } = await supabase
      .from('submissions')
      .update({
        activity_name: submissionData.activity_name,
        category: submissionData.category,
        person_in_charge: submissionData.person_in_charge,
        notes: submissionData.notes,
        original_total: calculatedTotal,
        updated_at: new Date().toISOString()
      })
      .eq('id', submissionId);

    if (updateError) throw updateError;

    // Delete old items and insert fresh
    await supabase.from('submission_items').delete().eq('submission_id', submissionId);

    if (items.length > 0) {
      const itemsToInsert = items.map((item, idx) => ({
        submission_id: submissionId,
        item_number: idx + 1,
        category: item.category,
        item_name: item.item_name,
        unit_price: Number(item.unit_price),
        volume: Number(item.volume),
        unit: item.unit,
        total_amount: Number(item.total_amount),
        notes: item.notes || null,
        multi_factors: item.multi_factors ? JSON.stringify(item.multi_factors) : '[]',
        ssh_item_id: item.ssh_item_id || null,
        ssh_status: item.ssh_status || 'BELUM_DITEMUKAN',
        ssh_price: item.ssh_price || null,
        ssh_diff: item.ssh_diff || null
      }));

      await supabase.from('submission_items').insert(itemsToInsert);
    }

    await this.logAudit({
      userName: actorName,
      userRole: actorRole,
      action: 'UPDATE_DRAFT',
      entity: 'submission',
      entityId: submissionId,
      oldValue: { original_total: existing.original_total },
      newValue: { original_total: calculatedTotal, items_count: items.length },
      note: `Draft diperbarui: ${existing.submission_number}`
    });
  },

  // Delete draft
  async deleteDraft(submissionId: string, actorName: string, actorRole: string): Promise<void> {
    const existing = await this.getSubmissionById(submissionId);
    if (!existing) throw new Error('Pengajuan tidak ditemukan');
    if (existing.status !== 'Draft') {
      throw new Error('Hanya draft yang dapat dihapus. Pengajuan yang sudah diajukan tidak boleh dihapus.');
    }

    const { error } = await supabase
      .from('submissions')
      .delete()
      .eq('id', submissionId);

    if (error) throw error;

    await this.logAudit({
      userName: actorName,
      userRole: actorRole,
      action: 'DELETE_DRAFT',
      entity: 'submission',
      entityId: submissionId,
      oldValue: existing,
      note: `Draft dihapus secara permanen: ${existing.submission_number}`
    });
  },

  // Submit draft to 'Diajukan'
  async submitDraft(submissionId: string, actorName: string, actorRole: string): Promise<void> {
    const existing = await this.getSubmissionById(submissionId);
    if (!existing) throw new Error('Pengajuan tidak ditemukan');
    if (existing.status !== 'Draft') {
      throw new Error('Status pengajuan bukan Draft.');
    }

    const now = new Date().toISOString();
    const { error } = await supabase
      .from('submissions')
      .update({
        status: 'Diajukan',
        submitted_by: actorName,
        submitted_at: now,
        updated_at: now
      })
      .eq('id', submissionId);

    if (error) throw error;

    await this.logAudit({
      userName: actorName,
      userRole: actorRole,
      action: 'SUBMIT_DRAFT',
      entity: 'submission',
      entityId: submissionId,
      oldValue: { status: 'Draft' },
      newValue: { status: 'Diajukan' },
      note: `Pengajuan resmi diajukan ke Bendahara: ${existing.submission_number}`
    });
  },

  // =========================================================================
  // BENDAHARA ANALYSIS & DRAFT ANGGARAN SIAP DICAIRKAN (Section D, E, G)
  // Original items remain intact in submission_items;
  // Finalized items saved into analysis_items.
  // =========================================================================
  async saveAnalysis(params: {
    submissionId: string;
    analysisItems: Omit<AnalysisItem, 'id' | 'submission_id'>[];
    treasurerNotes: string;
    saveToDraftSiapDicairkan: boolean;
    actorName: string;
    actorRole: string;
  }): Promise<void> {
    const { submissionId, analysisItems, treasurerNotes, saveToDraftSiapDicairkan, actorName, actorRole } = params;

    const existing = await this.getSubmissionById(submissionId);
    if (!existing) throw new Error('Pengajuan tidak ditemukan');

    // Calculate approved_total only from KEPT, MODIFIED, and ADDED items (exclude REMOVED)
    const approvedTotal = analysisItems
      .filter(item => item.item_type !== 'REMOVED')
      .reduce((sum, item) => sum + Number(item.total_amount), 0);

    const newStatus: SubmissionStatus = saveToDraftSiapDicairkan ? 'Draft Siap Dicairkan' : 'Sedang Dianalisis';
    const now = new Date().toISOString();

    // 1. Delete previous analysis items for this submission to maintain clean idempotent state
    await supabase.from('analysis_items').delete().eq('submission_id', submissionId);

    // 2. Insert new analyzed items with dynamic multi-factors and SSH check status
    if (analysisItems.length > 0) {
      const recordsToInsert = analysisItems.map((item, idx) => ({
        submission_id: submissionId,
        original_item_id: item.original_item_id || null,
        item_type: item.item_type,
        category: item.category,
        item_name: item.item_name,
        unit_price: Number(item.unit_price),
        volume: Number(item.volume),
        unit: item.unit,
        total_amount: item.item_type === 'REMOVED' ? 0 : Number(item.total_amount),
        multi_factors: item.multi_factors ? JSON.stringify(item.multi_factors) : '[]',
        change_reason: item.change_reason || null,
        treasurer_notes: item.treasurer_notes || null,
        ssh_item_id: item.ssh_item_id || null,
        ssh_status: item.ssh_status || 'BELUM_DITEMUKAN',
        ssh_price: item.ssh_price || null,
        ssh_diff: item.ssh_diff || null,
        sort_order: idx + 1
      }));

      const { error: itemsError } = await supabase
        .from('analysis_items')
        .insert(recordsToInsert);

      if (itemsError) throw itemsError;
    }

    // 3. Update submission header
    const diff = Number(existing.original_total) - approvedTotal;

    const { error: subError } = await supabase
      .from('submissions')
      .update({
        status: newStatus,
        approved_total: approvedTotal,
        remaining_total: approvedTotal - Number(existing.disbursed_total),
        treasurer_notes: treasurerNotes,
        analyzed_by: actorName,
        analyzed_at: now,
        updated_at: now
      })
      .eq('id', submissionId);

    if (subError) throw subError;

    const pct = existing.original_total > 0 ? ((approvedTotal / existing.original_total) * 100).toFixed(1) : '0';

    await this.logAudit({
      userName: actorName,
      userRole: actorRole,
      action: saveToDraftSiapDicairkan ? 'SET_DRAFT_SIAP_DICAIRKAN' : 'SAVE_ANALYSIS_DRAFT',
      entity: 'submission',
      entityId: submissionId,
      oldValue: { status: existing.status, approved_total: existing.approved_total },
      newValue: { status: newStatus, approved_total: approvedTotal, selisih: diff, persentase: pct },
      note: saveToDraftSiapDicairkan
        ? `Draft Anggaran Siap Dicairkan ditetapkan: ${existing.submission_number} sebesar Rp${approvedTotal.toLocaleString('id-ID')} (Selisih: Rp${diff.toLocaleString('id-ID')})`
        : `Draft analisis bendahara disimpan: ${existing.submission_number}`
    });
  },

  // Approve submission
  async approveSubmission(submissionId: string, notes: string, actorName: string, actorRole: string): Promise<void> {
    const existing = await this.getSubmissionById(submissionId);
    if (!existing) throw new Error('Pengajuan tidak ditemukan');
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('submissions')
      .update({
        status: 'Draft Siap Dicairkan',
        approved_by: actorName,
        approved_at: now,
        notes: notes ? `${existing.notes || ''} [Persetujuan: ${notes}]` : existing.notes,
        updated_at: now
      })
      .eq('id', submissionId);
    if (error) throw error;
    await this.logAudit({
      userName: actorName,
      userRole: actorRole,
      action: 'APPROVE_SUBMISSION',
      entity: 'submission',
      entityId: submissionId,
      newValue: { status: 'Draft Siap Dicairkan' },
      note: `Pengajuan disetujui: ${existing.submission_number}`
    });
  },

  // Reject submission
  async rejectSubmission(submissionId: string, notes: string, actorName: string, actorRole: string): Promise<void> {
    const existing = await this.getSubmissionById(submissionId);
    if (!existing) throw new Error('Pengajuan tidak ditemukan');
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('submissions')
      .update({
        status: 'Ditolak',
        rejection_reason: notes,
        updated_at: now
      })
      .eq('id', submissionId);
    if (error) throw error;
    await this.logAudit({
      userName: actorName,
      userRole: actorRole,
      action: 'REJECT_SUBMISSION',
      entity: 'submission',
      entityId: submissionId,
      newValue: { status: 'Ditolak', rejection_reason: notes },
      note: `Pengajuan ditolak: ${existing.submission_number} (Alasan: ${notes})`
    });
  },

  // Record actual payment disbursement
  async recordDisbursement(params: {
    submissionId: string;
    amount: number;
    paymentMethod: 'TRANSFER' | 'TUNAI';
    bankName?: string;
    accountNumber?: string;
    recipientName: string;
    proofReference?: string;
    notes?: string;
    actorName: string;
    actorRole: string;
  }): Promise<Disbursement> {
    const { submissionId, amount, paymentMethod, bankName, accountNumber, recipientName, proofReference, notes, actorName, actorRole } = params;

    const existing = await this.getSubmissionById(submissionId);
    if (!existing) throw new Error('Pengajuan tidak ditemukan');

    const currentDisbursed = Number(existing.disbursed_total);
    const approvedTotal = Number(existing.approved_total);
    const newTotalDisbursed = currentDisbursed + amount;

    if (newTotalDisbursed > approvedTotal) {
      const allowed = approvedTotal - currentDisbursed;
      throw new Error(`Total pencairan melebihi nominal disetujui! Sisa yang boleh dicairkan: Rp${allowed.toLocaleString('id-ID')}, permintaan: Rp${amount.toLocaleString('id-ID')}`);
    }

    const currentYear = new Date().getFullYear().toString();
    const trxNumber = `TRX/DISB/${currentYear}/${Date.now().toString().slice(-4)}`;

    const { data: disb, error: disbError } = await supabase
      .from('disbursements')
      .insert([
        {
          submission_id: submissionId,
          transaction_number: trxNumber,
          disbursement_date: new Date().toISOString().split('T')[0],
          amount: amount,
          payment_method: paymentMethod,
          bank_name: bankName || null,
          account_number: accountNumber || null,
          recipient_name: recipientName,
          proof_reference: proofReference || null,
          officer_name: actorName,
          notes: notes || null
        }
      ])
      .select()
      .single();

    if (disbError) throw disbError;

    const remainingTotal = approvedTotal - newTotalDisbursed;
    const newStatus: SubmissionStatus = remainingTotal <= 0 ? 'Selesai Dicairkan' : 'Dicairkan Sebagian';

    await supabase
      .from('submissions')
      .update({
        status: newStatus,
        disbursed_total: newTotalDisbursed,
        remaining_total: remainingTotal,
        updated_at: new Date().toISOString()
      })
      .eq('id', submissionId);

    await this.logAudit({
      userName: actorName,
      userRole: actorRole,
      action: 'RECORD_DISBURSEMENT',
      entity: 'disbursement',
      entityId: disb.id,
      newValue: { trx: trxNumber, amount: amount, status: newStatus },
      note: `Pencairan dana dicatat: ${trxNumber} sebesar Rp${amount.toLocaleString('id-ID')}`
    });

    return disb;
  },

  // =========================================================================
  // DASHBOARD AGGREGATIONS (Section I)
  // Exact calculations without double counting
  // =========================================================================
  async getDashboardStats(filter?: {
    fiscalYear?: string;
    unitId?: string | null;
    startDate?: string;
    endDate?: string;
    category?: string;
    status?: string;
  }) {
    let query = supabase.from('submissions').select('*');

    if (filter?.fiscalYear && filter.fiscalYear !== 'ALL') {
      query = query.eq('fiscal_year', filter.fiscalYear);
    }
    if (filter?.unitId) {
      query = query.eq('unit_id', filter.unitId);
    }
    if (filter?.startDate) {
      query = query.gte('submission_date', filter.startDate);
    }
    if (filter?.endDate) {
      query = query.lte('submission_date', filter.endDate);
    }
    if (filter?.category && filter.category !== 'ALL') {
      query = query.eq('category', filter.category);
    }
    if (filter?.status && filter.status !== 'ALL') {
      query = query.eq('status', filter.status);
    }

    const { data, error } = await query;
    if (error) throw error;

    const submissions = data || [];

    let totalCount = submissions.length;
    let totalDiajukan = 0;
    let totalHasilAnalisis = 0;
    let totalDraftSiapDicairkan = 0;
    let totalDicairkan = 0;
    let pendingAnalysisCount = 0;

    submissions.forEach(sub => {
      totalDiajukan += Number(sub.original_total || 0);

      if (['Sedang Dianalisis', 'Draft Siap Dicairkan', 'Disetujui', 'Siap Dicairkan', 'Dicairkan Sebagian', 'Selesai Dicairkan'].includes(sub.status)) {
        totalHasilAnalisis += Number(sub.approved_total || 0);
      }

      if (['Draft Siap Dicairkan', 'Disetujui', 'Siap Dicairkan', 'Dicairkan Sebagian', 'Selesai Dicairkan'].includes(sub.status)) {
        totalDraftSiapDicairkan += Number(sub.approved_total || 0);
        totalDicairkan += Number(sub.disbursed_total || 0);
      }

      if (sub.status === 'Diajukan') {
        pendingAnalysisCount++;
      }
    });

    const totalSelisih = totalDiajukan - totalHasilAnalisis;

    // Unit Recap
    const units = await this.getUnits();
    const unitRecap = units.map(unit => {
      const unitSubs = submissions.filter(s => s.unit_id === unit.id);
      let uDiajukan = 0;
      let uAnalisis = 0;
      let uSiapDicairkan = 0;
      let uDicairkan = 0;

      unitSubs.forEach(s => {
        uDiajukan += Number(s.original_total || 0);
        if (['Sedang Dianalisis', 'Draft Siap Dicairkan', 'Disetujui', 'Siap Dicairkan', 'Dicairkan Sebagian', 'Selesai Dicairkan'].includes(s.status)) {
          uAnalisis += Number(s.approved_total || 0);
        }
        if (['Draft Siap Dicairkan', 'Disetujui', 'Siap Dicairkan', 'Dicairkan Sebagian', 'Selesai Dicairkan'].includes(s.status)) {
          uSiapDicairkan += Number(s.approved_total || 0);
          uDicairkan += Number(s.disbursed_total || 0);
        }
      });

      return {
        unitId: unit.id,
        unitCode: unit.code,
        unitName: unit.name,
        count: unitSubs.length,
        totalDiajukan: uDiajukan,
        totalHasilAnalisis: uAnalisis,
        totalSiapDicairkan: uSiapDicairkan,
        totalDicairkan: uDicairkan,
        belumDicairkan: Math.max(0, uSiapDicairkan - uDicairkan),
        selisih: uDiajukan - uAnalisis
      };
    });

    return {
      totalCount,
      totalDiajukan,
      totalHasilAnalisis,
      totalDraftSiapDicairkan,
      totalDisetujui: totalDraftSiapDicairkan,
      totalDicairkan,
      totalBelumDicairkan: Math.max(0, totalDraftSiapDicairkan - totalDicairkan),
      totalSelisih,
      pendingAnalysisCount,
      unitRecap,
      submissions
    };
  },

  async getAuditLogs(limit = 100): Promise<AuditLog[]> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  async getBackupLogs(): Promise<BackupLog[]> {
    const { data, error } = await supabase
      .from('backup_logs')
      .select('*')
      .order('backup_date', { ascending: false });

    if (error) throw error;
    return data || [];
  }
};
