import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './lib/authContext';
import { Navbar } from './components/Navbar';
import { Sidebar, NavItemKey } from './components/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { SubmissionPage } from './pages/SubmissionPage';
import { AnalysisPage } from './pages/AnalysisPage';
import { DraftSiapDicairkanPage } from './pages/DraftSiapDicairkanPage';
import { MasterSSHPage } from './pages/MasterSSHPage';
import { DisbursementPage } from './pages/DisbursementPage';
import { UnitRecapPage } from './pages/UnitRecapPage';
import { ArchivePage } from './pages/ArchivePage';
import { UsersSettingsPage } from './pages/UsersSettingsPage';
import { BackupPage } from './pages/BackupPage';
import { OperatorHistoryPage } from './pages/OperatorHistoryPage';

const MainLayout: React.FC = () => {
  const { currentUser, isOperator, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<NavItemKey>('dashboard');
  const [navParams, setNavParams] = useState<any>(null);
  const [isOpenMobile, setIsOpenMobile] = useState(false);

  // If Operator logs in, strictly restrict default view to 'submissions'
  useEffect(() => {
    if (isOperator && activeTab !== 'submissions' && activeTab !== 'operator-history') {
      setActiveTab('submissions');
    } else if (!isOperator && activeTab === 'operator-history') {
      setActiveTab('dashboard');
    }
  }, [isOperator]);

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
        <div className="text-xs text-slate-500 mt-1">Memuat Sistem Pengajuan Dana...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-finance-bg text-finance-textMain flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar onToggleSidebar={() => setIsOpenMobile(prev => !prev)} />

      {/* Main Body Layout */}
      <div className="flex-1 flex w-full">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={handleNavigate}
          isOpenMobile={isOpenMobile}
          onCloseMobile={() => setIsOpenMobile(false)}
        />

        {/* Dynamic Page Content - Full Width & Responsive */}
        <main className="flex-1 min-w-0 w-full p-3 sm:p-5 lg:p-6 pb-24 lg:pb-10 overflow-y-auto">
          {/* Operator specific views */}
          {isOperator && activeTab === 'operator-history' && (
            <OperatorHistoryPage onNavigate={handleNavigate} />
          )}

          {/* Submissions (accessible by Operator and Bendahara) */}
          {activeTab === 'submissions' && <SubmissionPage onNavigate={handleNavigate} />}

          {/* Bendahara views (Restricted from Operator) */}
          {!isOperator && (
            <>
              {activeTab === 'dashboard' && <DashboardPage onNavigate={handleNavigate} />}
              {activeTab === 'analysis' && (
                <AnalysisPage
                  initialSubmissionId={navParams?.submissionId}
                  onNavigate={handleNavigate}
                />
              )}
              {activeTab === 'draft-siap-dicairkan' && (
                <DraftSiapDicairkanPage
                  initialSubmissionId={navParams?.submissionId}
                  onNavigate={handleNavigate}
                />
              )}
              {activeTab === 'master-ssh' && <MasterSSHPage />}
              {activeTab === 'disbursement' && <DisbursementPage onNavigate={handleNavigate} />}
              {activeTab === 'unit-recap' && <UnitRecapPage />}
              {activeTab === 'archive' && <ArchivePage onNavigate={handleNavigate} />}
              {activeTab === 'settings' && <UsersSettingsPage />}
              {activeTab === 'backup' && <BackupPage />}
            </>
          )}
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
