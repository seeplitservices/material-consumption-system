import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function ErrorMessage({ error, onRetry }) {
  return (
    <div className="p-6 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/20 text-rose-800 dark:text-rose-200 text-center max-w-lg mx-auto my-8">
      <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-3">
        <AlertCircle className="w-5 h-5" />
      </div>
      <h4 className="font-semibold text-sm mb-1 text-slate-900 dark:text-slate-100">
        Data Connection Error
      </h4>
      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
        {error || 'Unable to communicate with the Google Sheets backend service.'}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-xs transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry Connection
        </button>
      )}
    </div>
  );
}
