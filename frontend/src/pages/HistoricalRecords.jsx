import React, { useState, useEffect } from 'react';
import { History, Filter, Edit, Search, CheckCircle2, X } from 'lucide-react';
import DataTable from '../components/DataTable';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';
import Toast from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function HistoricalRecords() {
  const { isDirector } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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
        ...(endDate ? { end_date: endDate } : {})
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
  }, [startDate, endDate]);

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
    { key: 'used_quantity_display', label: 'Used Sheets', render: val => <span className="font-mono font-bold text-sky-600 dark:text-sky-400 text-xs">{val}</span> },
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
        isDirector ? (
          <button
            onClick={() => openEditModal(row)}
            className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
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
            Complete transaction ledger stored in Sheet: Daily_Entries. All modifications trigger reconciliation and audit logging.
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
          {(startDate || endDate) && (
            <button
              onClick={() => { setStartDate(''); setEndDate(''); }}
              className="text-xs text-slate-500 hover:text-slate-800 underline"
            >
              Clear Filter
            </button>
          )}
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

      {/* Edit Entry Modal */}
      {isEditOpen && selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  Edit Transaction Record
                </h3>
                <p className="text-[11px] text-slate-400 font-mono">
                  ID: {selectedEntry.entry_id} &bull; Date: {selectedEntry.entry_date}
                </p>
              </div>
              <button
                onClick={() => setIsEditOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <span className="font-medium text-slate-600 dark:text-slate-300">Material:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{selectedEntry.material_name}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Used / Punching Quantity
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editUsedQty}
                    onChange={e => setEditUsedQty(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Scrap Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editScrapWt}
                    onChange={e => setEditScrapWt(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Cutbit Used (pieces)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editCutbit}
                  onChange={e => setEditCutbit(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Modification Reason & Remarks
                </label>
                <textarea
                  value={editRemarks}
                  onChange={e => setEditRemarks(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                  placeholder="Reason for modifying this historical entry..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold shadow-xs disabled:opacity-50"
                >
                  {editSubmitting ? 'Updating...' : 'Save & Reconcile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
