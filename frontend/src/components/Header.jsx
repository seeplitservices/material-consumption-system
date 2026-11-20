import React, { useState, useEffect } from 'react';
import {
  Sun,
  Moon,
  LogOut,
  Shield,
  User,
  Database,
  Calculator,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';

export default function Header({ pageTitle, onOpenCalculator }) {
  const { user, logout, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
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
      }
    } catch {
      setDbStatus({ is_connected: false, using_mock: true });
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 60000); // 1 min health poll
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 border-b sticky top-0 z-20 transition-colors
      bg-white/80 dark:bg-slate-900/80 backdrop-blur border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between">
      
      {/* Title */}
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold tracking-tight text-slate-800 dark:text-slate-100">
          {pageTitle}
        </h1>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-3">
        {/* Weight Calculator Shortcut */}
        <button
          onClick={onOpenCalculator}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border
            bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700
            text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 transition-colors"
          title="Open Sheet Weight Calculator Engine"
        >
          <Calculator className="w-3.5 h-3.5 text-sky-500" />
          <span className="hidden sm:inline">Weight Calc</span>
        </button>

        {/* Google Sheets Status Pill */}
        <button
          onClick={checkHealth}
          className={`flex items-center gap-2 px-2.5 py-1 text-xs rounded-full border font-medium transition-colors ${
            dbStatus.is_connected
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
          }`}
          title="Click to re-check Google Sheets API connection"
        >
          <Database className="w-3.5 h-3.5" />
          <span className="hidden md:inline">
            {dbStatus.is_connected ? 'Google Sheets Live' : 'Local Storage Mode'}
          </span>
          <span className={`w-2 h-2 rounded-full ${dbStatus.is_connected ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
          {checking && <RefreshCw className="w-3 h-3 animate-spin" />}
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg border text-slate-600 dark:text-slate-300
            hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 transition-colors"
          title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>

        {/* User Badge */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
          <div className="w-8 h-8 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
            {user?.name ? user.name[0] : 'U'}
          </div>
          <div className="hidden lg:flex flex-col text-left">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight">
              {user?.name || 'Operator'}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
              {isAdmin ? <Shield className="w-2.5 h-2.5 text-sky-500" /> : <User className="w-2.5 h-2.5" />}
              {user?.role || 'Employee'}
            </span>
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors ml-1"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
