import React, { useState, useEffect } from 'react';
import { databaseService } from '../lib/databaseService';
import { useAuth } from '../lib/authContext';
import { Unit, FiscalYear, Submission } from '../types/database';
import { StatusBadge } from '../components/StatusBadge';
import {
  FileSpreadsheet,
  CheckCircle,
  Clock,
  TrendingDown,
  Building,
  Filter,
  RefreshCw,
  Wallet,
  ArrowUpRight,
  PieChart as PieIcon,
  ChevronRight,
  AlertCircle
} from 'lucide-react';

interface DashboardPageProps {
  onNavigate: (tab: any, params?: any) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { currentUser, canAccessUnit } = useAuth();

  const [loading, setLoading] = useState(true);
  const [units, setUnits] = useState<Unit[]>([]);
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  // Filters
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [selectedUnit, setSelectedUnit] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Consolidated stats state
  const [stats, setStats] = useState<{
    totalCount: number;
    totalDiajukan: number;
    totalDisetujui: number;
    totalDicairkan: number;
    totalBelumDicairkan: number;
    totalSelisih: number;
    pendingAnalysisCount: number;
    unitRecap: any[];
  }>({
    totalCount: 0,
    totalDiajukan: 0,
    totalDisetujui: 0,
    totalDicairkan: 0,
    totalBelumDicairkan: 0,
    totalSelisih: 0,
    pendingAnalysisCount: 0,
    unitRecap: []
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [unitsData, yearsData] = await Promise.all([
        databaseService.getUnits(),
        databaseService.getFiscalYears()
      ]);

      setUnits(unitsData);
      setFiscalYears(yearsData);

      // Determine unit filter according to RBAC
      let effectiveUnitId: string | null = null;
      if (currentUser?.role === 'OPERATOR') {
        effectiveUnitId = currentUser.unit_id;
        setSelectedUnit(currentUser.unit_id || 'ALL');
      } else if (selectedUnit !== 'ALL') {
        effectiveUnitId = selectedUnit;
      }

      const result = await databaseService.getDashboardStats({
        fiscalYear: selectedYear,
        unitId: effectiveUnitId,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        category: selectedCategory,
        status: selectedStatus
      });

      setStats({
        totalCount: result.totalCount,
        totalDiajukan: result.totalDiajukan,
        totalDisetujui: result.totalDisetujui,
        totalDicairkan: result.totalDicairkan,
        totalBelumDicairkan: result.totalBelumDicairkan,
        totalSelisih: result.totalSelisih,
        pendingAnalysisCount: result.pendingAnalysisCount,
        unitRecap: result.unitRecap
      });

      setSubmissions(result.submissions);
    } catch (err) {
      console.error('Error loading dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedYear, selectedUnit, selectedCategory, selectedStatus, startDate, endDate, currentUser]);

  const formatRupiah = (val: number) => {
    return 'Rp' + Number(val || 0).toLocaleString('id-ID');
  };

  const getPercent = (sub: number, base: number) => {
    if (!base || base === 0) return 0;
    return Math.min(100, Math.round((sub / base) * 100));
  };

  return (
    <div className="space-y-5 pb-16">
      {/* Header and Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-finance-navy">Dashboard Keuangan Yayasan</h1>
          <p className="text-xs text-slate-500">
            Monitoring real-time pengajuan, persetujuan bendahara, dan pencairan dana konsolidasi.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </button>

          <button
            onClick={() => onNavigate('submissions')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-finance-blue rounded-lg hover:bg-finance-blueHover transition-colors shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>+ Buat Pengajuan</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar (Section L) */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-finance-navy pb-1 border-b border-slate-100">
          <Filter className="w-3.5 h-3.5 text-finance-blue" />
          <span>Filter Konsolidasi</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* Fiscal Year */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Tahun Anggaran</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-finance-blue bg-white"
            >
              <option value="ALL">Semua Tahun</option>
              {fiscalYears.map((fy) => (
                <option key={fy.id} value={fy.year}>
                  {fy.year} {fy.is_active ? '(Aktif)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Unit Filter (Restricted for Operator) */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Unit Pemohon</label>
            <select
              value={selectedUnit}
              disabled={currentUser?.role === 'OPERATOR'}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-finance-blue bg-white disabled:bg-slate-50 disabled:text-slate-500"
            >
              {currentUser?.role !== 'OPERATOR' && <option value="ALL">Seluruh Unit</option>}
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.code} - {u.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Status Pengajuan</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-finance-blue bg-white"
            >
              <option value="ALL">Semua Status</option>
              <option value="Draft">Draft</option>
              <option value="Diajukan">Diajukan</option>
              <option value="Sedang Dianalisis">Sedang Dianalisis</option>
              <option value="Menunggu Persetujuan">Menunggu Persetujuan</option>
              <option value="Disetujui">Disetujui</option>
              <option value="Siap Dicairkan">Siap Dicairkan</option>
              <option value="Dicairkan Sebagian">Dicairkan Sebagian</option>
              <option value="Selesai Dicairkan">Selesai Dicairkan</option>
              <option value="Ditolak">Ditolak</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Kategori</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-finance-blue bg-white"
            >
              <option value="ALL">Semua Kategori</option>
              <option value="Operasional">Operasional Rutin</option>
              <option value="Kegiatan & Pembinaan Santri">Kegiatan Santri</option>
              <option value="Ujian & Kurikulum">Ujian & Kurikulum</option>
              <option value="Honorarium & SDM">Honorarium & SDM</option>
              <option value="Sarana Prasarana & Pembangunan">Sarpras & Bangunan</option>
              <option value="Lain-lain & Darurat">Lain-lain & Darurat</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Dari Tanggal</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg p-1.5 focus:ring-1 focus:ring-finance-blue bg-white"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Sampai Tanggal</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg p-1.5 focus:ring-1 focus:ring-finance-blue bg-white"
            />
          </div>
        </div>
      </div>

      {/* Small Statistic Cards in 2 columns on Mobile, 4 columns on Tablet/Desktop (Section C & L) */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* Card 1: Jumlah Pengajuan */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Pengajuan</span>
            <FileSpreadsheet className="w-4 h-4 text-finance-blue" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-finance-navy">{stats.totalCount}</div>
            <div className="text-[10px] text-slate-400">Total Berkas Terdata</div>
          </div>
        </div>

        {/* Card 2: Total Diajukan */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Total Diajukan</span>
            <ArrowUpRight className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2">
            <div className="text-sm font-bold text-finance-navy font-mono truncate" title={formatRupiah(stats.totalDiajukan)}>
              {formatRupiah(stats.totalDiajukan)}
            </div>
            <div className="text-[10px] text-slate-400">Nilai Awal Rincian Unit</div>
          </div>
        </div>

        {/* Card 3: Total Disetujui */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Total Disetujui</span>
            <CheckCircle className="w-4 h-4 text-sky-600" />
          </div>
          <div className="mt-2">
            <div className="text-sm font-bold text-sky-900 font-mono truncate" title={formatRupiah(stats.totalDisetujui)}>
              {formatRupiah(stats.totalDisetujui)}
            </div>
            <div className="text-[10px] text-sky-600 font-medium">
              {getPercent(stats.totalDisetujui, stats.totalDiajukan)}% dari pengajuan
            </div>
          </div>
        </div>

        {/* Card 4: Total Dicairkan */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Total Dicairkan</span>
            <Wallet className="w-4 h-4 text-finance-navy" />
          </div>
          <div className="mt-2">
            <div className="text-sm font-bold text-finance-navy font-mono truncate" title={formatRupiah(stats.totalDicairkan)}>
              {formatRupiah(stats.totalDicairkan)}
            </div>
            <div className="text-[10px] text-emerald-700 font-medium">
              {getPercent(stats.totalDicairkan, stats.totalDisetujui)}% terealisasi
            </div>
          </div>
        </div>

        {/* Card 5: Belum Dicairkan */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Belum Dicairkan</span>
            <Clock className="w-4 h-4 text-orange-500" />
          </div>
          <div className="mt-2">
            <div className="text-sm font-bold text-orange-700 font-mono truncate" title={formatRupiah(stats.totalBelumDicairkan)}>
              {formatRupiah(stats.totalBelumDicairkan)}
            </div>
            <div className="text-[10px] text-slate-400">Sisa Kuota Disetujui</div>
          </div>
        </div>

        {/* Card 6: Selisih (Efisiensi Analisis) */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Selisih Pengajuan</span>
            <TrendingDown className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2">
            <div className="text-sm font-bold text-indigo-900 font-mono truncate" title={formatRupiah(stats.totalSelisih)}>
              {formatRupiah(stats.totalSelisih)}
            </div>
            <div className="text-[10px] text-slate-400">Diajukan - Disetujui</div>
          </div>
        </div>

        {/* Card 7: Menunggu Analisis */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Menunggu Analisis</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-amber-600">{stats.pendingAnalysisCount}</div>
            <div className="text-[10px] text-slate-400">Butuh Review Bendahara</div>
          </div>
        </div>
      </div>

      {/* Rekap per Unit Table (Section L Required Table) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-finance-blue" />
            <h2 className="text-sm font-bold text-finance-navy">Rekap Realisasi Konsolidasi per Unit</h2>
          </div>
          <button
            onClick={() => onNavigate('unit-recap')}
            className="text-xs text-finance-blue hover:underline font-medium inline-flex items-center gap-1"
          >
            Lihat Rekap Penuh <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5">Unit</th>
                <th className="px-3 py-2.5 text-center">Jumlah Pengajuan</th>
                <th className="px-4 py-2.5 text-right">Total Diajukan</th>
                <th className="px-4 py-2.5 text-right">Total Disetujui</th>
                <th className="px-4 py-2.5 text-right">Total Dicairkan</th>
                <th className="px-4 py-2.5 text-right">Belum Dicairkan</th>
                <th className="px-4 py-2.5 text-right">Selisih</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {stats.unitRecap.map((recap) => (
                <tr key={recap.unitId} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-sans font-semibold text-slate-900 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-finance-blue"></span>
                    {recap.unitName}
                  </td>
                  <td className="px-3 py-3 text-center font-sans font-medium text-slate-700">
                    {recap.count}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-800">
                    {formatRupiah(recap.totalDiajukan)}
                  </td>
                  <td className="px-4 py-3 text-right text-sky-800 font-semibold">
                    {formatRupiah(recap.totalDisetujui)}
                  </td>
                  <td className="px-4 py-3 text-right text-finance-navy font-bold">
                    {formatRupiah(recap.totalDicairkan)}
                  </td>
                  <td className="px-4 py-3 text-right text-orange-700">
                    {formatRupiah(recap.belumDicairkan)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-500">
                    {formatRupiah(recap.selisih)}
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Total Summary Row */}
            <tfoot className="bg-slate-100/80 font-bold border-t-2 border-slate-200 font-mono">
              <tr>
                <td className="px-4 py-3 font-sans text-slate-900">TOTAL KONSOLIDASI</td>
                <td className="px-3 py-3 text-center font-sans">{stats.totalCount}</td>
                <td className="px-4 py-3 text-right text-slate-900">{formatRupiah(stats.totalDiajukan)}</td>
                <td className="px-4 py-3 text-right text-sky-900">{formatRupiah(stats.totalDisetujui)}</td>
                <td className="px-4 py-3 text-right text-finance-navy">{formatRupiah(stats.totalDicairkan)}</td>
                <td className="px-4 py-3 text-right text-orange-800">{formatRupiah(stats.totalBelumDicairkan)}</td>
                <td className="px-4 py-3 text-right text-slate-700">{formatRupiah(stats.totalSelisih)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Visual Progress / Ratio Comparison (Section L) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Progress 1: Rasio Persetujuan terhadap Pengajuan */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
            <span>Realisasi Persetujuan Anggaran</span>
            <span className="font-mono text-finance-blue font-bold">
              {getPercent(stats.totalDisetujui, stats.totalDiajukan)}% Disetujui
            </span>
          </div>

          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
            <div
              className="bg-finance-blue h-full transition-all duration-500"
              style={{ width: `${getPercent(stats.totalDisetujui, stats.totalDiajukan)}%` }}
              title="Disetujui"
            />
            <div
              className="bg-indigo-300 h-full transition-all duration-500"
              style={{ width: `${getPercent(stats.totalSelisih, stats.totalDiajukan)}%` }}
              title="Selisih / Efisiensi"
            />
          </div>

          <div className="flex justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-finance-blue"></span> Disetujui ({formatRupiah(stats.totalDisetujui)})
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-indigo-300"></span> Selisih/Efisiensi ({formatRupiah(stats.totalSelisih)})
            </span>
          </div>
        </div>

        {/* Progress 2: Rasio Pencairan Kas terhadap Persetujuan */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
            <span>Realisasi Pencairan Kas</span>
            <span className="font-mono text-emerald-700 font-bold">
              {getPercent(stats.totalDicairkan, stats.totalDisetujui)}% Dicairkan
            </span>
          </div>

          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
            <div
              className="bg-finance-navy h-full transition-all duration-500"
              style={{ width: `${getPercent(stats.totalDicairkan, stats.totalDisetujui)}%` }}
              title="Sudah Dicairkan"
            />
            <div
              className="bg-orange-400 h-full transition-all duration-500"
              style={{ width: `${getPercent(stats.totalBelumDicairkan, stats.totalDisetujui)}%` }}
              title="Sisa Belum Dicairkan"
            />
          </div>

          <div className="flex justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-finance-navy"></span> Sudah Dicairkan ({formatRupiah(stats.totalDicairkan)})
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-orange-400"></span> Belum Dicairkan ({formatRupiah(stats.totalBelumDicairkan)})
            </span>
          </div>
        </div>
      </div>

      {/* Recent Submissions Feed */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-finance-blue" />
            <h2 className="text-sm font-bold text-finance-navy">Daftar Pengajuan Terbaru</h2>
          </div>
          <button
            onClick={() => onNavigate('submissions')}
            className="text-xs text-finance-blue hover:underline font-medium inline-flex items-center gap-1"
          >
            Lihat Semua <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {submissions.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Belum ada berkas pengajuan pada filter ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5">Nomor & Tanggal</th>
                  <th className="px-4 py-2.5">Unit</th>
                  <th className="px-4 py-2.5">Nama Kegiatan</th>
                  <th className="px-4 py-2.5 text-right">Nominal Diajukan</th>
                  <th className="px-4 py-2.5 text-right">Nominal Disetujui</th>
                  <th className="px-4 py-2.5 text-center">Status</th>
                  <th className="px-4 py-2.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {submissions.slice(0, 5).map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-mono font-semibold text-slate-900">{sub.submission_number}</div>
                      <div className="text-[11px] text-slate-400">{sub.submission_date}</div>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">{sub.unit_name}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{sub.activity_name}</div>
                      <div className="text-[11px] text-slate-400">{sub.category} • PJ: {sub.person_in_charge}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-800">
                      {formatRupiah(sub.original_total)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-sky-800">
                      {sub.approved_total > 0 ? formatRupiah(sub.approved_total) : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={sub.status} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => onNavigate('reports', { submissionId: sub.id })}
                        className="px-2.5 py-1 text-[11px] text-finance-blue hover:bg-blue-50 border border-blue-200 rounded font-medium"
                      >
                        Buka Laporan
                      </button>
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
