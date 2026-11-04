import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/authContext';
import {
  Wifi,
  WifiOff,
  UserCheck,
  ShieldAlert,
  ChevronDown,
  Building2,
  RefreshCw
} from 'lucide-react';
import { UserRole } from '../types/database';

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { currentUser, usersList, setCurrentUser } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showRoleModal, setShowRoleModal] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getRoleBadge = (role?: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return <span className="bg-purple-100 text-purple-800 text-xs font-semibold px-2 py-0.5 rounded border border-purple-200">Admin Yayasan</span>;
      case 'BENDAHARA':
        return <span className="bg-blue-100 text-finance-blue text-xs font-semibold px-2 py-0.5 rounded border border-blue-200">Bendahara Umum</span>;
      case 'OPERATOR':
        return <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2 py-0.5 rounded border border-emerald-200">Operator Unit</span>;
      case 'PENGELUARAN':
        return <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2 py-0.5 rounded border border-amber-200">Bagian Pengeluaran</span>;
      default:
        return null;
    }
  };

  return (
    <>
      <header className="bg-white border-b border-finance-border sticky top-0 z-30 shadow-xs w-full">
        <div className="w-full px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Left: Mobile hamburger & App Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
              aria-label="Toggle Navigation"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="flex items-center gap-2.5">
              <img src="/logo.svg" alt="Logo Yayasan" className="w-9 h-9 rounded-lg shadow-sm" />
              <div>
                <div className="text-sm font-bold text-finance-navy leading-tight line-clamp-1">
                  Yayasan Al-Qur'aniyyah
                </div>
                <div className="text-xs text-slate-500 hidden sm:block">
                  Sistem Pengajuan & Analisis Pencairan Dana
                </div>
              </div>
            </div>
          </div>

          {/* Right: Network Status, Active User & Role Switcher */}
          <div className="flex items-center gap-3">
            {/* Online/Offline Status Indicator (Section O) */}
            <div className="flex items-center">
              {isOnline ? (
                <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200" title="Terhubung ke Supabase Cloud">
                  <Wifi className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Online</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs font-medium text-red-700 bg-red-50 px-2.5 py-1 rounded-full border border-red-300 animate-pulse" title="Tidak ada koneksi internet">
                  <WifiOff className="w-3.5 h-3.5" />
                  <span>Offline</span>
                </div>
              )}
            </div>

            {/* Current User Pill / Switcher */}
            <button
              onClick={() => setShowRoleModal(true)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
              title="Ganti Peran Akun untuk Pengujian RBAC"
            >
              <div className="w-7 h-7 rounded-full bg-finance-navy text-white flex items-center justify-center font-bold text-xs">
                {currentUser?.full_name?.charAt(0) || 'U'}
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-semibold text-slate-800 leading-tight">
                  {currentUser?.full_name}
                </div>
                <div className="text-[11px] text-slate-500 flex items-center gap-1">
                  {currentUser?.unit_name || currentUser?.role}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>
      </header>

      {/* Role Switcher Modal (Allows testing all 4 roles directly in production) */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-finance-blue" />
                <h3 className="text-base font-bold text-finance-navy">Simulasi Ganti Akun & Hak Akses</h3>
              </div>
              <button
                onClick={() => setShowRoleModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ×
              </button>
            </div>

            <div className="py-3 text-xs text-slate-600">
              Pilih akun untuk menguji aturan <strong>Role-Based Access Control (RBAC)</strong> dan pembatasan unit secara langsung:
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {usersList.map((user) => {
                const isSelected = currentUser?.id === user.id;
                return (
                  <button
                    key={user.id}
                    onClick={() => {
                      setCurrentUser(user);
                      setShowRoleModal(false);
                    }}
                    className={`w-full text-left p-3 rounded-lg border transition-all flex items-start justify-between ${
                      isSelected
                        ? 'border-finance-blue bg-blue-50/70 ring-1 ring-finance-blue'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                        {user.full_name}
                        {isSelected && <span className="text-[10px] text-finance-blue font-bold">(Aktif)</span>}
                      </div>
                      <div className="text-xs text-slate-500">{user.email}</div>
                      {user.unit_name && (
                        <div className="text-xs text-slate-600 flex items-center gap-1 mt-1 font-medium">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          {user.unit_name}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {getRoleBadge(user.role)}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowRoleModal(false)}
                className="px-4 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
