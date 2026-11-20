import React, { useState, useEffect } from 'react';
import { Activity, Scissors, Layers, Calendar, Filter } from 'lucide-react';
import KPICard from '../components/KPICard';
import DataTable from '../components/DataTable';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';
import { api } from '../services/api';

export default function ProductionSummary() {
  const [productionList, setProductionList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateFilter, setDateFilter] = useState('');

  const fetchProduction = async () => {
    setLoading(true);
    setError(null);
    try {
      const query = dateFilter ? `?date=${dateFilter}` : '';
      const res = await api.get(`/api/production${query}`);
      if (res.success) {
        setProductionList(res.production || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load production summary.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProduction();
  }, [dateFilter]);

  // Aggregate totals across loaded records
  const totalLeftPunch = productionList.reduce((acc, r) => acc + (parseFloat(r.left_total_punching) || 0), 0);
  const totalRightPunch = productionList.reduce((acc, r) => acc + (parseFloat(r.right_total_punching) || 0), 0);
  const totalOverallPunch = productionList.reduce((acc, r) => acc + (parseFloat(r.overall_total_punching) || 0), 0);
  const totalCutbit = productionList.reduce((acc, r) => acc + (parseFloat(r.overall_cutbit) || 0), 0);

  const columns = [
    { key: 'date', label: 'Date', className: 'w-28 font-mono font-bold text-xs' },
    { key: 'left_total_punching_display', label: 'Left Punching (Sheets)', render: val => <span className="font-mono text-sky-600 dark:text-sky-400 font-bold">{val}</span> },
    { key: 'right_total_punching_display', label: 'Right Punching (Sheets)', render: val => <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{val}</span> },
    { key: 'overall_total_punching_display', label: 'Overall Punching (Sheets)', render: val => <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{val}</span> },
    { key: 'left_cutbit_display', label: 'Left Cutbit', render: val => <span className="font-mono text-slate-600 dark:text-slate-400">{val}</span> },
    { key: 'right_cutbit_display', label: 'Right Cutbit', render: val => <span className="font-mono text-slate-600 dark:text-slate-400">{val}</span> },
    { key: 'overall_cutbit_display', label: 'Total Cutbit Used', render: val => <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{val}</span> },
    { key: 'remarks', label: 'Production Notes', render: val => <span className="text-slate-500 text-[11px]">{val || '--'}</span> }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/90 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Daily Production Summary: Punching & Cutbit Tracking
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Aggregated factory metrics: Left Side Punching, Right Side Punching, Total Punching, and Off-cut Cutbit usage per day.
          </p>
        </div>

        {/* Date Filter Input */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-500">Filter Date:</label>
          <input
            type="date"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-mono"
          />
          {dateFilter && (
            <button
              onClick={() => setDateFilter('')}
              className="text-xs text-slate-500 hover:text-slate-800 underline"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {error && <ErrorMessage error={error} onRetry={fetchProduction} />}

      {/* Aggregate KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard
          title="Overall Punching Volume"
          value={totalOverallPunch.toFixed(1)}
          unit="sheets"
          subtitle="All recorded days"
          icon={Activity}
          color="indigo"
        />
        <KPICard
          title="Left Side Total Punching"
          value={totalLeftPunch.toFixed(1)}
          unit="sheets"
          subtitle="Left side sum"
          icon={Layers}
          color="sky"
        />
        <KPICard
          title="Right Side Total Punching"
          value={totalRightPunch.toFixed(1)}
          unit="sheets"
          subtitle="Right side sum"
          icon={Layers}
          color="emerald"
        />
        <KPICard
          title="Total Cutbit Pieces Used"
          value={totalCutbit.toFixed(1)}
          unit="sheets"
          subtitle="Off-cut sheet pieces"
          icon={Scissors}
          color="amber"
        />
      </div>

      {loading ? (
        <Loading message="Fetching production summaries from Google Sheets..." />
      ) : (
        <DataTable
          columns={columns}
          data={productionList}
          title={`Daily Production Records (${productionList.length})`}
          exportFilename="daily_production_summary"
          pageSize={10}
        />
      )}
    </div>
  );
}
