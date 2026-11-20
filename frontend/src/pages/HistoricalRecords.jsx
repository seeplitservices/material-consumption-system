import React, { useState, useEffect } from 'react';
import { History, Filter, Edit, Search, CheckCircle2, X } from 'lucide-react';
import DataTable from '../components/DataTable';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';
import Toast from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function HistoricalRecords() {
  const { isAdmin } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sideFilter, setSideFilter] = useState('All');

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [editUsedQty, setEditUsedQty] = useState('');
  const [editScrapWt, setEditScrapWt] = useState('');
  const [editCutbit, setEditCutbit] = useState('');
  const [editRemarks, setEditRemarks] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  const fetchEntries = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        ...(startDate ? { start_date: startDate } : {}),
        ...(endDate ? { end_date: endDate } : {}),
        ...(sideFilter !== 'All' ? { side: sideFilter } : {})
      });
      const res = await api.get(`/api/entries?${params.toString()}`);
      if (res.success) {
        setEntries(res.entries || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch historical entries.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [startDate, endDate, sideFilter]);

  const openEditModal = (entry) => {
    setSelectedEntry(entry);
    setEditUsedQty(String(entry.used_quantity || 0));
    setEditScrapWt(String(entry.scrap_weight || 0));
    setEditCutbit(String(entry.cutbit_used || 0));
    setEditRemarks(entry.remarks || '');
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEntry) return;

    setEditSubmitting(true);
    try {
      const payload = {
        used_quantity: parseFloat(editUsedQty),
        scrap_weight: parseFloat(editScrapWt),
        cutbit_used: parseFloat(editCutbit),
        remarks: editRemarks.trim()
      };

      const res = await api.put(`/api/entries/${selectedEntry.entry_id}`, payload);
      if (res.success) {
        setToast({ type: 'success', message: 'Transaction updated and audited in Google Sheets.' });
        setIsEditOpen(false);
        fetchEntries();
      }
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to update transaction.' });
    } finally {
      setEditSubmitting(false);
    }
  };

  const columns = [
    { key: 'entry_id', label: 'Entry ID', className: 'w-24 font-mono text-[11px] text-slate-500' },
    { key: 'entry_date', label: 'Date', className: 'w-24 font-mono text-xs' },
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
    {
      key: 'job_number',
      label: 'Job / Shift',
      render: (val, row) => (
        <div>
          <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 block">{val || 'N/A'}</span>
          <span className="text-[10px] text-slate-400">{row.shift} Shift</span>
        </div>
      )
    },
    { key: 'material_name', label: 'Material', render: val => <span className="font-medium text-xs">{val}</span> },
    { key: 'opening_stock_display', label: 'Opening', render: val => <span className="font-mono text-xs text-slate-500">{val}</span> },
    { key: 'used_quantity_display', label: 'Used', render: val => <span className="font-mono font-bold text-sky-600 dark:text-sky-400 text-xs">{val}</span> },
    { key: 'closing_stock_display', label: 'Closing', render: val => <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs">{val}</span> },
    { key: 'total_input_weight_display', label: 'Input Wt (kg)', render: val => <span className="font-mono text-xs">{val} kg</span> },
    { key: 'scrap_weight_display', label: 'Scrap Wt (kg)', render: val => <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-xs">{val} kg</span> },
    { key: 'wastage_percentage_display', label: 'Wastage %', render: val => <span className="font-mono font-bold text-rose-500 text-xs">{val}%</span> },
    { key: 'cutbit_used_display', label: 'Cutbit', render: val => <span className="font-mono text-xs">{val}</span> },
    { key: 'employee', label: 'Operator', render: val => <span className="text-slate-500 text-[11px]">{val}</span> },
    {
      key: 'actions',
      label: 'Edit',
      sortable: false,
      render: (_, row) => (
        isAdmin ? (
          <button
            onClick={() => openEditModal(row)}
            className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 text-slate-600 dark:text-slate-300 transition-colors"
            title="Edit historical transaction"
          >
            <Edit className="w-3.5 h-3.5 text-sky-500" />
          </button>
        ) : null
      )
    }
  ];

  return (
    <div className="space-y-6">
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Header and Filter */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/90 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Historical Material Usage Archive
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Complete transaction ledger stored in Sheet 2: Daily_Entries. All modifications trigger reconciliation and audit logging.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono"
            />
          </div>
          <select
            value={sideFilter}
            onChange={e => setSideFilter(e.target.value)}
            className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
          >
            <option value="All">All Sides</option>
            <option value="Left">Left Side Only</option>
            <option value="Right">Right Side Only</option>
          </select>
        </div>
      </div>

      {error && <ErrorMessage error={error} onRetry={fetchEntries} />}

      {loading ? (
        <Loading message="Reading historical entries from Google Sheets..." />
      ) : (
        <DataTable
          columns={columns}
          data={entries}
          title={`Archived Entries (${entries.length})`}
          exportFilename="historical_material_entries"
          pageSize={12}
        />
      )}

      {/* Edit Historical Entry Modal */}
      {isEditOpen && selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md shadow-xl overflow-hidden p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Edit Historical Transaction ({selectedEntry.entry_id})
              </h3>
              <button onClick={() => setIsEditOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-1">
                <span className="font-bold text-slate-900 dark:text-slate-100 block">
                  {selectedEntry.material_name}
                </span>
                <span className="text-[11px] text-slate-500 block">
                  Date: {selectedEntry.entry_date} &bull; Side: {selectedEntry.side} &bull; Opening: {selectedEntry.opening_stock}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Used Quantity (Sheets) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={editUsedQty}
                    onChange={e => setEditUsedQty(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Scrap Weight (kg) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={editScrapWt}
                    onChange={e => setEditScrapWt(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Cutbit Used
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={editCutbit}
                  onChange={e => setEditCutbit(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono text-sm"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Remarks / Modification Reason
                </label>
                <input
                  type="text"
                  placeholder="Reason for historical change..."
                  value={editRemarks}
                  onChange={e => setEditRemarks(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs"
                />
              </div>

              <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300">
                Notice: Modifying this entry will recalculate total input weight, closing stock balance, and register an entry in Sheet 9: Audit_Log.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 hover:bg-slate-100 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold shadow-xs disabled:opacity-50"
                >
                  {editSubmitting ? 'Saving...' : 'Update & Reconcile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
