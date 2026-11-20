import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import WeightCalculator from './components/WeightCalculator';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DailyEntry from './pages/DailyEntry';
import { LeftStock, RightStock } from './pages/StockView';
import MaterialMaster from './pages/MaterialMaster';
import ScrapAnalysis from './pages/ScrapAnalysis';
import ProductionSummary from './pages/ProductionSummary';
import HistoricalRecords from './pages/HistoricalRecords';
import Reports from './pages/Reports';
import UserManagement from './pages/UserManagement';
import Settings from './pages/Settings';

function AppContent() {
  const { user, loading, isAdmin } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [isRareModalOpen, setIsRareModalOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-xs font-medium text-slate-400">Loading Material Control System...</p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const PAGE_TITLES = {
    'dashboard': 'Manufacturing Executive Dashboard',
    'daily-entry': 'Daily Material Punching & Scrap Entry',
    'left-stock': 'Left Side Inventory Ledger',
    'right-stock': 'Right Side Inventory Ledger',
    'material-master': 'Material Master Specifications',
    'scrap-analysis': 'Scrap Generation & Wastage Analytics',
    'production-summary': 'Daily Punching & Cutbit Production Summary',
    'historical-records': 'Historical Transaction Archive',
    'reports': 'Management Reports & Multi-Format Exports',
    'user-management': 'User Roles & Access Control',
    'settings': 'System Settings & Google Sheets Connectivity'
  };

  const currentTitle = PAGE_TITLES[currentPage] || 'Material Control System';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex transition-colors">
      {/* Sidebar Navigation */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        isAdmin={isAdmin}
      />

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'pl-20' : 'pl-64'}`}>
        <Header
          pageTitle={currentTitle}
          onOpenCalculator={() => setIsCalcOpen(true)}
        />

        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          {currentPage === 'dashboard' && (
            <Dashboard onNavigateToEntry={() => setCurrentPage('daily-entry')} />
          )}
          {currentPage === 'daily-entry' && (
            <DailyEntry
              onSaved={() => {}}
              onOpenRareModal={() => {
                setCurrentPage('material-master');
                setIsRareModalOpen(true);
              }}
            />
          )}
          {currentPage === 'left-stock' && <LeftStock />}
          {currentPage === 'right-stock' && <RightStock />}
          {currentPage === 'material-master' && (
            <MaterialMaster
              isRareModalOpen={isRareModalOpen}
              onToggleRareModal={setIsRareModalOpen}
            />
          )}
          {currentPage === 'scrap-analysis' && <ScrapAnalysis />}
          {currentPage === 'production-summary' && <ProductionSummary />}
          {currentPage === 'historical-records' && <HistoricalRecords />}
          {currentPage === 'reports' && <Reports />}
          {currentPage === 'user-management' && <UserManagement />}
          {currentPage === 'settings' && <Settings />}
        </main>
      </div>

      {/* Global Interactive Sheet Weight Calculator Engine Modal */}
      <WeightCalculator
        isOpen={isCalcOpen}
        onClose={() => setIsCalcOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
