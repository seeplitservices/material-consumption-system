import React, { useState } from 'react';
import { X, Calculator, ArrowRight, Check } from 'lucide-react';

export default function WeightCalculator({ isOpen, onClose, onApplyWeight }) {
  const [length, setLength] = useState('1250');
  const [width, setWidth] = useState('2500');
  const [thickness, setThickness] = useState('1.2');
  const [density, setDensity] = useState('0.00000785');
  const [sheets, setSheets] = useState('1');

  if (!isOpen) return null;

  const l = parseFloat(length) || 0;
  const w = parseFloat(width) || 0;
  const t = parseFloat(thickness) || 0;
  const d = parseFloat(density) || 0;
  const qty = parseFloat(sheets) || 0;

  // Weight (kg) = Length × Width × Thickness × Density Coefficient
  const unitWeight = l * w * t * d;
  const totalWeight = unitWeight * qty;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 rounded-lg">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                Material Weight Calculation Engine
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Formula: Length (mm) × Width (mm) × Thickness (mm) × Density
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Inputs */}
        <div className="p-6 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Length (mm)
              </label>
              <input
                type="number"
                step="any"
                value={length}
                onChange={e => setLength(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-sky-500 font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Width (mm)
              </label>
              <input
                type="number"
                step="any"
                value={width}
                onChange={e => setWidth(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-sky-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Thickness (mm)
              </label>
              <input
                type="number"
                step="any"
                value={thickness}
                onChange={e => setThickness(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-sky-500 font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Density Coefficient
              </label>
              <input
                type="number"
                step="0.00000001"
                value={density}
                onChange={e => setDensity(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-sky-500 font-mono"
              />
              <span className="text-[10px] text-slate-400">Steel: 0.00000785</span>
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Quantity of Sheets (Optional Multiplier)
            </label>
            <input
              type="number"
              step="any"
              value={sheets}
              onChange={e => setSheets(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-sky-500 font-mono"
            />
          </div>

          {/* Real-time Calculation Result Box */}
          <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2 border border-slate-800">
            <div className="text-[11px] text-slate-400 font-mono">
              {l} × {w} × {t} × {d} = {unitWeight.toFixed(4)} kg
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-800">
              <span className="text-slate-300">Weight per Sheet:</span>
              <span className="text-lg font-bold text-sky-400 font-mono">
                {unitWeight.toFixed(2)} kg <span className="text-xs text-slate-400 font-normal">({unitWeight.toFixed(4)} exact)</span>
              </span>
            </div>
            {qty > 1 && (
              <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                <span className="text-slate-300">Total Input for {qty} Sheets:</span>
                <span className="text-lg font-bold text-emerald-400 font-mono">
                  {totalWeight.toFixed(2)} kg
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2 bg-slate-50 dark:bg-slate-900/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            Close
          </button>
          {onApplyWeight && (
            <button
              onClick={() => {
                onApplyWeight(unitWeight);
                onClose();
              }}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-500 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              Apply Weight
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
