import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  CalendarRange,
  Sparkles,
  TrendingUp,
  Percent,
  Scale,
  Layers,
  Filter,
  RotateCcw
} from 'lucide-react';
import DataTable from '../components/DataTable';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';
import { exportToCSV, exportToExcel, printPDFReport } from '../utils/exportUtils';
import { api } from '../services/api';

export default function Reports() {
  const [reportType, setReportType] = useState('custom'); // custom, daily, monthly, rare
  const [dateFilter, setDateFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');

  // Custom Range State
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [customSubView, setCustomSubView] = useState('transactions'); // 'transactions' | 'materials'

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [customData, setCustomData] = useState(null);
  const [dailyData, setDailyData] = useState(null);
  const [monthlyData, setMonthlyData] = useState(null);
  const [rareData, setRareData] = useState(null);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      if (reportType === 'custom') {
        const params = new URLSearchParams();
        if (customStartDate) params.append('start_date', customStartDate);
        if (customEndDate) params.append('end_date', customEndDate);
        const res = await api.get(`/api/reports/custom-range?${params.toString()}`);
        if (res.success) setCustomData(res);
      } else if (reportType === 'daily') {
        const query = dateFilter ? `?date=${dateFilter}` : '';
        const res = await api.get(`/api/reports/daily${query}`);
        if (res.success) setDailyData(res);
      } else if (reportType === 'monthly') {
        const query = monthFilter ? `?month=${monthFilter}` : '';
        const res = await api.get(`/api/reports/monthly${query}`);
        if (res.success) setMonthlyData(res);
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
  }, [reportType, dateFilter, monthFilter, customStartDate, customEndDate]);

  const REPORT_TABS = [
    { id: 'custom', label: 'Custom Range Export', icon: CalendarRange },
    { id: 'daily', label: 'Daily Consumption', icon: Calendar },
    { id: 'monthly', label: 'Monthly Summary', icon: TrendingUp },
    { id: 'rare', label: 'Rare Materials History', icon: Sparkles },
  ];

  // Quick Preset Handlers for Custom Range
  const handlePreset = (preset) => {
    const today = new Date();
    const formatDate = (d) => d.toISOString().slice(0, 10);

    if (preset === 'today') {
      const dStr = formatDate(today);
      setCustomStartDate(dStr);
      setCustomEndDate(dStr);
    } else if (preset === '7days') {
      const past = new Date();
      past.setDate(today.getDate() - 7);
      setCustomStartDate(formatDate(past));
      setCustomEndDate(formatDate(today));
    } else if (preset === '30days') {
      const past = new Date();
      past.setDate(today.getDate() - 30);
      setCustomStartDate(formatDate(past));
      setCustomEndDate(formatDate(today));
    } else if (preset === 'thisMonth') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setCustomStartDate(formatDate(firstDay));
      setCustomEndDate(formatDate(today));
    } else if (preset === 'all') {
      setCustomStartDate('');
      setCustomEndDate('');
    }
  };

  // Custom Range Columns
  const customTransactionColumns = [
    { key: 'entry_date', label: 'Date', className: 'w-24 font-mono text-xs' },
    { key: 'job_number', label: 'Job Ref', render: (val, row) => `${val || 'N/A'} (${row.shift || 'Day'})` },
    { key: 'material_name', label: 'Material', render: val => <span className="font-semibold text-xs">{val}</span> },
    { key: 'opening_stock', label: 'Opening', render: val => <span className="font-mono text-slate-500">{val}</span> },
    { key: 'used_quantity', label: 'Used Sheets', render: val => <span className="font-mono font-bold text-sky-600 dark:text-sky-400">{val}</span> },
    { key: 'closing_stock', label: 'Closing', render: val => <span className="font-mono font-bold text-slate-800 dark:text-slate-100">{val}</span> },
    { key: 'weight_per_sheet', label: 'Wt/Sh (kg)', render: val => <span className="font-mono text-slate-500">{Number(val || 0).toFixed(2)}</span> },
    { key: 'total_input_weight', label: 'Input Wt (kg)', render: val => <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{Number(val || 0).toFixed(2)}</span> },
    { key: 'scrap_weight', label: 'Scrap (kg)', render: val => <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold">{Number(val || 0).toFixed(2)}</span> },
    { key: 'net_consumption', label: 'Net (kg)', render: val => <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{Number(val || 0).toFixed(2)}</span> },
    { key: 'wastage_percentage', label: 'Wastage %', render: val => <span className="font-mono text-rose-500 font-semibold">{Number(val || 0).toFixed(2)}%</span> },
    { key: 'cutbit_used', label: 'Cutbit', render: val => <span className="font-mono text-xs">{val || 0}</span> },
    { key: 'employee', label: 'Operator', render: val => <span className="text-slate-500 text-[11px]">{val}</span> }
  ];

  const customMaterialSummaryColumns = [
    { key: 'material_id', label: 'ID', className: 'w-24 font-mono text-xs' },
    { key: 'material_name', label: 'Material Name', render: val => <span className="font-semibold text-xs">{val}</span> },
    { key: 'used_sheets', label: 'Sheets Consumed', render: val => <span className="font-mono font-bold text-sky-600 dark:text-sky-400">{val}</span> },
    { key: 'input_weight', label: 'Input Weight (kg)', render: val => <span className="font-mono font-bold">{val} kg</span> },
    { key: 'scrap_weight', label: 'Scrap Weight (kg)', render: val => <span className="font-mono text-amber-500 font-semibold">{val} kg</span> },
    { key: 'net_consumption', label: 'Net Consumed (kg)', render: val => <span className="font-mono text-emerald-600 font-bold">{val} kg</span> },
    { key: 'wastage_percentage', label: 'Wastage %', render: val => <span className="font-mono text-rose-500 font-semibold">{val}%</span> }
  ];

  // Direct Custom Range Exports
  const handleCustomExportCSV = () => {
    if (!customData || !customData.records || !customData.records.length) {
      alert('No records available in this date range to export.');
      return;
    }
    const filename = `saravanan_consumption_${customStartDate || 'all'}_to_${customEndDate || 'all'}`;
    exportToCSV(filename, customTransactionColumns, customData.records);
  };

  const handleCustomExportExcel = () => {
    if (!customData || !customData.records || !customData.records.length) {
      alert('No records available in this date range to export.');
      return;
    }
    const filename = `saravanan_consumption_${customStartDate || 'all'}_to_${customEndDate || 'all'}`;
    exportToExcel(filename, customTransactionColumns, customData.records);
  };

  const handleCustomPrintPDF = () => {
    if (!customData || !customData.records || !customData.records.length) {
      alert('No records available in this date range to print.');
      return;
    }
    const title = `Saravanan Electricals - Material Consumption Report (${customData.range_label})`;
    printPDFReport(title, customTransactionColumns, customData.records, customData.summary);
  };

  return (
    <div className="space-y-6">
      {/* Header and Report Selector */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/90 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Reports & Data Exports
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Executive auditing, multi-day historical range reports, and instant Excel / CSV / PDF downloads.
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

      {/* TAB 1: CUSTOM DATE RANGE REPORT & EXPORT */}
      {reportType === 'custom' && (
        <div className="space-y-4">
          {/* Custom Date Range Picker & Quick Presets & Download Bar */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/90 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Date Inputs */}
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">From Date:</span>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={e => setCustomStartDate(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-mono focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">To Date:</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={e => setCustomEndDate(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-mono focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                {(customStartDate || customEndDate) && (
                  <button
                    onClick={() => handlePreset('all')}
                    className="text-xs text-rose-500 hover:text-rose-600 flex items-center gap-1 font-medium"
                    title="Clear date filter"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Clear Filter</span>
                  </button>
                )}
              </div>

              {/* Direct Download Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleCustomExportExcel}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-colors"
                  title="Download records in custom range as Excel (.xls/.xlsx)"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Excel</span>
                </button>

                <button
                  onClick={handleCustomExportCSV}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-white shadow-xs transition-colors"
                  title="Download records in custom range as CSV"
                >
                  <Download className="w-3.5 h-3.5 text-sky-400" />
                  <span>Download CSV</span>
                </button>

                <button
                  onClick={handleCustomPrintPDF}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 transition-colors"
                  title="Print or Save custom range as PDF"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                  <span>Print PDF</span>
                </button>
              </div>
            </div>

            {/* Quick Filter Presets */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Quick Presets:</span>
              <button
                onClick={() => handlePreset('today')}
                className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Today
              </button>
              <button
                onClick={() => handlePreset('7days')}
                className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Last 7 Days
              </button>
              <button
                onClick={() => handlePreset('30days')}
                className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Last 30 Days
              </button>
              <button
                onClick={() => handlePreset('thisMonth')}
                className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                This Month
              </button>
              <button
                onClick={() => handlePreset('all')}
                className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                All Time
              </button>
            </div>
          </div>

          {/* Loading / Error States */}
          {error && <ErrorMessage error={error} onRetry={fetchReport} />}
          {loading && <Loading message="Querying custom range from Google Sheets ledger..." />}

          {/* Range Summary KPI Cards */}
          {!loading && customData && customData.summary && (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Records</span>
                <span className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 block mt-1">
                  {customData.summary.total_records || 0}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Punching</span>
                <span className="text-xl font-bold font-mono text-sky-600 dark:text-sky-400 block mt-1">
                  {customData.summary.total_sheets} sheets
                </span>
              </div>
              <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Gross Input Wt</span>
                <span className="text-xl font-bold font-mono text-slate-800 dark:text-slate-100 block mt-1">
                  {customData.summary.total_input_kg} kg
                </span>
              </div>
              <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Scrap Wt</span>
                <span className="text-xl font-bold font-mono text-amber-500 block mt-1">
                  {customData.summary.total_scrap_kg} kg
                </span>
              </div>
              <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Net Consumed</span>
                <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 block mt-1">
                  {customData.summary.total_net_consumption_kg} kg
                </span>
              </div>
              <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Period Wastage %</span>
                <span className="text-xl font-bold font-mono text-rose-500 block mt-1">
                  {customData.summary.wastage_percentage}%
                </span>
              </div>
            </div>
          )}

          {/* Sub-view toggle (Detailed Transactions vs Material-wise Aggregations) */}
          {!loading && customData && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                <button
                  onClick={() => setCustomSubView('transactions')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    customSubView === 'transactions'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Detailed Transaction Records ({customData.records?.length || 0})
                </button>
                <button
                  onClick={() => setCustomSubView('materials')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    customSubView === 'materials'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Material-Wise Summary ({customData.materials?.length || 0})
                </button>
              </div>

              {customSubView === 'transactions' ? (
                <DataTable
                  columns={customTransactionColumns}
                  data={customData.records || []}
                  title={`Transactions (${customData.range_label})`}
                  exportFilename={`custom_range_records_${customStartDate || 'start'}_to_${customEndDate || 'end'}`}
                  pageSize={12}
                />
              ) : (
                <DataTable
                  columns={customMaterialSummaryColumns}
                  data={customData.materials || []}
                  title={`Material Aggregation (${customData.range_label})`}
                  exportFilename={`custom_range_materials_${customStartDate || 'start'}_to_${customEndDate || 'end'}`}
                  pageSize={12}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DAILY REPORT */}
      {reportType === 'daily' && (
        <div className="space-y-4">
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

          {error && <ErrorMessage error={error} onRetry={fetchReport} />}
          {loading && <Loading message="Synthesizing daily report from Google Sheets..." />}

          {!loading && dailyData && (
            <div className="space-y-4">
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
                  { key: 'job_number', label: 'Job Ref' },
                  { key: 'material_name', label: 'Material' },
                  { key: 'used_quantity', label: 'Sheets' },
                  { key: 'weight_per_sheet', label: 'Wt/Sh (kg)' },
                  { key: 'total_input_weight', label: 'Input Wt (kg)' },
                  { key: 'scrap_weight', label: 'Scrap (kg)' },
                  { key: 'net_consumption', label: 'Net (kg)' },
                  { key: 'wastage_percentage', label: 'Wastage %' },
                  { key: 'employee', label: 'Operator' }
                ]}
                data={dailyData.records || []}
                title="Daily Material Consumption Breakdown"
                exportFilename="daily_consumption_report"
              />
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MONTHLY REPORT */}
      {reportType === 'monthly' && (
        <div className="space-y-4">
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

          {error && <ErrorMessage error={error} onRetry={fetchReport} />}
          {loading && <Loading message="Synthesizing monthly report from Google Sheets..." />}

          {!loading && monthlyData && (
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
                  { key: 'used_sheets', label: 'Total Used Sheets' },
                  { key: 'input_weight', label: 'Total Input (kg)' },
                  { key: 'scrap_weight', label: 'Total Scrap (kg)' },
                  { key: 'net_consumption', label: 'Net Consumed (kg)' },
                  { key: 'wastage_percentage', label: 'Material Wastage %' }
                ]}
                data={monthlyData.materials || []}
                title="Monthly Aggregated Material Usage"
                exportFilename="monthly_consumption_report"
              />
            </div>
          )}
        </div>
      )}

      {/* TAB 4: RARE MATERIALS HISTORY */}
      {reportType === 'rare' && (
        <div className="space-y-4">
          {error && <ErrorMessage error={error} onRetry={fetchReport} />}
          {loading && <Loading message="Loading rare materials registry..." />}

          {!loading && rareData && (
            <DataTable
              columns={[
                { key: 'material_id', label: 'ID', className: 'w-24 font-mono text-xs' },
                { key: 'material_name', label: 'Rare Material' },
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
          )}
        </div>
      )}
    </div>
  );
}
