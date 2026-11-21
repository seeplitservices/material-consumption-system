import React, { useState, useEffect } from 'react';
import {
  Layers,
  Scale,
  Trash2,
  Percent,
  Scissors,
  Boxes,
  TrendingUp,
  RefreshCw,
  PlusCircle,
  Download,
  Printer
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';

import KPICard from '../components/KPICard';
import DateFilter from '../components/DateFilter';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';
import { printPDFReport } from '../utils/exportUtils';
import { api } from '../services/api';

export default function Dashboard({ onNavigateToEntry }) {
  const [filterType, setFilterType] = useState('this_month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summaryData, setSummaryData] = useState(null);
  const [chartsData, setChartsData] = useState(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({
        filter: filterType,
        ...(filterType === 'custom' && startDate && endDate ? { start_date: startDate, end_date: endDate } : {})
      });

      const [summaryRes, chartsRes] = await Promise.all([
        api.get(`/api/dashboard/summary?${queryParams.toString()}`),
        api.get(`/api/dashboard/charts?${queryParams.toString()}`)
      ]);

      if (summaryRes && summaryRes.success) {
        setSummaryData(summaryRes);
      }
      if (chartsRes && chartsRes.success) {
        setChartsData(chartsRes);
      }
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [filterType, startDate, endDate]);

  const kpis = summaryData?.kpis || {};
  const recentTxs = summaryData?.recent_transactions || [];

  // Download Dashboard Executive PDF Report
  const handleDownloadPDF = () => {
    const periodLabel = filterType === 'custom'
      ? `${startDate || 'Earliest'} to ${endDate || 'Latest'}`
      : filterType.replace('_', ' ').toUpperCase();

    const title = `Saravanan Electricals - Manufacturing Executive Dashboard Report (${periodLabel})`;

    const headers = [
      { key: 'entry_date', label: 'Date' },
      { key: 'job_number', label: 'Job Ref' },
      { key: 'shift', label: 'Shift' },
      { key: 'material_name', label: 'Material' },
      { key: 'used_quantity', label: 'Sheets Used' },
      { key: 'total_input_weight', label: 'Input Wt (kg)' },
      { key: 'scrap_weight', label: 'Scrap Wt (kg)' },
      { key: 'wastage_percentage', label: 'Wastage %' },
      { key: 'closing_stock', label: 'Closing Stock' },
      { key: 'employee', label: 'Operator' }
    ];

    const summaryMetrics = {
      "Total Sheets Punched": `${kpis.total_sheets_punched || 0} sheets`,
      "Net Material Consumed": `${kpis.total_material_consumed_kg || 0} kg`,
      "Scrap Generated": `${kpis.total_scrap_generated_kg || 0} kg`,
      "Overall Wastage Ratio": `${kpis.overall_wastage_percentage || 0}%`,
      "Cutbit Used": `${kpis.total_cutbit_used || 0} pieces`,
      "Total Stock Balance": `${kpis.total_available_stock || 0} sheets`
    };

    printPDFReport(title, headers, recentTxs, summaryMetrics);
  };

  return (
    <div className="space-y-6">
      {/* Top Filter and Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
        <DateFilter
          activeFilter={filterType}
          onFilterChange={setFilterType}
          startDate={startDate}
          endDate={endDate}
          onCustomDateChange={(s, e) => {
            setStartDate(s);
            setEndDate(e);
          }}
        />

        <div className="flex flex-wrap items-center gap-2">
          {/* Download as PDF Button */}
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-xs transition-colors"
            title="Download executive dashboard report as PDF"
          >
            <Download className="w-3.5 h-3.5 text-red-500" />
            <span>Download as PDF</span>
          </button>

          <button
            onClick={fetchDashboardData}
            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={onNavigateToEntry}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs shadow-xs transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Daily Entry</span>
          </button>
        </div>
      </div>

      {error && <ErrorMessage error={error} onRetry={fetchDashboardData} />}

      {loading && !summaryData ? (
        <Loading message="Syncing executive metrics from Google Sheets..." />
      ) : (
        <>
          {/* Executive KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
            <KPICard
              title="Sheets Punched"
              value={kpis.total_sheets_punched || 0}
              unit="sheets"
              subtitle="Total punched volume"
              icon={Layers}
              color="sky"
            />
            <KPICard
              title="Net Consumed"
              value={kpis.total_material_consumed_kg || 0}
              unit="kg"
              subtitle="Gross weight - scrap"
              icon={Scale}
              color="emerald"
            />
            <KPICard
              title="Scrap Generated"
              value={kpis.total_scrap_generated_kg || 0}
              unit="kg"
              subtitle="Factory scrap weight"
              icon={Trash2}
              color="amber"
            />
            <KPICard
              title="Overall Wastage"
              value={`${kpis.overall_wastage_percentage || 0}%`}
              subtitle="Scrap / Input weight"
              icon={Percent}
              color={parseFloat(kpis.overall_wastage_percentage || 0) > 10 ? 'rose' : 'indigo'}
              alert={parseFloat(kpis.overall_wastage_percentage || 0) > 10}
            />
            <KPICard
              title="Cutbit Used"
              value={kpis.total_cutbit_used || 0}
              unit="sheets"
              subtitle="Off-cut sheet pieces"
              icon={Scissors}
              color="slate"
            />
            <KPICard
              title="Available Stock"
              value={kpis.total_available_stock || 0}
              unit="sheets"
              subtitle="Total inventory balance"
              icon={Boxes}
              color="sky"
            />
          </div>

          {/* Charts Grid: Factory Executive Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            
            {/* 1. Daily Material Consumption Trend */}
            <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Daily Material Consumption Trend
                  </h3>
                  <p className="text-[11px] text-slate-500">Net consumption (kg) over time</p>
                </div>
                <TrendingUp className="w-4 h-4 text-sky-500" />
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartsData?.daily_trend || []}>
                    <defs>
                      <linearGradient id="colorCons" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#0284c7" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="consumption_kg" stroke="#0284c7" fillOpacity={1} fill="url(#colorCons)" name="Net Consumed (kg)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 2. Top 5 Materials by Consumption */}
            <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Top 5 Materials by Consumption
                  </h3>
                  <p className="text-[11px] text-slate-500">Highest volume materials consumed</p>
                </div>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartsData?.top_5_consumed || []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="material_name" type="category" tick={{ fontSize: 9 }} width={120} />
                    <Tooltip />
                    <Bar dataKey="consumed_kg" fill="#0284c7" radius={[0, 6, 6, 0]} name="Consumed (kg)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 3. Daily Scrap Generation Trend */}
            <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Daily Scrap Generation Trend
                  </h3>
                  <p className="text-[11px] text-slate-500">Scrap weight (kg) recorded per day</p>
                </div>
                <Trash2 className="w-4 h-4 text-amber-500" />
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartsData?.daily_trend || []}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="scrap_kg" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="Scrap (kg)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 4. Opening vs Closing Stock Comparison */}
            <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Opening vs Closing Stock Comparison
                  </h3>
                  <p className="text-[11px] text-slate-500">Inventory balance dynamics per material</p>
                </div>
                <Boxes className="w-4 h-4 text-sky-500" />
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartsData?.stock_comparison || []}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="material_name" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="opening_stock" fill="#94a3b8" radius={[4, 4, 0, 0]} name="Opening Stock" />
                    <Bar dataKey="closing_stock" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="Closing Stock" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Recent Transactions Table */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-800">
                Recent Daily Transactions
              </h3>
              <span className="text-xs text-slate-400">Live from Google Sheets (Daily_Entries)</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] text-slate-600 uppercase tracking-wider font-semibold">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Job / Shift</th>
                    <th className="py-2.5 px-3">Material</th>
                    <th className="py-2.5 px-3">Used</th>
                    <th className="py-2.5 px-3">Input Wt</th>
                    <th className="py-2.5 px-3">Scrap Wt</th>
                    <th className="py-2.5 px-3">Wastage %</th>
                    <th className="py-2.5 px-3">Closing Stock</th>
                    <th className="py-2.5 px-3">Operator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {recentTxs.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-6 text-center text-slate-400 font-sans">
                        No transactions recorded yet. Data is clean and ready for daily operations.
                      </td>
                    </tr>
                  ) : (
                    recentTxs.map(tx => (
                      <tr key={tx.entry_id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3">{tx.entry_date}</td>
                        <td className="py-2.5 px-3 font-sans">
                          <span className="font-semibold text-slate-800">{tx.job_number || 'N/A'}</span>
                          <span className="text-[10px] text-slate-500 block">{tx.shift}</span>
                        </td>
                        <td className="py-2.5 px-3 font-sans font-medium text-slate-800">
                          {tx.material_name}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-sky-600">{tx.used_quantity}</td>
                        <td className="py-2.5 px-3">{tx.total_input_weight} kg</td>
                        <td className="py-2.5 px-3 text-amber-600 font-semibold">{tx.scrap_weight} kg</td>
                        <td className="py-2.5 px-3 font-semibold text-rose-500">{tx.wastage_percentage}%</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{tx.closing_stock}</td>
                        <td className="py-2.5 px-3 font-sans text-slate-600">{tx.employee}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
