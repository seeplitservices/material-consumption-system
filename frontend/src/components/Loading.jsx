import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Loading({ message = 'Loading Google Sheets data...' }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <div className="relative">
        <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
      </div>
      <p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400 animate-pulse">
        {message}
      </p>
    </div>
  );
}
