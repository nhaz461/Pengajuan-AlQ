export type UserRole = 'ADMIN' | 'BENDAHARA' | 'OPERATOR' | 'PENGELUARAN';

export interface AppUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  unit_id: string | null;
  unit_name?: string;
  is_active: boolean;
  created_at: string;
}

export interface Unit {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
}

export interface FiscalYear {
  id: string;
  year: string;
  is_active: boolean;
  notes: string | null;
  created_at?: string;
}

export type SubmissionStatus =
  | 'Draft'
  | 'Diajukan'
  | 'Sedang Dianalisis'
  | 'Menunggu Persetujuan'
  | 'Disetujui'
  | 'Siap Dicairkan'
  | 'Dicairkan Sebagian'
  | 'Selesai Dicairkan'
  | 'Ditolak'
  | 'Dibatalkan';

export interface MultiFactor {
  id: string;
  name: string;    // e.g. "Mata Pelajaran", "Siswa", "Angkatan", "Hari", "Orang"
  value: number;   // e.g. 14, 100, 3, 5, 20
  satuan: string;  // e.g. "Mapel", "Siswa", "Kelas", "Hari", "Orang"
}

export interface SubmissionItem {
  id: string;
  submission_id?: string;
  item_number: number;
  category: string;
  item_name: string;
  unit_price: number;
  volume: number;
  unit: string;
  total_amount: number;
  notes?: string;
  multi_factors?: MultiFactor[];
  created_at?: string;
}

export type AnalysisItemType = 'KEPT' | 'MODIFIED' | 'ADDED' | 'REMOVED';

export interface AnalysisItem {
  id: string;
  submission_id?: string;
  original_item_id?: string | null;
  item_type: AnalysisItemType;
  category: string;
  item_name: string;
  unit_price: number;
  volume: number;
  unit: string;
  total_amount: number;
  multi_factors?: MultiFactor[];
  change_reason?: string;
  treasurer_notes?: string;
  sort_order?: number;
  created_at?: string;
}

export interface Submission {
  id: string;
  submission_number: string;
  fiscal_year: string;
  submission_date: string;
  unit_id: string;
  unit_name: string;
  activity_name: string;
  category: string;
  person_in_charge: string;
  notes?: string;
  excel_attachment_url?: string;
  original_total: number;
  approved_total: number;
  disbursed_total: number;
  remaining_total: number;
  status: SubmissionStatus;
  submitted_by?: string;
  submitted_by_id?: string;
  submitted_at?: string;
  analyzed_by?: string;
  analyzed_by_id?: string;
  analyzed_at?: string;
  approved_by?: string;
  approved_by_id?: string;
  approved_at?: string;
  treasurer_notes?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  items?: SubmissionItem[];
  analysis_items?: AnalysisItem[];
  disbursements?: Disbursement[];
}

export interface Disbursement {
  id: string;
  submission_id: string;
  transaction_number: string;
  disbursement_date: string;
  amount: number;
  payment_method: 'TRANSFER' | 'TUNAI';
  bank_name?: string;
  account_number?: string;
  recipient_name: string;
  proof_reference?: string;
  officer_name: string;
  officer_id?: string;
  notes?: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  user_name: string;
  user_role: string;
  action: string;
  entity: string;
  entity_id?: string;
  old_value?: any;
  new_value?: any;
  note?: string;
  ip_address?: string;
  created_at: string;
}

export interface BackupLog {
  id: string;
  backup_number: string;
  version: string;
  backup_date: string;
  file_name: string;
  file_size_bytes: number;
  total_records: number;
  status: 'SUCCESS' | 'FAILED';
  destination: string;
  checksum_sha256?: string;
  metadata?: any;
  error_message?: string;
  created_at: string;
}
