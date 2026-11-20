import React from 'react';
import { Calendar } from 'lucide-react';

export default function DateFilter({
  activeFilter = 'today',
  onFilterChange,
  startDate,
  endDate,
  onCustomDateChange
}) {
  const PRESETS = [
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: '7days', label: 'Last 7 Days' },
    { id: 'this_month', label: 'This Month' },
    { id: 'custom', label: 'Custom' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-xs">
      <div className="flex items-center gap-1 border-r border-slate-200 dark:border-slate-700 pr-2 mr-1">
        <Calendar className="w-4 h-4 text-slate-400 ml-1.5" />
      </div>

      <div className="flex items-center gap-1">
        {PRESETS.map(preset => (
          <button
            key={preset.id}
            onClick={() => onFilterChange(preset.id)}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
              activeFilter === preset.id
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {activeFilter === 'custom' && (
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700 text-xs">
          <input
            type="date"
            value={startDate || ''}
            onChange={e => onCustomDateChange(e.target.value, endDate)}
            className="px-2 py-1 rounded-md border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs"
          />
          <span className="text-slate-400">to</span>
          <input
            type="date"
            value={endDate || ''}
            onChange={e => onCustomDateChange(startDate, e.target.value)}
            className="px-2 py-1 rounded-md border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs"
          />
        </div>
      )}
    </div>
  );
}
