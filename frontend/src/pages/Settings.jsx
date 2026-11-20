import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Database,
  Shield,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  History,
  Sliders,
  Save,
  Trash2
} from 'lucide-react';
import DataTable from '../components/DataTable';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';
import Toast from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function Settings() {
  const { isDirector } = useAuth();
  const [settings, setSettings] = useState(null);
  const [googleStatus, setGoogleStatus] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [testingConnection, setTestingConnection] = useState(false);
  const [toast, setToast] = useState(null);

  // Form State
  const [baselineDate, setBaselineDate] = useState('2026-11-01');
  const [steelDensity, setSteelDensity] = useState('0.00000785');
  const [savingSettings, setSavingSettings] = useState(false);

  // Clear Data Modal State
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [clearingData, setClearingData] = useState(false);

  const fetchSettingsAndAudit = async () => {
    setLoading(true);
    try {
      const [settingsRes, auditRes] = await Promise.all([
        api.get('/api/settings'),
        api.get('/api/settings/audit-logs?limit=50').catch(() => ({ logs: [] }))
      ]);

      if (settingsRes.success) {
        setSettings(settingsRes.settings);
        setGoogleStatus(settingsRes.google_sheets);
        setBaselineDate(settingsRes.settings.baseline_date || '2026-11-01');
        setSteelDensity(String(settingsRes.settings.steel_density || '0.00000785'));
      }
      if (auditRes.logs) {
        setAuditLogs(auditRes.logs);
      }
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to load system settings.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettingsAndAudit();
  }, []);

  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      const res = await api.post('/api/settings/test-sheets');
      if (res.success) {
        setToast({ type: 'success', message: 'Connected to Google Sheets API successfully!' });
      } else {
        setToast({ type: 'warning', message: res.message || 'Google Sheets is operating in local mock storage mode.' });
      }
      if (res.status) setGoogleStatus(res.status);
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Connection test failed.' });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!isDirector) {
      setToast({ type: 'warning', message: 'Managing Director privileges required.' });
      return;
    }

    setSavingSettings(true);
    try {
      const res = await api.post('/api/settings', {
        baseline_date: baselineDate,
        steel_density: parseFloat(steelDensity)
      });
      if (res.success) {
        setToast({ type: 'success', message: 'System parameters saved in Google Sheets!' });
        fetchSettingsAndAudit();
      }
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to update settings.' });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleClearData = async () => {
    if (!isDirector) return;
    setClearingData(true);
    try {
      const res = await api.post('/api/settings/clear-data');
      if (res.success) {
        setToast({ type: 'success', message: 'All entered transactions purged. Stock reset to baseline.' });
        setIsClearModalOpen(false);
        fetchSettingsAndAudit();
      }
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to clear data.' });
    } finally {
      setClearingData(false);
    }
  };

  const auditColumns = [
    { key: 'log_id', label: 'Log ID', className: 'w-24 font-mono text-[11px] text-slate-500' },
    { key: 'timestamp', label: 'Timestamp', className: 'w-36 font-mono text-xs' },
    {
      key: 'action',
      label: 'Operation Action',
      render: val => (
        <span className="font-semibold text-xs text-sky-700 dark:text-sky-300 font-mono">
          {val}
        </span>
      )
    },
    { key: 'record_type', label: 'Sheet Target', render: val => <span className="font-mono text-xs">{val}</span> },
    { key: 'record_id', label: 'Record Ref', className: 'font-mono text-[11px] text-slate-500' },
    { key: 'old_value', label: 'Previous Value', render: val => <span className="text-[11px] text-slate-400 font-mono">{val || '--'}</span> },
    { key: 'new_value', label: 'Audit Change Details', render: val => <span className="text-[11px] text-slate-700 dark:text-slate-300 font-medium">{val || '--'}</span> },
    { key: 'user_id', label: 'User ID', className: 'w-20 font-mono text-[11px] text-slate-400' }
  ];

  return (
    <div className="space-y-6">
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Top Banner */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/90 shadow-xs">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          System Configuration & Google Sheets Health
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Verify database connection health, adjust industrial constants, and inspect the immutable audit log trail.
        </p>
      </div>

      {loading ? (
        <Loading message="Querying Google Sheets settings and audit logs..." />
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Google Sheets Status Card */}
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/90 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-sky-500" />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    Google Sheets Backend Status
                  </h3>
                </div>
                <button
                  onClick={handleTestConnection}
                  disabled={testingConnection}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/60 dark:hover:bg-sky-900 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testingConnection ? 'animate-spin' : ''}`} />
                  <span>Test Connection</span>
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-slate-50 dark:border-slate-700/50">
                  <span className="text-slate-500">Connection Mode:</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    googleStatus?.is_connected
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}>
                    {googleStatus?.is_connected ? 'Google Sheets API Connected' : 'Local Mock Storage Mode'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-slate-50 dark:border-slate-700/50">
                  <span className="text-slate-500">Spreadsheet ID:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300 truncate max-w-[220px]">
                    {googleStatus?.spreadsheet_id || 'Not configured in environment'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-slate-50 dark:border-slate-700/50">
                  <span className="text-slate-500">Service Account Status:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {googleStatus?.is_connected ? 'Verified & Active' : 'Pending GOOGLE_SERVICE_ACCOUNT_JSON'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-slate-50 dark:border-slate-700/50">
                  <span className="text-slate-500">Unified Sheets Schema:</span>
                  <span className="font-mono text-emerald-600 font-bold text-[11px]">
                    Material_Master, Daily_Entries, Material_Stock, Scrap_Records, Production_Summary, Stock_Adjustments, Users, Audit_Log, Settings
                  </span>
                </div>

                {googleStatus?.connection_error && (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300">
                    Diagnostic Note: {googleStatus.connection_error}
                    <span className="block mt-1 text-slate-500">
                      To connect real Google Sheets, add GOOGLE_SHEETS_SPREADSHEET_ID and GOOGLE_SERVICE_ACCOUNT_JSON to your Render or local .env file.
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Industrial Constants Card */}
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/90 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-sky-500" />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    Industrial Calculation Parameters
                  </h3>
                </div>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Default Steel Density Coefficient
                  </label>
                  <input
                    type="number"
                    step="0.00000001"
                    value={steelDensity}
                    onChange={e => setSteelDensity(e.target.value)}
                    required
                    disabled={!isDirector}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-mono text-sm"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Standard mild steel density: 0.00000785 (used for sheet weight calculation)
                  </span>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Inventory Baseline Date
                  </label>
                  <input
                    type="date"
                    value={baselineDate}
                    onChange={e => setBaselineDate(e.target.value)}
                    required
                    disabled={!isDirector}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-mono"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Initial stock baseline configuration origin date
                  </span>
                </div>

                {isDirector && (
                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={savingSettings}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow-xs disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{savingSettings ? 'Saving...' : 'Save Parameters'}</span>
                    </button>
                  </div>
                )}
              </form>
            </div>

          </div>

          {/* Director Factory Data Purge Card */}
          {isDirector && (
            <div className="p-6 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-rose-500" />
                  <h3 className="font-bold text-sm text-rose-900 dark:text-rose-200">
                    Purge All Entered Transaction Data
                  </h3>
                </div>
                <p className="text-xs text-rose-700/80 dark:text-rose-300/80 mt-1">
                  Remove all entered daily consumption entries, scrap records, and production summaries. Material Master and baseline stock quantities remain intact.
                </p>
              </div>
              <button
                onClick={() => setIsClearModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-xs transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Purge Existing Data</span>
              </button>
            </div>
          )}

          {/* Audit Log Table */}
          <div className="pt-4">
            <DataTable
              columns={auditColumns}
              data={auditLogs}
              title="Immutable System Audit Log (Audit_Log Sheet)"
              exportFilename="audit_log_trail"
              pageSize={10}
            />
          </div>

          {/* Confirmation Modal for Data Purge */}
          {isClearModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
              <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-900/60 shadow-2xl p-6 space-y-4">
                <div className="flex items-center gap-3 text-rose-600">
                  <AlertTriangle className="w-6 h-6" />
                  <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                    Confirm Data Purge
                  </h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Are you sure you want to remove all entered transaction data? This will clear all daily entries, scrap logs, and production summaries, resetting inventory balances to the initial baseline.
                </p>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setIsClearModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleClearData}
                    disabled={clearingData}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs disabled:opacity-50"
                  >
                    {clearingData ? 'Purging...' : 'Yes, Purge Data'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
