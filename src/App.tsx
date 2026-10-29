import React, { useState } from 'react';
import { AuthProvider, useAuth } from './lib/authContext';
import { Navbar } from './components/Navbar';
import { Sidebar, NavItemKey } from './components/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { SubmissionPage } from './pages/SubmissionPage';
import { AnalysisPage } from './pages/AnalysisPage';
import { ApprovalPage } from './pages/ApprovalPage';
import { DisbursementPage } from './pages/DisbursementPage';
import { DisbursementReportPage } from './pages/DisbursementReportPage';
import { UnitRecapPage } from './pages/UnitRecapPage';
import { ArchivePage } from './pages/ArchivePage';
import { UsersSettingsPage } from './pages/UsersSettingsPage';
import { BackupPage } from './pages/BackupPage';

const MainLayout: React.FC = () => {
  const { currentUser, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<NavItemKey>('dashboard');
  const [navParams, setNavParams] = useState<any>(null);
  const [isOpenMobile, setIsOpenMobile] = useState(false);

  const handleNavigate = (tab: NavItemKey, params?: any) => {
    setActiveTab(tab);
    setNavParams(params || null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-finance-bg flex flex-col items-center justify-center p-4">
        <img src="/logo.svg" alt="Logo" className="w-14 h-14 mb-3 animate-pulse" />
        <div className="text-sm font-bold text-finance-navy">Yayasan Al-Qur'aniyyah</div>
        <div className="text-xs text-slate-500 mt-1">Memuat Sistem Pengajuan & Pencairan Dana...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-finance-bg text-finance-textMain flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar onToggleSidebar={() => setIsOpenMobile(prev => !prev)} />

      {/* Main Body Layout */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={handleNavigate}
          isOpenMobile={isOpenMobile}
          onCloseMobile={() => setIsOpenMobile(false)}
        />

        {/* Dynamic Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-full">
          {activeTab === 'dashboard' && <DashboardPage onNavigate={handleNavigate} />}
          {activeTab === 'submissions' && <SubmissionPage onNavigate={handleNavigate} />}
          {activeTab === 'analysis' && (
            <AnalysisPage
              initialSubmissionId={navParams?.submissionId}
              onNavigate={handleNavigate}
            />
          )}
          {activeTab === 'approval' && <ApprovalPage onNavigate={handleNavigate} />}
          {activeTab === 'disbursement' && <DisbursementPage onNavigate={handleNavigate} />}
          {activeTab === 'reports' && (
            <DisbursementReportPage
              initialSubmissionId={navParams?.submissionId}
              onNavigate={handleNavigate}
            />
          )}
          {activeTab === 'unit-recap' && <UnitRecapPage />}
          {activeTab === 'archive' && <ArchivePage onNavigate={handleNavigate} />}
          {activeTab === 'settings' && <UsersSettingsPage />}
          {activeTab === 'backup' && <BackupPage />}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
