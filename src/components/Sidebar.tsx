import React from 'react';
import {
  LayoutDashboard,
  FileSpreadsheet,
  FileSearch,
  CheckCircle2,
  Wallet,
  FileText,
  BarChart3,
  Archive,
  Settings,
  DatabaseBackup,
  Building,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../lib/authContext';

export type NavItemKey =
  | 'dashboard'
  | 'submissions'
  | 'analysis'
  | 'approval'
  | 'disbursement'
  | 'reports'
  | 'unit-recap'
  | 'archive'
  | 'settings'
  | 'backup';

interface SidebarProps {
  activeTab: NavItemKey;
  onSelectTab: (tab: NavItemKey) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isOpenMobile,
  onCloseMobile
}) => {
  const { currentUser } = useAuth();

  const navItems = [
    {
      key: 'dashboard' as NavItemKey,
      label: 'Dashboard',
      icon: LayoutDashboard,
      description: 'Ringkasan & Analisis Konsolidasian',
      visible: true,
    },
    {
      key: 'submissions' as NavItemKey,
      label: 'Pengajuan Dana',
      icon: FileSpreadsheet,
      description: 'Draft, Import Excel & Pengajuan Unit',
      visible: true,
    },
    {
      key: 'analysis' as NavItemKey,
      label: 'Analisis Pengajuan',
      icon: FileSearch,
      description: 'Tinjauan & Penyesuaian Bendahara',
      visible: currentUser?.role === 'BENDAHARA' || currentUser?.role === 'ADMIN',
    },
    {
      key: 'approval' as NavItemKey,
      label: 'Persetujuan',
      icon: CheckCircle2,
      description: 'Disposisi & Persetujuan Anggaran',
      visible: currentUser?.role === 'BENDAHARA' || currentUser?.role === 'ADMIN',
    },
    {
      key: 'disbursement' as NavItemKey,
      label: 'Pencairan Dana',
      icon: Wallet,
      description: 'Pencatatan Realisasi Bertahap',
      visible: currentUser?.role === 'PENGELUARAN' || currentUser?.role === 'ADMIN' || currentUser?.role === 'BENDAHARA',
    },
    {
      key: 'reports' as NavItemKey,
      label: 'Laporan Pencairan',
      icon: FileText,
      description: 'Ekspor Gambar PNG, PDF & Cetak',
      visible: true,
    },
    {
      key: 'unit-recap' as NavItemKey,
      label: 'Rekap per Unit',
      icon: BarChart3,
      description: 'Konsolidasi SD, SMP, SMA, TK',
      visible: true,
    },
    {
      key: 'archive' as NavItemKey,
      label: 'Arsip Pengajuan',
      icon: Archive,
      description: 'Histori Berkas & Audit Lengkap',
      visible: true,
    },
    {
      key: 'settings' as NavItemKey,
      label: 'Pengguna & Unit',
      icon: Settings,
      description: 'Kelola Unit, Akun & Kategori',
      visible: currentUser?.role === 'ADMIN',
    },
    {
      key: 'backup' as NavItemKey,
      label: 'Backup & Pemulihan',
      icon: DatabaseBackup,
      description: 'Cadangan Terpisah & Restore',
      visible: currentUser?.role === 'ADMIN',
    },
  ];

  const handleSelect = (key: NavItemKey) => {
    onSelectTab(key);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Main Sidebar (Desktop fixed left, Mobile sliding drawer) */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-finance-navy text-white flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        } lg:static lg:h-[calc(100vh-4rem)]`}
      >
        {/* Mobile Header Inside Drawer */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between lg:hidden">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="Logo" className="w-7 h-7" />
            <span className="font-bold text-sm text-white">Menu Navigasi</span>
          </div>
          <button
            onClick={onCloseMobile}
            className="text-white/70 hover:text-white p-1"
          >
            ✕
          </button>
        </div>

        {/* Institution Info Card */}
        <div className="p-4 border-b border-white/10 hidden lg:block">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-finance-electric">
            Yayasan Al-Qur'aniyyah
          </div>
          <div className="text-xs text-slate-300 mt-0.5 line-clamp-1">
            Manna, Bengkulu Selatan
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems
            .filter((item) => item.visible)
            .map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => handleSelect(item.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                    isActive
                      ? 'bg-finance-blue text-white font-medium shadow-md'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{item.label}</div>
                  </div>
                </button>
              );
            })}
        </nav>

        {/* User Info Bottom Footer */}
        <div className="p-3 border-t border-white/10 bg-black/20 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-finance-blue/40 flex items-center justify-center font-bold text-finance-electric shrink-0">
              {currentUser?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="truncate">
              <div className="font-semibold text-white truncate">{currentUser?.full_name}</div>
              <div className="text-[11px] text-slate-400 truncate">
                {currentUser?.unit_name || currentUser?.role}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar (Quick Access on HP) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 shadow-lg px-2 py-1.5 flex items-center justify-around no-print">
        <button
          onClick={() => onSelectTab('dashboard')}
          className={`flex flex-col items-center py-1 px-2 rounded ${
            activeTab === 'dashboard' ? 'text-finance-blue font-semibold' : 'text-slate-500'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Dashboard</span>
        </button>

        <button
          onClick={() => onSelectTab('submissions')}
          className={`flex flex-col items-center py-1 px-2 rounded ${
            activeTab === 'submissions' ? 'text-finance-blue font-semibold' : 'text-slate-500'
          }`}
        >
          <FileSpreadsheet className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Pengajuan</span>
        </button>

        {(currentUser?.role === 'BENDAHARA' || currentUser?.role === 'ADMIN') && (
          <button
            onClick={() => onSelectTab('analysis')}
            className={`flex flex-col items-center py-1 px-2 rounded ${
              activeTab === 'analysis' ? 'text-finance-blue font-semibold' : 'text-slate-500'
            }`}
          >
            <FileSearch className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Analisis</span>
          </button>
        )}

        <button
          onClick={() => onSelectTab('reports')}
          className={`flex flex-col items-center py-1 px-2 rounded ${
            activeTab === 'reports' ? 'text-finance-blue font-semibold' : 'text-slate-500'
          }`}
        >
          <FileText className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Laporan</span>
        </button>

        <button
          onClick={() => onSelectTab('unit-recap')}
          className={`flex flex-col items-center py-1 px-2 rounded ${
            activeTab === 'unit-recap' ? 'text-finance-blue font-semibold' : 'text-slate-500'
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Rekap</span>
        </button>
      </div>
    </>
  );
};
