import React, { useState, useEffect } from 'react';
import {
  Menu,
  LogOut,
  Shield,
  User,
  Database,
  Calculator,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function Header({ pageTitle, onOpenCalculator, onToggleMobileSidebar }) {
  const { user, logout, isDirector } = useAuth();
  const [dbStatus, setDbStatus] = useState({ is_connected: false, using_mock: true });
  const [checking, setChecking] = useState(false);

  const checkHealth = async () => {
    setChecking(true);
    try {
      const res = await api.get('/api/health');
      if (res.database) {
        setDbStatus({
          is_connected: res.database.is_connected,
          using_mock: res.database.using_mock_fallback
        });
      } else if (res.sheets_connected) {
        setDbStatus({
          is_connected: true,
          using_mock: false
        });
      }
    } catch {
      setDbStatus({ is_connected: false, using_mock: true });
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 border-b sticky top-0 z-20 bg-white/95 backdrop-blur-md border-slate-200 px-3 sm:px-6 flex items-center justify-between shadow-xs">
      
      {/* Title & Mobile Hamburger */}
      <div className="flex items-center gap-2 overflow-hidden">
        <button
          onClick={onToggleMobileSidebar}
          className="p-2 -ml-1 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 md:hidden transition-colors"
          title="Open Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex flex-col truncate">
          <h1 className="text-xs sm:text-sm md:text-base font-bold tracking-tight text-slate-900 truncate">
            {pageTitle}
          </h1>
          <span className="text-[10px] text-slate-500 hidden sm:block">
            Saravanan Electricals & Engineering
          </span>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Weight Calculator Shortcut */}
        <button
          onClick={onOpenCalculator}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl border
            bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 transition-colors shadow-2xs"
          title="Open Sheet Weight Calculator Engine"
        >
          <Calculator className="w-3.5 h-3.5 text-red-600" />
          <span className="hidden sm:inline">Weight Calc</span>
        </button>

        {/* Google Sheets Status Pill */}
        <button
          onClick={checkHealth}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded-full border font-semibold transition-colors ${
            dbStatus.is_connected
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}
          title="Google Sheets Connection Status"
        >
          <Database className="w-3 h-3" />
          <span className="hidden md:inline">
            {dbStatus.is_connected ? 'Sheets Live' : 'Sheets Connected'}
          </span>
          <span className={`w-2 h-2 rounded-full ${dbStatus.is_connected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          {checking && <RefreshCw className="w-3 h-3 animate-spin text-slate-400" />}
        </button>

        {/* User Badge */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className={`w-8 h-8 rounded-full text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs ${
            isDirector ? 'bg-purple-600' : 'bg-red-600'
          }`}>
            {user?.name ? user.name[0] : 'U'}
          </div>
          <div className="hidden lg:flex flex-col text-left">
            <span className="text-xs font-semibold text-slate-800 leading-tight">
              {user?.name || 'Operator'}
            </span>
            <span className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
              {isDirector ? (
                <>
                  <Shield className="w-2.5 h-2.5 text-purple-600" />
                  <span className="text-purple-700 font-semibold">Managing Director</span>
                </>
              ) : (
                <>
                  <User className="w-2.5 h-2.5 text-slate-500" />
                  <span>Operator</span>
                </>
              )}
            </span>
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 transition-colors ml-0.5"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
