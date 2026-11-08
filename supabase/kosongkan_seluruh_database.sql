-- ==============================================================================
-- SKRIP RESET TOTAL DATABASE (KOSONGKAN SELURUH TABEL)
-- YAYASAN PENDIDIKAN ISLAM AL-QUR'ANIYYAH
-- ==============================================================================

TRUNCATE TABLE 
    public.disbursements,
    public.analysis_items,
    public.submission_items,
    public.submissions,
    public.audit_logs,
    public.backup_logs,
    public.master_ssh,
    public.app_users,
    public.units,
    public.fiscal_years,
    public.fund_app_settings
CASCADE;
