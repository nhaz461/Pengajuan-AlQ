import React, { useState, useEffect } from 'react';
import { databaseService } from '../lib/databaseService';
import { Unit, FiscalYear } from '../types/database';
import {
  BarChart3,
  Building,
  RefreshCw,
  Filter,
  Download,
  PieChart,
  TrendingUp,
  ArrowUpRight
} from 'lucide-react';
import * as XLSX from 'xlsx';

export const UnitRecapPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('2026');

  const [recapData, setRecapData] = useState<{
    unitRecap: any[];
    totalCount: number;
    totalDiajukan: number;
    totalDisetujui: number;
    totalDicairkan: number;
    totalBelumDicairkan: number;
    totalSelisih: number;
  }>({
    unitRecap: [],
    totalCount: 0,
    totalDiajukan: 0,
    totalDisetujui: 0,
    totalDicairkan: 0,
    totalBelumDicairkan: 0,
    totalSelisih: 0
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const years = await databaseService.getFiscalYears();
      setFiscalYears(years);

      const stats = await databaseService.getDashboardStats({
        fiscalYear: selectedYear
      });

      setRecapData({
        unitRecap: stats.unitRecap,
        totalCount: stats.totalCount,
        totalDiajukan: stats.totalDiajukan,
        totalDisetujui: stats.totalDisetujui,
        totalDicairkan: stats.totalDicairkan,
        totalBelumDicairkan: stats.totalBelumDicairkan,
        totalSelisih: stats.totalSelisih
      });
    } catch (err) {
      console.error('Error loading unit recap:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedYear]);

  const formatRupiah = (val: number) => {
    return 'Rp' + Number(val || 0).toLocaleString('id-ID');
  };

  // Export recap table to Excel
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    const rows = recapData.unitRecap.map(r => [
      r.unitName,
      r.count,
      r.totalDiajukan,
      r.totalDisetujui,
      r.totalDicairkan,
      r.belumDicairkan,
      r.selisih
    ]);

    // Summary row
    rows.push([
      'TOTAL KONSOLIDASI',
      recapData.totalCount,
      recapData.totalDiajukan,
      recapData.totalDisetujui,
      recapData.totalDicairkan,
      recapData.totalBelumDicairkan,
      recapData.totalSelisih
    ]);

    const headers = [
      'Unit',
      'Jumlah Pengajuan',
      'Total Diajukan (Rp)',
      'Total Disetujui (Rp)',
      'Total Dicairkan (Rp)',
      'Belum Dicairkan (Rp)',
      'Selisih (Rp)'
    ];

    const wsData = [
      ["YAYASAN PENDIDIKAN ISLAM AL-QUR'ANIYYAH"],
      ['REKAPITULASI PENGAJUAN & REALISASI ANGGARAN KONSOLIDASI PER UNIT'],
      ['Tahun Anggaran:', selectedYear],
      ['Tanggal Unduh:', new Date().toLocaleDateString('id-ID')],
      [],
      headers,
      ...rows
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap per Unit');
    XLSX.writeFile(wb, `Rekap_Keuangan_Per_Unit_${selectedYear}.xlsx`);
  };

  return (
    <div className="space-y-5 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-finance-navy">Rekap Konsolidasi per Unit</h1>
          <p className="text-xs text-slate-500">
            Perbandingan anggaran antar unit: SD IT, SMP IT, SMA IT, dan TK IT Al-Qur'aniyyah.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Ekspor Excel (.xlsx)</span>
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

      {/* Filter Year */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-finance-navy">
          <Filter className="w-4 h-4 text-finance-blue" />
          <span>Tahun Anggaran:</span>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="border border-slate-200 rounded-lg px-2.5 py-1 text-xs bg-white font-medium focus:ring-1 focus:ring-finance-blue"
          >
            <option value="ALL">Semua Tahun</option>
            {fiscalYears.map(fy => (
              <option key={fy.id} value={fy.year}>{fy.year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Primary Table (Section L Required Columns) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-finance-blue" />
            <h2 className="text-sm font-bold text-finance-navy">
              Tabel Matriks Konsolidasi Unit (SD IT, SMP IT, SMA IT, TK IT)
            </h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Unit</th>
                <th className="px-3 py-3 text-center">Jumlah Pengajuan</th>
                <th className="px-4 py-3 text-right">Total Diajukan</th>
                <th className="px-4 py-3 text-right">Total Disetujui</th>
                <th className="px-4 py-3 text-right">Total Dicairkan</th>
                <th className="px-4 py-3 text-right">Belum Dicairkan</th>
                <th className="px-4 py-3 text-right">Selisih</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {recapData.unitRecap.map((recap) => (
                <tr key={recap.unitId} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3.5 font-sans font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-finance-blue"></span>
                    {recap.unitName}
                  </td>
                  <td className="px-3 py-3.5 text-center font-sans font-semibold text-slate-700">
                    {recap.count}
                  </td>
                  <td className="px-4 py-3.5 text-right text-slate-800">
                    {formatRupiah(recap.totalDiajukan)}
                  </td>
                  <td className="px-4 py-3.5 text-right text-sky-800 font-bold">
                    {formatRupiah(recap.totalDisetujui)}
                  </td>
                  <td className="px-4 py-3.5 text-right text-finance-navy font-bold">
                    {formatRupiah(recap.totalDicairkan)}
                  </td>
                  <td className="px-4 py-3.5 text-right text-orange-700">
                    {formatRupiah(recap.belumDicairkan)}
                  </td>
                  <td className="px-4 py-3.5 text-right text-slate-500">
                    {formatRupiah(recap.selisih)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-100/90 font-bold border-t-2 border-slate-200 font-mono text-xs">
              <tr>
                <td className="px-4 py-3.5 font-sans text-slate-900">TOTAL KONSOLIDASI</td>
                <td className="px-3 py-3.5 text-center font-sans">{recapData.totalCount}</td>
                <td className="px-4 py-3.5 text-right text-slate-900">{formatRupiah(recapData.totalDiajukan)}</td>
                <td className="px-4 py-3.5 text-right text-sky-900">{formatRupiah(recapData.totalDisetujui)}</td>
                <td className="px-4 py-3.5 text-right text-finance-navy">{formatRupiah(recapData.totalDicairkan)}</td>
                <td className="px-4 py-3.5 text-right text-orange-800">{formatRupiah(recapData.totalBelumDicairkan)}</td>
                <td className="px-4 py-3.5 text-right text-slate-700">{formatRupiah(recapData.totalSelisih)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Visual Chart Breakdown per Unit */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-finance-blue" />
          <h3 className="text-sm font-bold text-finance-navy">
            Grafik Komparasi Proporsi Anggaran per Unit
          </h3>
        </div>

        <div className="space-y-4">
          {recapData.unitRecap.map((recap) => {
            const maxVal = Math.max(1, recapData.totalDiajukan);
            const diajukanPct = Math.round((recap.totalDiajukan / maxVal) * 100);
            const disetujuiPct = Math.round((recap.totalDisetujui / maxVal) * 100);
            const dicairkanPct = Math.round((recap.totalDicairkan / maxVal) * 100);

            return (
              <div key={recap.unitId} className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-800">{recap.unitName}</span>
                  <span className="font-mono text-slate-600">
                    Disetujui: {formatRupiah(recap.totalDisetujui)} / Dicairkan: {formatRupiah(recap.totalDicairkan)}
                  </span>
                </div>

                <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden flex">
                  {/* Dicairkan */}
                  <div
                    className="bg-finance-navy h-full transition-all duration-500"
                    style={{ width: `${dicairkanPct}%` }}
                    title={`Dicairkan: ${formatRupiah(recap.totalDicairkan)}`}
                  />
                  {/* Disetujui tapi belum dicairkan */}
                  <div
                    className="bg-sky-400 h-full transition-all duration-500"
                    style={{ width: `${Math.max(0, disetujuiPct - dicairkanPct)}%` }}
                    title={`Belum dicairkan: ${formatRupiah(recap.belumDicairkan)}`}
                  />
                  {/* Selisih pengajuan */}
                  <div
                    className="bg-slate-300 h-full transition-all duration-500"
                    style={{ width: `${Math.max(0, diajukanPct - disetujuiPct)}%` }}
                    title={`Selisih: ${formatRupiah(recap.selisih)}`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-finance-navy"></span>
            <span>Sudah Dicairkan</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-sky-400"></span>
            <span>Disetujui (Belum Dicairkan)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-slate-300"></span>
            <span>Selisih Efisiensi Usulan</span>
          </div>
        </div>
      </div>
    </div>
  );
};
