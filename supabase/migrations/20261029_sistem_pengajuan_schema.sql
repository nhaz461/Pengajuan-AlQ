-- ==============================================================================
-- SISTEM PENGAJUAN & ANALISIS PENCAIRAN DANA YAYASAN AL-QUR'ANIYYAH
-- PRODUCTION SCHEMA MIGRATION WITH ROW LEVEL SECURITY (RLS)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. APP USERS / PROFILES (Role-based access)
-- Roles: 'ADMIN', 'BENDAHARA', 'OPERATOR', 'PENGELUARAN'
CREATE TABLE IF NOT EXISTS public.app_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('ADMIN', 'BENDAHARA', 'OPERATOR', 'PENGELUARAN')),
    unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. FISCAL YEARS
CREATE TABLE IF NOT EXISTS public.fiscal_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. SUBMISSIONS (PENGAJUAN DANA)
CREATE TABLE IF NOT EXISTS public.submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_number TEXT NOT NULL UNIQUE,
    fiscal_year TEXT NOT NULL,
    submission_date DATE NOT NULL DEFAULT CURRENT_DATE,
    unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE RESTRICT,
    unit_name TEXT NOT NULL,
    activity_name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Operasional',
    person_in_charge TEXT NOT NULL,
    notes TEXT,
    excel_attachment_url TEXT,
    original_total NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    approved_total NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    disbursed_total NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    remaining_total NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'Draft' CHECK (
        status IN (
            'Draft',
            'Diajukan',
            'Sedang Dianalisis',
            'Menunggu Persetujuan',
            'Disetujui',
            'Siap Dicairkan',
            'Dicairkan Sebagian',
            'Selesai Dicairkan',
            'Ditolak',
            'Dibatalkan'
        )
    ),
    submitted_by TEXT,
    submitted_by_id UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
    submitted_at TIMESTAMPTZ,
    analyzed_by TEXT,
    analyzed_by_id UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
    analyzed_at TIMESTAMPTZ,
    approved_by TEXT,
    approved_by_id UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    treasurer_notes TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing for fast queries and consolidated reports
CREATE INDEX IF NOT EXISTS idx_submissions_unit_id ON public.submissions(unit_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_fiscal_year ON public.submissions(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_submissions_date ON public.submissions(submission_date);

-- 4. SUBMISSION ITEMS (RINCIAN ASLI PENGAJUAN)
CREATE TABLE IF NOT EXISTS public.submission_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
    item_number INT NOT NULL,
    category TEXT NOT NULL,
    item_name TEXT NOT NULL,
    unit_price NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    volume NUMERIC(10, 2) NOT NULL DEFAULT 1.00,
    unit TEXT NOT NULL DEFAULT 'Unit',
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    multi_factors JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_submission_items_submission_id ON public.submission_items(submission_id);

-- 5. SUBMISSION ANALYSES & ITEMS (ANALISIS FLEKSIBEL BENDAHARA)
CREATE TABLE IF NOT EXISTS public.analysis_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
    original_item_id UUID REFERENCES public.submission_items(id) ON DELETE SET NULL,
    item_type TEXT NOT NULL DEFAULT 'KEPT' CHECK (item_type IN ('KEPT', 'MODIFIED', 'ADDED', 'REMOVED')),
    category TEXT NOT NULL,
    item_name TEXT NOT NULL,
    unit_price NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    volume NUMERIC(10, 2) NOT NULL DEFAULT 1.00,
    unit TEXT NOT NULL DEFAULT 'Unit',
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    multi_factors JSONB DEFAULT '[]'::jsonb,
    change_reason TEXT,
    treasurer_notes TEXT,
    sort_order INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analysis_items_submission_id ON public.analysis_items(submission_id);

-- 6. DISBURSEMENTS (REALISASI PENCAIRAN BERTAHAP)
CREATE TABLE IF NOT EXISTS public.disbursements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
    transaction_number TEXT NOT NULL UNIQUE,
    disbursement_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    payment_method TEXT NOT NULL DEFAULT 'TRANSFER' CHECK (payment_method IN ('TRANSFER', 'TUNAI')),
    bank_name TEXT,
    account_number TEXT,
    recipient_name TEXT NOT NULL,
    proof_reference TEXT,
    officer_name TEXT NOT NULL,
    officer_id UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disbursements_submission_id ON public.disbursements(submission_id);

-- 7. AUDIT LOGS (JEJAK AUDIT LENGKAP)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT,
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id TEXT,
    old_value JSONB,
    new_value JSONB,
    note TEXT,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity, entity_id);

-- 8. BACKUP LOGS (RIWAYAT BACKUP & INTEGRITAS)
CREATE TABLE IF NOT EXISTS public.backup_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_number TEXT NOT NULL UNIQUE,
    version TEXT NOT NULL DEFAULT 'v1.0',
    backup_date TIMESTAMPTZ DEFAULT NOW(),
    file_name TEXT NOT NULL,
    file_size_bytes BIGINT DEFAULT 0,
    total_records INT DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'SUCCESS' CHECK (status IN ('SUCCESS', 'FAILED')),
    destination TEXT NOT NULL DEFAULT 'EXTERNAL_STORAGE',
    checksum_sha256 TEXT,
    metadata JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. APP SETTINGS (PENGATURAN UMUM APLIKASI PENGAJUAN)
CREATE TABLE IF NOT EXISTS public.fund_app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disbursements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fund_app_settings ENABLE ROW LEVEL SECURITY;

-- Allow access policies for client application
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'app_users' AND policyname = 'Allow access to app_users') THEN
    CREATE POLICY "Allow access to app_users" ON public.app_users FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fiscal_years' AND policyname = 'Allow access to fiscal_years') THEN
    CREATE POLICY "Allow access to fiscal_years" ON public.fiscal_years FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'submissions' AND policyname = 'Allow access to submissions') THEN
    CREATE POLICY "Allow access to submissions" ON public.submissions FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'submission_items' AND policyname = 'Allow access to submission_items') THEN
    CREATE POLICY "Allow access to submission_items" ON public.submission_items FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'analysis_items' AND policyname = 'Allow access to analysis_items') THEN
    CREATE POLICY "Allow access to analysis_items" ON public.analysis_items FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'disbursements' AND policyname = 'Allow access to disbursements') THEN
    CREATE POLICY "Allow access to disbursements" ON public.disbursements FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'audit_logs' AND policyname = 'Allow access to audit_logs') THEN
    CREATE POLICY "Allow access to audit_logs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'backup_logs' AND policyname = 'Allow access to backup_logs') THEN
    CREATE POLICY "Allow access to backup_logs" ON public.backup_logs FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fund_app_settings' AND policyname = 'Allow access to fund_app_settings') THEN
    CREATE POLICY "Allow access to fund_app_settings" ON public.fund_app_settings FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ==============================================================================
-- INITIAL SEED DATA
-- ==============================================================================

-- Seed Fiscal Years
INSERT INTO public.fiscal_years (year, is_active, notes)
VALUES
    ('2026', true, 'Tahun Anggaran Berjalan Yayasan 2026'),
    ('2025/2026', false, 'Tahun Ajaran 2025/2026'),
    ('2026/2027', false, 'Tahun Ajaran 2026/2027')
ON CONFLICT (year) DO NOTHING;

-- Seed Default App Users
INSERT INTO public.app_users (email, full_name, role, is_active)
VALUES
    ('admin@alquraniyyah.sch.id', 'Administrator Yayasan', 'ADMIN', true),
    ('bendahara@alquraniyyah.sch.id', 'Bendahara Umum Yayasan', 'BENDAHARA', true),
    ('pengeluaran@alquraniyyah.sch.id', 'Bagian Pengeluaran Yayasan', 'PENGELUARAN', true)
ON CONFLICT (email) DO NOTHING;

-- Link Operator SD IT
INSERT INTO public.app_users (email, full_name, role, unit_id, is_active)
SELECT 'operator.sdit@alquraniyyah.sch.id', 'Operator SD IT Al-Qur''aniyyah', 'OPERATOR', id, true
FROM public.units WHERE code = 'SDIT'
ON CONFLICT (email) DO NOTHING;

-- Link Operator SMP IT
INSERT INTO public.app_users (email, full_name, role, unit_id, is_active)
SELECT 'operator.smpit@alquraniyyah.sch.id', 'Operator SMP IT Al-Qur''aniyyah', 'OPERATOR', id, true
FROM public.units WHERE code = 'SMPIT'
ON CONFLICT (email) DO NOTHING;

-- Link Operator SMA IT
INSERT INTO public.app_users (email, full_name, role, unit_id, is_active)
SELECT 'operator.smait@alquraniyyah.sch.id', 'Operator SMA IT Al-Qur''aniyyah', 'OPERATOR', id, true
FROM public.units WHERE code = 'SMAIT'
ON CONFLICT (email) DO NOTHING;

-- Link Operator TK IT
INSERT INTO public.app_users (email, full_name, role, unit_id, is_active)
SELECT 'operator.tkit@alquraniyyah.sch.id', 'Operator TK IT Al-Qur''aniyyah', 'OPERATOR', id, true
FROM public.units WHERE code = 'TKIT'
ON CONFLICT (email) DO NOTHING;

-- Seed Settings
INSERT INTO public.fund_app_settings (key, value, description)
VALUES
    ('institution_profile', '{"name": "Yayasan Pendidikan Islam Pondok Pesantren Al-Qur''aniyyah", "address": "Komp. Pesantren Al-Qur''aniyyah, Manna, Bengkulu Selatan", "treasurer_name": "Bendahara Umum Yayasan", "head_name": "Ketua Yayasan Al-Qur''aniyyah"}', 'Profil Resmi Yayasan'),
    ('categories', '["Operasional Rutin", "Kegiatan & Pembinaan Santri", "Ujian & Kurikulum", "Honorarium & SDM", "Sarana Prasarana & Pembangunan", "Alat Tulis & Kantor (ATK)", "Lain-lain & Darurat"]', 'Kategori Standar Pengajuan Dana')
ON CONFLICT (key) DO NOTHING;
