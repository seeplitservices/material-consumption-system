import React, { useState, useEffect } from 'react';
import { History, Filter, Edit, Search, CheckCircle2, X, Trash2, AlertTriangle, Printer, Download } from 'lucide-react';
import DataTable from '../components/DataTable';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';
import Toast from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { printPDFReport } from '../utils/exportUtils';

export default function HistoricalRecords() {
  const { isDirector } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Delete Confirm Dialog State
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, entry: null });
  const [deleting, setDeleting] = useState(false);

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [editJobNumber, setEditJobNumber] = useState('');
  const [editShift, setEditShift] = useState('Day');
  const [editEmployee, setEditEmployee] = useState('');
  const [editOpeningStock, setEditOpeningStock] = useState('');
  const [editUsedQty, setEditUsedQty] = useState('');
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
        const rawList = res.entries || [];
        const normalized = rawList.map(r => {
          let dateStr = r.entry_date || '';
          if (typeof dateStr === 'string' && dateStr.includes('T')) {
            dateStr = dateStr.split('T')[0];
          }
          const op = (r.opening_stock !== undefined && r.opening_stock !== null && r.opening_stock !== '') ? Number(r.opening_stock) : 0;
          const used = (r.used_quantity !== undefined && r.used_quantity !== null && r.used_quantity !== '') ? Number(r.used_quantity) : 0;
          const cl = (r.closing_stock !== undefined && r.closing_stock !== null && r.closing_stock !== '') ? Number(r.closing_stock) : (op - used);
          const wt = Number(r.weight_per_sheet) || 0;
          const inputWt = (r.total_input_weight !== undefined && r.total_input_weight !== null && r.total_input_weight !== '')
            ? Number(r.total_input_weight)
            : (used * wt);
          const cutbit = Number(r.cutbit_used) || 0;

          return {
            ...r,
            entry_date: dateStr,
            opening_stock: op,
            opening_stock_display: (r.opening_stock_display !== undefined && r.opening_stock_display !== null && r.opening_stock_display !== '')
              ? String(r.opening_stock_display)
              : String(op),
            used_quantity: used,
            used_quantity_display: (r.used_quantity_display !== undefined && r.used_quantity_display !== null && r.used_quantity_display !== '')
              ? String(r.used_quantity_display)
              : String(used),
            closing_stock: cl,
            closing_stock_display: (r.closing_stock_display !== undefined && r.closing_stock_display !== null && r.closing_stock_display !== '')
              ? String(r.closing_stock_display)
              : String(cl),
            total_input_weight: inputWt,
            total_input_weight_display: (r.total_input_weight_display !== undefined && r.total_input_weight_display !== null && r.total_input_weight_display !== '')
              ? String(r.total_input_weight_display)
              : inputWt.toFixed(2),
            cutbit_used: cutbit,
            cutbit_used_display: (r.cutbit_used_display !== undefined && r.cutbit_used_display !== null && r.cutbit_used_display !== '')
              ? String(r.cutbit_used_display)
              : String(cutbit),
          };
        });
        setEntries(normalized);
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
    setEditJobNumber(entry.job_number || '');
    setEditShift(entry.shift || 'Day');
    setEditEmployee(entry.employee || '');
    setEditOpeningStock(String(entry.opening_stock ?? entry.opening_stock_display ?? 0));
    setEditUsedQty(String(entry.used_quantity ?? entry.used_quantity_display ?? 0));
    setEditCutbit(String(entry.cutbit_used ?? entry.cutbit_used_display ?? 0));
    setEditRemarks(entry.remarks || '');
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEntry) return;

    const opStockNum = parseFloat(editOpeningStock);
    const usedQtyNum = parseFloat(editUsedQty);
    if (isNaN(opStockNum) || isNaN(usedQtyNum)) {
      setToast({ type: 'error', message: 'Please enter valid numerical values for opening stock and used sheets.' });
      return;
    }

    setEditSubmitting(true);
    try {
      const payload = {
        job_number: editJobNumber.trim(),
        shift: editShift,
        employee: editEmployee.trim(),
        opening_stock: opStockNum,
        used_quantity: usedQtyNum,
        cutbit_used: parseFloat(editCutbit || 0),
        remarks: editRemarks.trim()
      };

      const res = await api.put(`/api/entries/${selectedEntry.entry_id}`, payload);
      if (res.success) {
        setToast({ type: 'success', message: `Transaction ${selectedEntry.entry_id} updated and reconciled successfully.` });
        setIsEditOpen(false);
        fetchEntries();
      }
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to update transaction.' });
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteEntry = async () => {
    if (!deleteConfirm.entry) return;
    setDeleting(true);
    try {
      const res = await api.delete(`/api/entries/${deleteConfirm.entry.entry_id}`);
      if (res.success) {
        setToast({ type: 'success', message: 'Transaction deleted successfully from Google Sheets.' });
        fetchEntries();
      }
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to delete transaction.' });
    } finally {
      setDeleting(false);
      setDeleteConfirm({ isOpen: false, entry: null });
    }
  };

  const columns = [
    { key: 'entry_id', label: 'Entry ID', className: 'w-24 font-mono text-[11px] text-slate-500' },
    {
      key: 'entry_date',
      label: 'Date',
      className: 'w-28 font-mono text-xs',
      render: (val) => {
        if (!val) return '--';
        const str = String(val);
        return str.includes('T') ? str.split('T')[0] : str;
      }
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
    {
      key: 'opening_stock_display',
      label: 'Opening',
      render: (val, row) => {
        const v = (val !== undefined && val !== null && val !== '') ? val : (row.opening_stock ?? 0);
        return <span className="font-mono text-xs text-slate-500">{String(v)}</span>;
      }
    },
    {
      key: 'used_quantity_display',
      label: 'Used Sheets',
      render: (val, row) => {
        const v = (val !== undefined && val !== null && val !== '') ? val : (row.used_quantity ?? 0);
        return <span className="font-mono font-bold text-sky-600 dark:text-sky-400 text-xs">{String(v)}</span>;
      }
    },
    {
      key: 'closing_stock_display',
      label: 'Closing',
      render: (val, row) => {
        const v = (val !== undefined && val !== null && val !== '') ? val : (row.closing_stock ?? 0);
        return <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs">{String(v)}</span>;
      }
    },
    {
      key: 'total_input_weight_display',
      label: 'Input Wt (kg)',
      render: (val, row) => {
        let v = val;
        if (!v && row.total_input_weight !== undefined && row.total_input_weight !== null) {
          v = Number(row.total_input_weight).toFixed(2);
        } else if (!v && row.used_quantity && row.weight_per_sheet) {
          v = (Number(row.used_quantity) * Number(row.weight_per_sheet)).toFixed(2);
        }
        return <span className="font-mono font-semibold text-xs">{v || '0.00'} kg</span>;
      }
    },
    {
      key: 'cutbit_used_display',
      label: 'Cutbit',
      render: (val, row) => {
        const v = (val !== undefined && val !== null && val !== '') ? val : (row.cutbit_used ?? 0);
        return <span className="font-mono text-xs">{String(v)}</span>;
      }
    },
    { key: 'employee', label: 'Operator', render: val => <span className="text-slate-500 text-[11px]">{val || '--'}</span> },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => openEditModal(row)}
            className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
            title="Edit transaction record"
          >
            <Edit className="w-3.5 h-3.5 text-sky-500" />
          </button>
          <button
            onClick={() => setDeleteConfirm({ isOpen: true, entry: row })}
            className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-500 transition-colors"
            title="Delete historical entry"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
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
            Complete transaction ledger stored in Sheet: Daily_Entries. Operators and Directors can view and manage records.
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
          actions={
            <button
              onClick={() => {
                if (!entries.length) {
                  alert('No entries available to print.');
                  return;
                }
                const pdfColumns = [
                  { key: 'entry_date', label: 'Date' },
                  { key: 'job_number', label: 'Job Ref' },
                  { key: 'shift', label: 'Shift' },
                  { key: 'material_name', label: 'Material' },
                  { key: 'opening_stock_display', label: 'Opening' },
                  { key: 'used_quantity_display', label: 'Used' },
                  { key: 'closing_stock_display', label: 'Closing' },
                  { key: 'total_input_weight_display', label: 'Input (kg)' },
                  { key: 'employee', label: 'Operator' }
                ];
                printPDFReport('Saravanan Electricals - Historical Material Punching Ledger', pdfColumns, entries);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 text-white shadow-2xs transition-colors"
              title="Download / Print as PDF"
            >
              <Printer className="w-3.5 h-3.5 text-red-500" />
              <span className="hidden sm:inline">PDF</span>
            </button>
          }
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Delete Historical Transaction"
        message={`Are you sure you want to delete this historical transaction (${deleteConfirm.entry?.entry_id}) for "${deleteConfirm.entry?.material_name}"? This action will remove the record from Daily_Entries in Google Sheets.`}
        onConfirm={handleDeleteEntry}
        onCancel={() => setDeleteConfirm({ isOpen: false, entry: null })}
        confirmText={deleting ? "Deleting..." : "Yes, Delete Entry"}
        confirmVariant="danger"
      />

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
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Material</span>
                  <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{selectedEntry.material_name}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Unit Wt</span>
                  <span className="font-mono font-semibold text-xs text-slate-700 dark:text-slate-300">
                    {selectedEntry.weight_per_sheet ? `${Number(selectedEntry.weight_per_sheet).toFixed(2)} kg/sheet` : 'N/A'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Job / Project Ref
                  </label>
                  <input
                    type="text"
                    value={editJobNumber}
                    onChange={e => setEditJobNumber(e.target.value)}
                    placeholder="e.g. JOB-102"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Production Shift
                  </label>
                  <select
                    value={editShift}
                    onChange={e => setEditShift(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="Day">Day Shift</option>
                    <option value="Night">Night Shift</option>
                    <option value="General">General Shift</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Operator / Person Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Karthik, Suresh..."
                  value={editEmployee}
                  onChange={e => setEditEmployee(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Opening Stock (Sheets)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editOpeningStock}
                    onChange={e => setEditOpeningStock(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Used / Punching (Sheets)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editUsedQty}
                    onChange={e => setEditUsedQty(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              {/* Live Reconciliation Preview */}
              <div className="p-3 rounded-xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/50 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-sky-700 dark:text-sky-300 font-medium block">Recalculated Closing Stock</span>
                  <span className="text-sm font-mono font-bold text-sky-900 dark:text-sky-200">
                    {(parseFloat(editOpeningStock || 0) - parseFloat(editUsedQty || 0)).toFixed(2)} sheets
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-sky-700 dark:text-sky-300 font-medium block">Total Input Weight</span>
                  <span className="text-sm font-mono font-bold text-sky-900 dark:text-sky-200">
                    {(parseFloat(editUsedQty || 0) * (parseFloat(selectedEntry.weight_per_sheet) || 0)).toFixed(2)} kg
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Cutbit Used (pieces / kg)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editCutbit}
                  onChange={e => setEditCutbit(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Modification Reason & Remarks
                </label>
                <textarea
                  value={editRemarks}
                  onChange={e => setEditRemarks(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-sky-500"
                  placeholder="Reason for modifying this historical entry..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-semibold shadow-xs transition-all disabled:opacity-50"
                >
                  {editSubmitting ? 'Updating & Reconciling...' : 'Save & Reconcile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
