import React, { useState, useEffect } from 'react';
import {
  Layers,
  Scale,
  Trash2,
  Percent,
  Scissors,
  ArrowRightLeft,
  Boxes,
  TrendingUp,
  RefreshCw,
  PlusCircle
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
import { api } from '../services/api';

export default function Dashboard({ onNavigateToEntry }) {
  const [filterType, setFilterType] = useState('this_month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sideFilter, setSideFilter] = useState('All');

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
        ...(filterType === 'custom' && startDate && endDate ? { start_date: startDate, end_date: endDate } : {}),
        ...(sideFilter !== 'All' ? { side: sideFilter } : {})
      });

      const [summaryRes, chartsRes] = await Promise.all([
        api.get(`/api/dashboard/summary?${queryParams.toString()}`),
        api.get(`/api/dashboard/charts?${queryParams.toString()}`)
      ]);

      if (summaryRes.success) setSummaryData(summaryRes);
      if (chartsRes.success) setChartsData(chartsRes);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [filterType, startDate, endDate, sideFilter]);

  const kpis = summaryData?.kpis || {};
  const recentTxs = summaryData?.recent_transactions || [];

  return (
    <div className="space-y-6">
      {/* Top Filter and Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
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

          {/* Side Selector */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs text-xs">
            <span className="text-slate-400 px-2 font-medium">Side:</span>
            {['All', 'Left', 'Right'].map(s => (
              <button
                key={s}
                onClick={() => setSideFilter(s)}
                className={`px-3 py-1 font-medium rounded-lg transition-colors ${
                  sideFilter === s
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchDashboardData}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-xs"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={onNavigateToEntry}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow-xs transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Daily Entry</span>
          </button>
        </div>
      </div>

      {error && <ErrorMessage error={error} onRetry={fetchDashboardData} />}

      {loading && !summaryData ? (
        <Loading message="Syncing metrics from Google Sheets..." />
      ) : (
        <>
          {/* 7 KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <KPICard
              title="Sheets Punched"
              value={kpis.total_sheets_punched}
              unit="sheets"
              subtitle="Total punched volume"
              icon={Layers}
              color="sky"
            />
            <KPICard
              title="Net Consumed"
              value={kpis.total_material_consumed_kg}
              unit="kg"
              subtitle="Total material input - scrap"
              icon={Scale}
              color="emerald"
            />
            <KPICard
              title="Scrap Generated"
              value={kpis.total_scrap_generated_kg}
              unit="kg"
              subtitle="Recorded scrap weight"
              icon={Trash2}
              color="amber"
            />
            <KPICard
              title="Overall Wastage"
              value={`${kpis.overall_wastage_percentage}%`}
              subtitle="Scrap / Input weight"
              icon={Percent}
              color={parseFloat(kpis.overall_wastage_percentage) > 10 ? 'rose' : 'indigo'}
              alert={parseFloat(kpis.overall_wastage_percentage) > 10}
            />
            <KPICard
              title="Cutbit Used"
              value={kpis.total_cutbit_used}
              unit="sheets"
              subtitle="Off-cut sheet pieces"
              icon={Scissors}
              color="slate"
            />
            <KPICard
              title="Left Stock"
              value={kpis.available_left_stock}
              unit="sheets"
              subtitle="Closing balance"
              icon={Boxes}
              color="sky"
            />
            <KPICard
              title="Right Stock"
              value={kpis.available_right_stock}
              unit="sheets"
              subtitle="Closing balance"
              icon={Boxes}
              color="emerald"
            />
          </div>

          {/* Charts Grid: 8 Industrial Analytics Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* 1. Daily Material Consumption Trend */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/90 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Daily Material Consumption Trend
                  </h3>
                  <p className="text-[11px] text-slate-400">Net consumption (kg) over time</p>
                </div>
                <TrendingUp className="w-4 h-4 text-sky-500" />
              </div>
              <div className="h-64">
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

            {/* 2. Left vs Right Material Consumption */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/90 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Left vs Right Material Consumption
                  </h3>
                  <p className="text-[11px] text-slate-400">Side-by-side consumption distribution</p>
                </div>
                <ArrowRightLeft className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartsData?.left_vs_right || []}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="side" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="consumption_kg" fill="#10b981" radius={[6, 6, 0, 0]} name="Consumption (kg)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 3. Top 5 Materials by Consumption */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/90 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Top 5 Materials by Consumption
                  </h3>
                  <p className="text-[11px] text-slate-400">Heaviest volume materials in production</p>
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartsData?.top_5_consumed || []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="material_name" type="category" tick={{ fontSize: 10 }} width={130} />
                    <Tooltip />
                    <Bar dataKey="consumed_kg" fill="#0284c7" radius={[0, 6, 6, 0]} name="Consumed (kg)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 4. Daily Scrap Weight Trend */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/90 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Daily Scrap Generation Trend
                  </h3>
                  <p className="text-[11px] text-slate-400">Scrap weight (kg) recorded per day</p>
                </div>
                <Trash2 className="w-4 h-4 text-amber-500" />
              </div>
              <div className="h-64">
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

            {/* 5. Monthly Wastage Percentage */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/90 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Monthly Wastage Percentage
                  </h3>
                  <p className="text-[11px] text-slate-400">Scrap vs total input weight ratio per month</p>
                </div>
                <Percent className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartsData?.monthly_wastage || []}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} unit="%" />
                    <Tooltip />
                    <Bar dataKey="wastage_percentage" fill="#6366f1" radius={[6, 6, 0, 0]} name="Wastage %" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 6. Top 5 Materials by Scrap Generation */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/90 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Top 5 Materials by Scrap Generation
                  </h3>
                  <p className="text-[11px] text-slate-400">Critical materials needing nesting optimization</p>
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartsData?.top_5_scrap || []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="material_name" type="category" tick={{ fontSize: 10 }} width={130} />
                    <Tooltip />
                    <Bar dataKey="scrap_kg" fill="#ef4444" radius={[0, 6, 6, 0]} name="Scrap (kg)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 7. Opening vs Closing Stock */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/90 shadow-xs lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Opening vs Closing Stock Comparison
                  </h3>
                  <p className="text-[11px] text-slate-400">Inventory balance dynamics per key material</p>
                </div>
                <Boxes className="w-4 h-4 text-sky-500" />
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartsData?.stock_comparison || []}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="material_name" tick={{ fontSize: 10 }} />
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
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Recent Daily Transactions
              </h3>
              <span className="text-xs text-slate-400">Latest activity from Google Sheets</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Job / Shift</th>
                    <th className="py-2.5 px-3">Side</th>
                    <th className="py-2.5 px-3">Material</th>
                    <th className="py-2.5 px-3">Used</th>
                    <th className="py-2.5 px-3">Input Wt</th>
                    <th className="py-2.5 px-3">Scrap Wt</th>
                    <th className="py-2.5 px-3">Wastage %</th>
                    <th className="py-2.5 px-3">Closing Stock</th>
                    <th className="py-2.5 px-3">Operator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                  {recentTxs.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-6 text-center text-slate-400 font-sans">
                        No transactions recorded yet. Click "New Daily Entry" to record production.
                      </td>
                    </tr>
                  ) : (
                    recentTxs.map(tx => (
                      <tr key={tx.entry_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-2.5 px-3">{tx.entry_date}</td>
                        <td className="py-2.5 px-3 font-sans">
                          <span className="font-medium text-slate-800 dark:text-slate-200">{tx.job_number || 'N/A'}</span>
                          <span className="text-[10px] text-slate-400 block">{tx.shift}</span>
                        </td>
                        <td className="py-2.5 px-3 font-sans">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            tx.side === 'Left'
                              ? 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300'
                              : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                          }`}>
                            {tx.side}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-sans font-medium text-slate-800 dark:text-slate-200">
                          {tx.material_name}
                        </td>
                        <td className="py-2.5 px-3">{tx.used_quantity}</td>
                        <td className="py-2.5 px-3">{tx.total_input_weight} kg</td>
                        <td className="py-2.5 px-3 text-amber-600 dark:text-amber-400">{tx.scrap_weight} kg</td>
                        <td className="py-2.5 px-3 font-semibold text-rose-500">{tx.wastage_percentage}%</td>
                        <td className="py-2.5 px-3 font-semibold text-sky-600 dark:text-sky-400">{tx.closing_stock}</td>
                        <td className="py-2.5 px-3 font-sans text-slate-500">{tx.employee}</td>
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
