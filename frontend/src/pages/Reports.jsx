import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  Layers,
  Sparkles,
  TrendingUp,
  Percent,
  Scale
} from 'lucide-react';
import DataTable from '../components/DataTable';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';
import { exportToCSV, exportToExcel, printPDFReport } from '../utils/exportUtils';
import { api } from '../services/api';

export default function Reports() {
  const [reportType, setReportType] = useState('daily'); // daily, monthly, side, rare
  const [dateFilter, setDateFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [dailyData, setDailyData] = useState(null);
  const [monthlyData, setMonthlyData] = useState(null);
  const [sideData, setSideData] = useState(null);
  const [rareData, setRareData] = useState(null);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      if (reportType === 'daily') {
        const query = dateFilter ? `?date=${dateFilter}` : '';
        const res = await api.get(`/api/reports/daily${query}`);
        if (res.success) setDailyData(res);
      } else if (reportType === 'monthly') {
        const query = monthFilter ? `?month=${monthFilter}` : '';
        const res = await api.get(`/api/reports/monthly${query}`);
        if (res.success) setMonthlyData(res);
      } else if (reportType === 'side') {
        const res = await api.get('/api/reports/side-comparison');
        if (res.success) setSideData(res);
      } else if (reportType === 'rare') {
        const res = await api.get('/api/reports/rare-materials');
        if (res.success) setRareData(res);
      }
    } catch (err) {
      setError(err.message || 'Failed to generate report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportType, dateFilter, monthFilter]);

  const REPORT_TABS = [
    { id: 'daily', label: 'Daily Consumption Report', icon: Calendar },
    { id: 'monthly', label: 'Monthly Summary Report', icon: TrendingUp },
    { id: 'side', label: 'Left vs Right Operations', icon: Layers },
    { id: 'rare', label: 'Rare Materials History', icon: Sparkles },
  ];

  // Export Trigger Helper
  const handlePrintPDF = (title, headers, rows, summary) => {
    printPDFReport(title, headers, rows, summary);
  };

  return (
    <div className="space-y-6">
      {/* Header and Report Selector */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/90 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Industrial Material Consumption & Wastage Reports
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Executive auditing and operational analytics. Exportable to Excel (.xlsx/.xls), CSV, and Print/PDF.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
          {REPORT_TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setReportType(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 font-medium rounded-lg transition-colors ${
                  reportType === tab.id
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Date Filter Bar depending on tab */}
      {reportType === 'daily' && (
        <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Filter Specific Day:</span>
          <input
            type="date"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-mono"
          />
          {dateFilter && (
            <button
              onClick={() => setDateFilter('')}
              className="text-xs text-slate-500 hover:text-slate-800 underline"
            >
              Clear Filter
            </button>
          )}
        </div>
      )}

      {reportType === 'monthly' && (
        <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Filter Month (YYYY-MM):</span>
          <input
            type="month"
            value={monthFilter}
            onChange={e => setMonthFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-mono"
          />
          {monthFilter && (
            <button
              onClick={() => setMonthFilter('')}
              className="text-xs text-slate-500 hover:text-slate-800 underline"
            >
              Clear Filter
            </button>
          )}
        </div>
      )}

      {error && <ErrorMessage error={error} onRetry={fetchReport} />}

      {loading ? (
        <Loading message="Synthesizing report from Google Sheets ledger..." />
      ) : (
        <>
          {/* TAB 1: DAILY REPORT */}
          {reportType === 'daily' && dailyData && (
            <div className="space-y-4">
              {/* Summary Metrics */}
              {dailyData.summary && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Punching</span>
                    <span className="text-xl font-bold font-mono text-sky-600 dark:text-sky-400 block mt-1">
                      {dailyData.summary.total_sheets} sheets
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Input Weight</span>
                    <span className="text-xl font-bold font-mono text-slate-800 dark:text-slate-100 block mt-1">
                      {dailyData.summary.total_input_kg} kg
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Scrap Weight</span>
                    <span className="text-xl font-bold font-mono text-amber-500 block mt-1">
                      {dailyData.summary.total_scrap_kg} kg
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Net Consumed</span>
                    <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 block mt-1">
                      {dailyData.summary.total_net_consumption_kg} kg
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Wastage %</span>
                    <span className="text-xl font-bold font-mono text-rose-500 block mt-1">
                      {dailyData.summary.wastage_percentage}%
                    </span>
                  </div>
                </div>
              )}

              <DataTable
                columns={[
                  { key: 'entry_date', label: 'Date', className: 'w-24 font-mono text-xs' },
                  { key: 'side', label: 'Side', className: 'w-16' },
                  { key: 'job_number', label: 'Job Ref' },
                  { key: 'material_name', label: 'Material' },
                  { key: 'used_quantity', label: 'Sheets' },
                  { key: 'weight_per_sheet', label: 'Wt/Sh (kg)' },
                  { key: 'total_input_weight', label: 'Input Wt (kg)' },
                  { key: 'scrap_weight', label: 'Scrap (kg)' },
                  { key: 'net_consumption', label: 'Net (kg)' },
                  { key: 'wastage_percentage', label: 'Wastage %' }
                ]}
                data={dailyData.records || []}
                title="Daily Material Consumption Breakdown"
                exportFilename="daily_consumption_report"
                actions={
                  <button
                    onClick={() =>
                      handlePrintPDF(
                        'Daily Material Consumption Report',
                        [
                          { key: 'entry_date', label: 'Date' },
                          { key: 'side', label: 'Side' },
                          { key: 'material_name', label: 'Material' },
                          { key: 'used_quantity', label: 'Sheets' },
                          { key: 'total_input_weight', label: 'Input (kg)' },
                          { key: 'scrap_weight', label: 'Scrap (kg)' },
                          { key: 'net_consumption', label: 'Net (kg)' },
                          { key: 'wastage_percentage', label: 'Wastage %' }
                        ],
                        dailyData.records || [],
                        dailyData.summary
                      )
                    }
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5 text-sky-400" />
                    <span>Print PDF</span>
                  </button>
                }
              />
            </div>
          )}

          {/* TAB 2: MONTHLY REPORT */}
          {reportType === 'monthly' && monthlyData && (
            <div className="space-y-4">
              {monthlyData.summary && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Punching</span>
                    <span className="text-xl font-bold font-mono text-sky-600 block mt-1">
                      {monthlyData.summary.total_sheets} sheets
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Input Wt</span>
                    <span className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 block mt-1">
                      {monthlyData.summary.total_input_kg} kg
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Scrap Wt</span>
                    <span className="text-xl font-bold font-mono text-amber-500 block mt-1">
                      {monthlyData.summary.total_scrap_kg} kg
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Net Consumed</span>
                    <span className="text-xl font-bold font-mono text-emerald-600 block mt-1">
                      {monthlyData.summary.total_net_consumption_kg} kg
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Period Wastage %</span>
                    <span className="text-xl font-bold font-mono text-rose-500 block mt-1">
                      {monthlyData.summary.overall_wastage_percentage}%
                    </span>
                  </div>
                </div>
              )}

              <DataTable
                columns={[
                  { key: 'material_id', label: 'Material ID', className: 'w-24 font-mono text-xs' },
                  { key: 'material_name', label: 'Material Name' },
                  { key: 'side', label: 'Side' },
                  { key: 'used_sheets', label: 'Total Used Sheets' },
                  { key: 'input_weight', label: 'Total Input (kg)' },
                  { key: 'scrap_weight', label: 'Total Scrap (kg)' },
                  { key: 'net_consumption', label: 'Net Consumed (kg)' },
                  { key: 'wastage_percentage', label: 'Material Wastage %' }
                ]}
                data={monthlyData.materials || []}
                title="Monthly Aggregated Material Usage"
                exportFilename="monthly_consumption_report"
                actions={
                  <button
                    onClick={() =>
                      handlePrintPDF(
                        'Monthly Material Consumption Summary',
                        [
                          { key: 'material_name', label: 'Material' },
                          { key: 'side', label: 'Side' },
                          { key: 'used_sheets', label: 'Sheets' },
                          { key: 'input_weight', label: 'Input (kg)' },
                          { key: 'scrap_weight', label: 'Scrap (kg)' },
                          { key: 'net_consumption', label: 'Net (kg)' },
                          { key: 'wastage_percentage', label: 'Wastage %' }
                        ],
                        monthlyData.materials || [],
                        monthlyData.summary
                      )
                    }
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5 text-sky-400" />
                    <span>Print PDF</span>
                  </button>
                }
              />
            </div>
          )}

          {/* TAB 3: SIDE COMPARISON */}
          {reportType === 'side' && sideData && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {['left_side', 'right_side'].map(sideKey => {
                const s = sideData[sideKey];
                const isLeft = sideKey === 'left_side';
                return (
                  <div
                    key={sideKey}
                    className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/90 shadow-xs space-y-4"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
                      <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                        isLeft
                          ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}>
                        {s.side} Side Operations
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {s.transactions_count} recorded transactions
                      </span>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between py-1.5 border-b border-slate-50 dark:border-slate-700/50">
                        <span className="text-slate-500">Sheets Punched:</span>
                        <span className="font-bold font-mono text-slate-900 dark:text-slate-100">{s.sheets_punched} sheets</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-50 dark:border-slate-700/50">
                        <span className="text-slate-500">Total Input Weight:</span>
                        <span className="font-bold font-mono text-slate-900 dark:text-slate-100">{s.input_weight_kg} kg</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-50 dark:border-slate-700/50">
                        <span className="text-slate-500">Total Scrap Generated:</span>
                        <span className="font-bold font-mono text-amber-500">{s.scrap_weight_kg} kg</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-50 dark:border-slate-700/50">
                        <span className="text-slate-500">Net Consumption:</span>
                        <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">{s.net_consumption_kg} kg</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-50 dark:border-slate-700/50">
                        <span className="text-slate-500">Cutbit Used:</span>
                        <span className="font-bold font-mono text-slate-700 dark:text-slate-300">{s.cutbit_used} sheets</span>
                      </div>
                      <div className="flex justify-between py-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                        <span className="font-bold text-slate-800 dark:text-slate-200">Side Wastage %:</span>
                        <span className={`text-base font-bold font-mono ${parseFloat(s.wastage_percentage) > 10 ? 'text-rose-500' : 'text-emerald-600'}`}>
                          {s.wastage_percentage}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 4: RARE MATERIALS HISTORY */}
          {reportType === 'rare' && rareData && (
            <div className="space-y-4">
              <DataTable
                columns={[
                  { key: 'material_id', label: 'ID', className: 'w-24 font-mono text-xs' },
                  { key: 'material_name', label: 'Rare Material' },
                  { key: 'side', label: 'Side' },
                  { key: 'category', label: 'Category' },
                  { key: 'weight_per_sheet', label: 'Weight/Sheet (kg)' },
                  { key: 'total_transactions', label: 'Times Used' },
                  { key: 'total_sheets_used', label: 'Sheets Consumed' },
                  { key: 'total_input_weight', label: 'Gross Input Wt (kg)' },
                  { key: 'total_scrap_weight', label: 'Scrap Wt (kg)' },
                  { key: 'created_at', label: 'Date Added', className: 'text-[11px] font-mono' }
                ]}
                data={rareData.materials || []}
                title="Rare Materials Usage Registry"
                exportFilename="rare_materials_history"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
