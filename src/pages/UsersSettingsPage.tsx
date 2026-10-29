import React, { useState, useEffect } from 'react';
import { databaseService } from '../lib/databaseService';
import { useAuth } from '../lib/authContext';
import { Unit, FiscalYear, AppUser } from '../types/database';
import {
  Settings,
  Building,
  Users,
  Plus,
  Save,
  CheckCircle2,
  Calendar,
  Shield,
  RefreshCw
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export const UsersSettingsPage: React.FC = () => {
  const { currentUser } = useAuth();

  const [units, setUnits] = useState<Unit[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [loading, setLoading] = useState(true);

  // New Unit Modal
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [newUnitCode, setNewUnitCode] = useState('');
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitDesc, setNewUnitDesc] = useState('');
  const [savingUnit, setSavingUnit] = useState(false);

  // Institution profile
  const [instProfile, setInstProfile] = useState({
    name: "Yayasan Pendidikan Islam Pondok Pesantren Al-Qur'aniyyah",
    address: "Komp. Pesantren Al-Qur'aniyyah, Manna, Bengkulu Selatan",
    treasurer: "Bendahara Umum Yayasan",
    head: "Ketua Yayasan Al-Qur'aniyyah"
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

      const { data: usersData } = await supabase
        .from('app_users')
        .select('*, units(name)')
        .order('role', { ascending: true });

      if (usersData) {
        setUsers(usersData.map((u: any) => ({
          ...u,
          unit_name: u.units?.name
        })));
      }
    } catch (err) {
      console.error('Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnitCode.trim() || !newUnitName.trim()) {
      alert('Kode unit dan nama unit wajib diisi.');
      return;
    }

    setSavingUnit(true);
    try {
      await databaseService.createUnit(
        {
          code: newUnitCode.toUpperCase().trim(),
          name: newUnitName.trim(),
          description: newUnitDesc.trim() || null,
          sort_order: units.length + 1,
          is_active: true
        },
        currentUser?.full_name || 'Admin'
      );

      alert(`Unit baru "${newUnitName}" berhasil dibuat!`);
      setShowUnitModal(false);
      setNewUnitCode('');
      setNewUnitName('');
      setNewUnitDesc('');
      await loadData();
    } catch (err: any) {
      alert(`Gagal membuat unit: ${err.message}`);
    } finally {
      setSavingUnit(false);
    }
  };

  return (
    <div className="space-y-5 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-finance-navy">Pengaturan Master Unit & Pengguna</h1>
          <p className="text-xs text-slate-500">
            Kelola unit lembaga sekolah, hak akses pengguna, dan tahun anggaran operasional.
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

      {/* 1. Units Section (Section D: Unit tambahan harus dapat dibuat melalui menu pengaturan) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-finance-blue" />
            <h2 className="text-sm font-bold text-finance-navy">
              Daftar Unit Lembaga Yayasan ({units.length} Unit)
            </h2>
          </div>

          <button
            onClick={() => setShowUnitModal(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-finance-blue hover:bg-finance-blueHover rounded-lg shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Unit Baru</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Kode</th>
                <th className="px-4 py-3">Nama Unit Lembaga</th>
                <th className="px-4 py-3">Keterangan</th>
                <th className="px-3 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {units.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-mono font-bold text-finance-navy">{u.code}</td>
                  <td className="px-4 py-3 font-bold text-slate-900">{u.name}</td>
                  <td className="px-4 py-3 text-slate-500">{u.description || '-'}</td>
                  <td className="px-3 py-3 text-center">
                    <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Aktif
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Registered Users & Roles Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-finance-blue" />
            <h2 className="text-sm font-bold text-finance-navy">
              Pengguna & Role-Based Access Control (RBAC)
            </h2>
          </div>
          <span className="text-xs text-slate-500">4 Peran Resmi Terkonfigurasi</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Nama Pengguna</th>
                <th className="px-4 py-3">Email Login</th>
                <th className="px-3 py-3">Peran (Role)</th>
                <th className="px-4 py-3">Unit Bertugas</th>
                <th className="px-3 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-semibold text-slate-900">{u.full_name}</td>
                  <td className="px-4 py-3 font-mono text-slate-600">{u.email}</td>
                  <td className="px-3 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      u.role === 'ADMIN'
                        ? 'bg-purple-50 text-purple-800 border border-purple-200'
                        : u.role === 'BENDAHARA'
                        ? 'bg-blue-50 text-finance-blue border border-blue-200'
                        : u.role === 'OPERATOR'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700 font-medium">
                    {u.unit_name || '(Seluruh Unit / Yayasan)'}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                      Aktif
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Fiscal Years */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-finance-blue" />
          <h2 className="text-sm font-bold text-finance-navy">Tahun Anggaran Operasional</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {fiscalYears.map((fy) => (
            <div key={fy.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-slate-900 font-mono">{fy.year}</div>
                <div className="text-[11px] text-slate-500">{fy.notes || '-'}</div>
              </div>
              {fy.is_active && (
                <span className="text-[10px] font-bold text-finance-blue bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  Aktif
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Modal Add Unit */}
      {showUnitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-finance-blue" />
                <h3 className="text-base font-bold text-finance-navy">Tambah Unit Baru Yayasan</h3>
              </div>
              <button
                onClick={() => setShowUnitModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUnit} className="py-4 space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Kode Unit (Singkatan) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: MAIT, DTA, PONPES"
                  value={newUnitCode}
                  onChange={(e) => setNewUnitCode(e.target.value)}
                  className="w-full text-xs font-mono font-bold uppercase border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-finance-blue"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Nama Lengkap Unit <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: MA IT Al-Qur'aniyyah"
                  value={newUnitName}
                  onChange={(e) => setNewUnitName(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-finance-blue"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Keterangan / Jenjang</label>
                <input
                  type="text"
                  placeholder="Contoh: Unit Madrasah Aliyah Islam Terpadu"
                  value={newUnitDesc}
                  onChange={(e) => setNewUnitDesc(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUnitModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingUnit}
                  className="px-4 py-2 text-xs font-semibold text-white bg-finance-blue hover:bg-finance-blueHover rounded-lg transition-colors shadow-sm"
                >
                  {savingUnit ? 'Menyimpan...' : 'Simpan Unit Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
