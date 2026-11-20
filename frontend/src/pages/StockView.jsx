import React, { useState, useEffect } from 'react';
import {
  Layers,
  Sliders,
  Calendar,
  AlertCircle,
  PlusCircle,
  History,
  CheckCircle2,
  X
} from 'lucide-react';
import DataTable from '../components/DataTable';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';
import Toast from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function StockView({ side = 'Left' }) {
  const { user, isAdmin } = useAuth();
  const [stockList, setStockList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // Adjustment Modal State
  const [isAdjOpen, setIsAdjOpen] = useState(false);
  const [selectedMat, setSelectedMat] = useState(null);
  const [adjQty, setAdjQty] = useState('');
  const [adjReason, setAdjReason] = useState('');
  const [adjSubmitting, setAdjSubmitting] = useState(false);

  // Initial Config Modal State
  const [isInitOpen, setIsInitOpen] = useState(false);
  const [initQty, setInitQty] = useState('');
  const [initDate, setInitDate] = useState('2026-11-01');
  const [initSubmitting, setInitSubmitting] = useState(false);

  const fetchStock = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/api/stock/${side.toLowerCase()}`);
      if (res.success) {
        setStockList(res.stock || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load stock data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStock();
  }, [side]);

  // Open Adjustment
  const openAdjustmentModal = (mat) => {
    setSelectedMat(mat);
    setAdjQty('');
    setAdjReason('');
    setIsAdjOpen(true);
  };

  const handleStockAdjustment = async (e) => {
    e.preventDefault();
    if (!adjQty || !adjReason.trim()) {
      setToast({ type: 'warning', message: 'Quantity and adjustment reason are required.' });
      return;
    }

    setAdjSubmitting(true);
    try {
      const res = await api.post('/api/stock/adjustment', {
        side,
        material_id: selectedMat.material_id,
        adjustment_quantity: parseFloat(adjQty),
        adjustment_reason: adjReason.trim(),
        employee: user?.name || 'Admin'
      });
      if (res.success) {
        setToast({ type: 'success', message: res.message });
        setIsAdjOpen(false);
        fetchStock();
      }
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Adjustment failed.' });
    } finally {
      setAdjSubmitting(false);
    }
  };

  // Open Initial Stock Config
  const openInitModal = (mat) => {
    setSelectedMat(mat);
    setInitQty('');
    setIsInitOpen(true);
  };

  const handleInitialStockConfig = async (e) => {
    e.preventDefault();
    if (!initQty) {
      setToast({ type: 'warning', message: 'Initial stock quantity is required.' });
      return;
    }

    setInitSubmitting(true);
    try {
      const res = await api.post('/api/stock/configure-initial', {
        side,
        material_id: selectedMat.material_id,
        initial_stock: parseFloat(initQty),
        date: initDate
      });
      if (res.success) {
        setToast({ type: 'success', message: res.message });
        setIsInitOpen(false);
        fetchStock();
      }
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to configure initial stock.' });
    } finally {
      setInitSubmitting(false);
    }
  };

  const columns = [
    { key: 's_no', label: 'S.No', className: 'w-12 text-center' },
    {
      key: 'material_name',
      label: 'Material Specification',
      render: (val, row) => (
        <div>
          <span className="font-semibold text-slate-900 dark:text-slate-100 block">{val}</span>
          <span className="text-[10px] text-slate-400 font-mono">{row.material_id} &bull; {row.category}</span>
        </div>
      )
    },
    {
      key: 'opening_stock_display',
      label: 'Opening Stock',
      render: (val, row) => (
        row.is_configured ? (
          <span className="font-mono">{val}</span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            <AlertCircle className="w-3 h-3" />
            Not Configured
          </span>
        )
      )
    },
    { key: 'stock_received', label: 'Received', render: val => <span className="font-mono">{val || 0}</span> },
    { key: 'punching_stock', label: 'Punching/Used', render: val => <span className="font-mono font-bold text-sky-600 dark:text-sky-400">{val || 0}</span> },
    {
      key: 'closing_stock_display',
      label: 'Closing Stock',
      render: (val, row) => (
        row.is_configured ? (
          <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{val} sheets</span>
        ) : (
          <span className="text-[11px] text-slate-400 italic">Pending Config</span>
        )
      )
    },
    { key: 'weight_per_sheet_display', label: 'Weight/Sheet', render: val => <span className="font-mono text-slate-500">{val} kg</span> },
    { key: 'total_used_weight_display', label: 'Used Wt (kg)', render: val => <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{val} kg</span> },
    { key: 'remarks', label: 'Remarks', render: val => <span className="text-slate-500 text-[11px]">{val || '--'}</span> },
    {
      key: 'actions',
      label: 'Action',
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-1.5">
          {!row.is_configured && isAdmin && (
            <button
              onClick={() => openInitModal(row)}
              className="px-2 py-1 text-[11px] font-semibold rounded bg-amber-500 hover:bg-amber-400 text-white transition-colors"
            >
              Set Opening
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => openAdjustmentModal(row)}
              className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
              title="Manual Stock Adjustment"
            >
              <Sliders className="w-3.5 h-3.5 text-sky-500" />
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Header Overview Card */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/90 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider ${
              side === 'Left'
                ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
            }`}>
              {side} Side Inventory
            </span>
            <span className="text-xs text-slate-400">&bull; Single Source of Truth: Google Sheets</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
            {side} Side Material Stock Ledger
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Formula: Closing Stock = Opening Stock + Stock Received - Sheets Used. Next day's opening stock automatically mirrors closing stock.
          </p>
        </div>
      </div>

      {error && <ErrorMessage error={error} onRetry={fetchStock} />}

      {loading ? (
        <Loading message={`Retrieving ${side} Side stock balances from Google Sheets...`} />
      ) : (
        <DataTable
          columns={columns}
          data={stockList}
          title={`${side} Side Materials (${stockList.length})`}
          exportFilename={`${side.toLowerCase()}_stock_ledger`}
          pageSize={12}
        />
      )}

      {/* Manual Stock Adjustment Modal */}
      {isAdjOpen && selectedMat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md shadow-xl overflow-hidden p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Manual Stock Adjustment ({side} Side)
              </h3>
              <button onClick={() => setIsAdjOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleStockAdjustment} className="mt-4 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-400 block text-[10px] uppercase">Selected Material</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {selectedMat.material_name}
                </span>
                <span className="text-slate-500 block text-[11px] mt-0.5">
                  Current Balance: {selectedMat.closing_stock !== null ? `${selectedMat.closing_stock} sheets` : 'Not Configured'}
                </span>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Adjustment Quantity (positive to add, negative to reduce)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. +10 or -5"
                  value={adjQty}
                  onChange={e => setAdjQty(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-sm"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Adjustment Reason (Mandatory Audit Trail)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Physical stock audit correction, supplier return, damaged sheet disposal..."
                  value={adjReason}
                  onChange={e => setAdjReason(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdjOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 hover:bg-slate-100 text-slate-700 dark:text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjSubmitting}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold shadow-xs disabled:opacity-50"
                >
                  {adjSubmitting ? 'Saving...' : 'Apply Stock Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Configure Initial Stock Modal */}
      {isInitOpen && selectedMat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md shadow-xl overflow-hidden p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Configure Initial Opening Stock ({side} Side)
              </h3>
              <button onClick={() => setIsInitOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleInitialStockConfig} className="mt-4 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200">
                <span className="font-semibold block">{selectedMat.material_name}</span>
                <span className="text-[11px] block mt-0.5">
                  This material was marked "Not Configured". Setting an opening stock will initialize its inventory ledger.
                </span>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Initial Stock Quantity (Sheets)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="e.g. 50"
                  value={initQty}
                  onChange={e => setInitQty(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-sm"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Baseline Effective Date
                </label>
                <input
                  type="date"
                  value={initDate}
                  onChange={e => setInitDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsInitOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 hover:bg-slate-100 text-slate-700 dark:text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={initSubmitting}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-xs disabled:opacity-50"
                >
                  {initSubmitting ? 'Saving...' : 'Confirm Initial Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export function LeftStock() {
  return <StockView side="Left" />;
}

export function RightStock() {
  return <StockView side="Right" />;
}
