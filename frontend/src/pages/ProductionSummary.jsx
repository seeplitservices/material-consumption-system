import React, { useState, useEffect } from 'react';
import { Activity, Scissors, Layers, Calendar } from 'lucide-react';
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
  const totalPunching = productionList.reduce((acc, r) => acc + (parseFloat(r.total_punching) || 0), 0);
  const totalCutbit = productionList.reduce((acc, r) => acc + (parseFloat(r.total_cutbit) || 0), 0);
  const avgPunching = productionList.length > 0 ? (totalPunching / productionList.length).toFixed(1) : '0.0';

  const columns = [
    { key: 'date', label: 'Production Date', className: 'w-32 font-mono font-bold text-xs' },
    { key: 'total_punching_display', label: 'Total Sheet Punching', render: val => <span className="font-mono font-bold text-sky-600 dark:text-sky-400 text-sm">{val} sheets</span> },
    { key: 'total_cutbit_display', label: 'Cutbit / Off-cuts Used', render: val => <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-xs">{val}</span> },
    { key: 'remarks', label: 'Production Notes / References', render: val => <span className="text-slate-500 text-xs">{val || '--'}</span> },
    { key: 'updated_at', label: 'Last Updated', render: val => <span className="font-mono text-[11px] text-slate-400">{val ? new Date(val).toLocaleTimeString() : '--'}</span> }
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
            Aggregated factory metrics: Total sheet punching volume and off-cut cutbit re-use recorded per day.
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
          value={totalPunching.toFixed(1)}
          unit="sheets"
          subtitle="Cumulative sheets punched"
          icon={Activity}
          color="indigo"
        />
        <KPICard
          title="Cutbit / Off-cuts Reused"
          value={totalCutbit.toFixed(1)}
          unit="pcs"
          subtitle="Total secondary material used"
          icon={Scissors}
          color="amber"
        />
        <KPICard
          title="Recorded Production Days"
          value={productionList.length}
          unit="days"
          subtitle="Operating shifts logged"
          icon={Calendar}
          color="sky"
        />
        <KPICard
          title="Average Daily Punching"
          value={avgPunching}
          unit="sheets/day"
          subtitle="Mean daily throughput"
          icon={Layers}
          color="emerald"
        />
      </div>

      {loading ? (
        <Loading message="Syncing production summary from Google Sheets..." />
      ) : (
        <DataTable
          columns={columns}
          data={productionList}
          title={`Daily Production Ledger (${productionList.length} days)`}
          exportFilename="daily_punching_cutbit_summary"
          pageSize={10}
        />
      )}
    </div>
  );
}
