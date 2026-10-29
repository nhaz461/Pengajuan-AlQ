-- ==============================================================================
-- MIGRATION: MASTER SSH (STANDAR SATUAN HARGA) & ANALISIS MULTI-FAKTOR
-- YAYASAN PENDIDIKAN ISLAM AL-QUR'ANIYYAH
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.master_ssh (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode_ssh TEXT,
    kategori TEXT NOT NULL,
    nama_barang TEXT NOT NULL,
    satuan TEXT NOT NULL,
    harga_standar NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    tahun_berlaku TEXT DEFAULT '2026',
    keterangan TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_master_ssh_kategori ON public.master_ssh(kategori);
CREATE INDEX IF NOT EXISTS idx_master_ssh_nama ON public.master_ssh(nama_barang);
CREATE INDEX IF NOT EXISTS idx_master_ssh_tahun ON public.master_ssh(tahun_berlaku);

-- Add SSH checking columns to submission_items
ALTER TABLE public.submission_items 
ADD COLUMN IF NOT EXISTS ssh_item_id UUID REFERENCES public.master_ssh(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS ssh_status TEXT DEFAULT 'BELUM_DITEMUKAN', -- 'SESUAI', 'MELEBIHI', 'BELUM_DITEMUKAN'
ADD COLUMN IF NOT EXISTS ssh_price NUMERIC(15, 2),
ADD COLUMN IF NOT EXISTS ssh_diff NUMERIC(15, 2);

-- Add SSH checking columns to analysis_items
ALTER TABLE public.analysis_items 
ADD COLUMN IF NOT EXISTS ssh_item_id UUID REFERENCES public.master_ssh(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS ssh_status TEXT DEFAULT 'BELUM_DITEMUKAN', -- 'SESUAI', 'MELEBIHI', 'BELUM_DITEMUKAN'
ADD COLUMN IF NOT EXISTS ssh_price NUMERIC(15, 2),
ADD COLUMN IF NOT EXISTS ssh_diff NUMERIC(15, 2);

-- Update status check constraint on submissions to allow 'Draft Siap Dicairkan'
ALTER TABLE public.submissions DROP CONSTRAINT IF EXISTS submissions_status_check;
ALTER TABLE public.submissions ADD CONSTRAINT submissions_status_check CHECK (
    status IN (
        'Draft',
        'Diajukan',
        'Sedang Dianalisis',
        'Menunggu Persetujuan',
        'Draft Siap Dicairkan',
        'Disetujui',
        'Siap Dicairkan',
        'Dicairkan Sebagian',
        'Selesai Dicairkan',
        'Ditolak',
        'Dibatalkan'
    )
);

-- Enable RLS on master_ssh
ALTER TABLE public.master_ssh ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'master_ssh' AND policyname = 'Allow access to master_ssh') THEN
    CREATE POLICY "Allow access to master_ssh" ON public.master_ssh FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
