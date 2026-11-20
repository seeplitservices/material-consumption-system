import React, { useState, useEffect } from 'react';
import { Trash2, Percent, Scale, TrendingUp, AlertTriangle } from 'lucide-react';
import KPICard from '../components/KPICard';
import DataTable from '../components/DataTable';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';
import { api } from '../services/api';

export default function ScrapAnalysis() {
  const [scrapRecords, setScrapRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sideFilter, setSideFilter] = useState('All');

  const fetchScrapData = async () => {
    setLoading(true);
    setError(null);
    try {
      const query = sideFilter !== 'All' ? `?side=${sideFilter}` : '';
      const [recRes, sumRes] = await Promise.all([
        api.get(`/api/scrap${query}`),
        api.get('/api/scrap/summary')
      ]);

      if (recRes.success) setScrapRecords(recRes.records || []);
      if (sumRes.success) setSummary(sumRes);
    } catch (err) {
      setError(err.message || 'Failed to load scrap data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScrapData();
  }, [sideFilter]);

  const columns = [
    { key: 'date', label: 'Date', className: 'w-24 font-mono text-xs' },
    {
      key: 'side',
      label: 'Side',
      render: val => (
        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
          val === 'Left'
            ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
        }`}>
          {val}
        </span>
      )
    },
    { key: 'material_name', label: 'Material Specification', render: val => <span className="font-semibold text-xs">{val}</span> },
    { key: 'total_input_weight_display', label: 'Input Wt (kg)', render: val => <span className="font-mono text-xs">{val} kg</span> },
    { key: 'scrap_weight_display', label: 'Scrap Wt (kg)', render: val => <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-xs">{val} kg</span> },
    { key: 'net_consumption_display', label: 'Net Consumed (kg)', render: val => <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">{val} kg</span> },
    {
      key: 'wastage_percentage_display',
      label: 'Wastage %',
      render: val => (
        <span className={`font-mono font-bold text-xs ${parseFloat(val) > 10 ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300'}`}>
          {val}%
        </span>
      )
    },
    { key: 'remarks', label: 'Remarks', render: val => <span className="text-slate-500 text-[11px]">{val || '--'}</span> },
    { key: 'employee', label: 'Operator', render: val => <span className="text-slate-500 text-[11px]">{val || '--'}</span> }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/90 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Scrap Generation & Wastage Analytics
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Formula: Net Consumption = Input Weight - Scrap Weight &bull; Wastage % = (Scrap Weight / Input Weight) × 100
          </p>
        </div>

        {/* Side Selector */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
          {['All', 'Left', 'Right'].map(s => (
            <button
              key={s}
              onClick={() => setSideFilter(s)}
              className={`px-3 py-1 font-medium rounded-lg transition-colors ${
                sideFilter === s
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {s} Side
            </button>
          ))}
        </div>
      </div>

      {error && <ErrorMessage error={error} onRetry={fetchScrapData} />}

      {/* Summary KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <KPICard
            title="Total Scrap Generated"
            value={summary.total_scrap_weight}
            unit="kg"
            subtitle="Combined Left & Right"
            icon={Trash2}
            color="amber"
          />
          <KPICard
            title="Left Side Scrap"
            value={summary.left_scrap_weight}
            unit="kg"
            subtitle="Left operations"
            icon={Scale}
            color="sky"
          />
          <KPICard
            title="Right Side Scrap"
            value={summary.right_scrap_weight}
            unit="kg"
            subtitle="Right operations"
            icon={Scale}
            color="emerald"
          />
          <KPICard
            title="Total Input Weight"
            value={summary.total_input_weight}
            unit="kg"
            subtitle="Gross material sheet weight"
            icon={TrendingUp}
            color="indigo"
          />
          <KPICard
            title="Overall Wastage %"
            value={`${summary.overall_wastage_percentage}%`}
            subtitle="Total Scrap / Total Input"
            icon={Percent}
            color={parseFloat(summary.overall_wastage_percentage) > 10 ? 'rose' : 'emerald'}
            alert={parseFloat(summary.overall_wastage_percentage) > 10}
          />
        </div>
      )}

      {loading ? (
        <Loading message="Syncing scrap records from Google Sheets..." />
      ) : (
        <DataTable
          columns={columns}
          data={scrapRecords}
          title={`Scrap Records (${scrapRecords.length})`}
          exportFilename="scrap_and_wastage_records"
          pageSize={10}
        />
      )}
    </div>
  );
}
