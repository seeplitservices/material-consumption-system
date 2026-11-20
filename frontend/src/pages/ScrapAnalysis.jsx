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

  const fetchScrapData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [recRes, sumRes] = await Promise.all([
        api.get('/api/scrap'),
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
  }, []);

  const columns = [
    { key: 'date', label: 'Date', className: 'w-28 font-mono text-xs' },
    { key: 'material_name', label: 'Material Specification', render: val => <span className="font-semibold text-xs">{val}</span> },
    { key: 'sheets_used', label: 'Sheets Used', render: val => <span className="font-mono text-xs font-semibold">{val}</span> },
    { key: 'weight_per_sheet', label: 'Wt/Sheet (kg)', render: val => <span className="font-mono text-xs text-slate-500">{val} kg</span> },
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
      </div>

      {error && <ErrorMessage error={error} onRetry={fetchScrapData} />}

      {/* Summary KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPICard
            title="Total Scrap Generated"
            value={summary.total_scrap_weight}
            unit="kg"
            subtitle="Factory-wide scrap recorded"
            icon={Trash2}
            color="amber"
          />
          <KPICard
            title="Total Input Weight"
            value={summary.total_input_weight}
            unit="kg"
            subtitle="Gross sheet input weight"
            icon={TrendingUp}
            color="indigo"
          />
          <KPICard
            title="Net Material Consumed"
            value={summary.net_material_consumption}
            unit="kg"
            subtitle="Input Weight - Scrap Weight"
            icon={Scale}
            color="emerald"
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
