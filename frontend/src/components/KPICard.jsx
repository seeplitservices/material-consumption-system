import React from 'react';

export default function KPICard({ title, value, unit, subtitle, icon: Icon, color = 'sky', alert = false }) {
  const colorMap = {
    sky: 'bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800/60',
    emerald: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60',
    amber: 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/60',
    rose: 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/60',
    indigo: 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/60',
    slate: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
  };

  const badgeClass = colorMap[color] || colorMap.sky;

  return (
    <div className={`p-4 rounded-xl border bg-white dark:bg-slate-800/90 shadow-xs transition-all hover:shadow-md
      ${alert ? 'border-amber-400 dark:border-amber-500' : 'border-slate-200 dark:border-slate-700/80'}`}>
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {title}
        </span>
        {Icon && (
          <div className={`p-2 rounded-lg border ${badgeClass}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 font-mono">
          {value !== undefined && value !== null ? value : '--'}
        </span>
        {unit && (
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {unit}
          </span>
        )}
      </div>

      {subtitle && (
        <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 truncate">
          {subtitle}
        </div>
      )}
    </div>
  );
}
