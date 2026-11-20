import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Scale,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import Toast from '../components/Toast';

export default function DailyEntry({ onSaved, onOpenRareModal }) {
  const { user } = useAuth();

  // Header State
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [shift, setShift] = useState('Day');
  const [side, setSide] = useState('Left');
  const [jobNumber, setJobNumber] = useState('');
  const [employeeName, setEmployeeName] = useState(user?.name || '');
  const [generalRemarks, setGeneralRemarks] = useState('');

  // Available Materials Cache
  const [materials, setMaterials] = useState([]);
  const [stockBalances, setStockBalances] = useState({});
  const [loadingMats, setLoadingMats] = useState(false);

  // Dynamic Rows State
  const [rows, setRows] = useState([createEmptyRow()]);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  function createEmptyRow() {
    return {
      id: Math.random().toString(36).substring(7),
      material_id: '',
      material_name: '',
      opening_stock: 0,
      stock_received: 0,
      used_quantity: 0,
      weight_per_sheet: 0,
      total_input_weight: 0,
      scrap_weight: 0,
      closing_stock: 0,
      net_consumption: 0,
      wastage_percentage: 0,
      cutbit_used: 0,
      remarks: '',
      allow_scrap_override: false,
      is_configured: true
    };
  }

  // Load materials and current stock balances whenever side changes
  const loadMaterialsAndStock = async () => {
    setLoadingMats(true);
    try {
      const [matRes, stockRes] = await Promise.all([
        api.get(`/api/materials?side=${side}`),
        api.get(`/api/stock/${side.toLowerCase()}`)
      ]);

      if (matRes.success) setMaterials(matRes.materials || []);

      const balanceMap = {};
      if (stockRes.success && stockRes.stock) {
        stockRes.stock.forEach(item => {
          balanceMap[item.material_id] = {
            closing_stock: item.closing_stock,
            is_configured: item.is_configured
          };
        });
      }
      setStockBalances(balanceMap);
    } catch (err) {
      setToast({ type: 'error', message: `Failed to load stock data: ${err.message}` });
    } finally {
      setLoadingMats(false);
    }
  };

  useEffect(() => {
    loadMaterialsAndStock();
  }, [side]);

  // Handle Material Selection on a Row
  const handleMaterialChange = (rowId, matId) => {
    const selectedMat = materials.find(m => m.material_id === matId);
    if (!selectedMat) return;

    const balanceInfo = stockBalances[matId] || { closing_stock: 0, is_configured: false };
    const openingStock = balanceInfo.closing_stock !== null ? balanceInfo.closing_stock : 0;
    const unitWeight = selectedMat.weight_per_sheet || 0;

    setRows(prevRows =>
      prevRows.map(row => {
        if (row.id !== rowId) return row;

        const used = row.used_quantity || 0;
        const rec = row.stock_received || 0;
        const scrap = row.scrap_weight || 0;

        const closing = openingStock + rec - used;
        const totalInput = used * unitWeight;
        const net = Math.max(0, totalInput - scrap);
        const wastage = totalInput > 0 ? (scrap / totalInput) * 100 : 0;

        return {
          ...row,
          material_id: matId,
          material_name: selectedMat.material_name,
          weight_per_sheet: unitWeight,
          opening_stock: openingStock,
          closing_stock: closing,
          total_input_weight: totalInput,
          net_consumption: net,
          wastage_percentage: wastage,
          is_configured: balanceInfo.is_configured
        };
      })
    );
  };

  // Handle Numeric Field Changes on a Row
  const handleRowFieldChange = (rowId, field, value) => {
    setRows(prevRows =>
      prevRows.map(row => {
        if (row.id !== rowId) return row;

        const updated = { ...row, [field]: value };
        const op = parseFloat(updated.opening_stock) || 0;
        const rec = parseFloat(updated.stock_received) || 0;
        const used = parseFloat(updated.used_quantity) || 0;
        const unitWt = parseFloat(updated.weight_per_sheet) || 0;
        const scrap = parseFloat(updated.scrap_weight) || 0;

        // Closing Stock = Opening Stock + Stock Received - Sheets Used
        updated.closing_stock = op + rec - used;
        // Total Input Weight = Sheets Used × Weight per Sheet
        updated.total_input_weight = used * unitWt;
        // Net Consumption = Total Input Weight - Scrap Weight
        updated.net_consumption = Math.max(0, updated.total_input_weight - scrap);
        // Wastage % = (Scrap Weight / Total Input Weight) * 100
        updated.wastage_percentage =
          updated.total_input_weight > 0 ? (scrap / updated.total_input_weight) * 100 : 0;

        return updated;
      })
    );
  };

  const handleAddRow = () => {
    setRows(prev => [...prev, createEmptyRow()]);
  };

  const handleRemoveRow = (id) => {
    if (rows.length === 1) {
      setRows([createEmptyRow()]);
      return;
    }
    setRows(prev => prev.filter(r => r.id !== id));
  };

  // Real-time Batch Totals Calculation
  const totalSheetsPunched = rows.reduce((acc, r) => acc + (parseFloat(r.used_quantity) || 0), 0);
  const totalMaterialWeight = rows.reduce((acc, r) => acc + (parseFloat(r.total_input_weight) || 0), 0);
  const totalScrapWeight = rows.reduce((acc, r) => acc + (parseFloat(r.scrap_weight) || 0), 0);
  const totalCutbitUsed = rows.reduce((acc, r) => acc + (parseFloat(r.cutbit_used) || 0), 0);
  const batchWastagePct =
    totalMaterialWeight > 0 ? (totalScrapWeight / totalMaterialWeight) * 100 : 0;

  // Submit Transaction
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    const invalidRows = rows.filter(r => !r.material_id);
    if (invalidRows.length > 0) {
      setToast({ type: 'warning', message: 'Please select a material for all rows.' });
      return;
    }

    const negativeStockRows = rows.filter(r => r.closing_stock < 0);
    if (negativeStockRows.length > 0) {
      setToast({
        type: 'error',
        message: `Closing stock cannot be negative for: ${negativeStockRows.map(r => r.material_name).join(', ')}. Please adjust opening stock or used quantity.`
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        entry_date: entryDate,
        shift,
        side,
        job_number: jobNumber,
        remarks: generalRemarks,
        rows: rows.map(r => ({
          material_id: r.material_id,
          material_name: r.material_name,
          opening_stock: r.opening_stock,
          stock_received: r.stock_received,
          used_quantity: r.used_quantity,
          weight_per_sheet: r.weight_per_sheet,
          scrap_weight: r.scrap_weight,
          cutbit_used: r.cutbit_used,
          remarks: r.remarks,
          allow_scrap_override: r.allow_scrap_override
        }))
      };

      const res = await api.post('/api/entries', payload);
      if (res.success) {
        setToast({
          type: 'success',
          message: `Successfully recorded ${res.entries.length} entries in Google Sheets!`
        });
        // Reset rows
        setRows([createEmptyRow()]);
        setJobNumber('');
        setGeneralRemarks('');
        loadMaterialsAndStock();
        if (onSaved) onSaved();
      }
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Submission failed.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Header Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-700/80">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Daily Material Consumption & Punching Entry
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Record factory daily sheet usage, scrap weights, and update inventory in Google Sheets.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenRareModal}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 hover:bg-sky-100 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>+ Add Rare Material</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 text-xs">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Entry Date
              </label>
              <input
                type="date"
                value={entryDate}
                onChange={e => setEntryDate(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Side Operation
              </label>
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                {['Left', 'Right'].map(s => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => setSide(s)}
                    className={`py-1.5 rounded-lg font-semibold text-center transition-colors ${
                      side === s
                        ? s === 'Left'
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    {s} Side
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Shift
              </label>
              <select
                value={shift}
                onChange={e => setShift(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                <option value="Day">Day Shift</option>
                <option value="Night">Night Shift</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Job / Project Reference (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. JOB-8834 / PRJ-A"
                value={jobNumber}
                onChange={e => setJobNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Employee Name
              </label>
              <input
                type="text"
                value={employeeName}
                onChange={e => setEmployeeName(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Batch Remarks
              </label>
              <input
                type="text"
                placeholder="Operational notes..."
                value={generalRemarks}
                onChange={e => setGeneralRemarks(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        {/* Dynamic Multi-Row Entry Table */}
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Material Transactions ({rows.length} rows)
            </h3>
            <button
              type="button"
              onClick={handleAddRow}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-800 dark:text-slate-100 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Material Row</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-2 w-8 text-center">#</th>
                  <th className="py-3 px-3 min-w-[220px]">Material Selection</th>
                  <th className="py-3 px-2 w-24">Opening</th>
                  <th className="py-3 px-2 w-24">Received</th>
                  <th className="py-3 px-2 w-28">Used Sheets</th>
                  <th className="py-3 px-2 w-24">Weight/Sh</th>
                  <th className="py-3 px-2 w-28">Total Wt (kg)</th>
                  <th className="py-3 px-2 w-28">Scrap Wt (kg)</th>
                  <th className="py-3 px-2 w-24">Closing</th>
                  <th className="py-3 px-2 w-24">Cutbit</th>
                  <th className="py-3 px-2 min-w-[120px]">Remarks</th>
                  <th className="py-3 px-2 w-10 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                {rows.map((row, index) => (
                  <tr key={row.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-2 text-center text-slate-400 font-sans">{index + 1}</td>
                    
                    {/* Material Dropdown */}
                    <td className="py-3 px-3 font-sans">
                      <select
                        value={row.material_id}
                        onChange={e => handleMaterialChange(row.id, e.target.value)}
                        required
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-sky-500"
                      >
                        <option value="">-- Select {side} Material --</option>
                        {materials.map(m => (
                          <option key={m.material_id} value={m.material_id}>
                            {m.material_name} ({m.thickness_mm}mm &bull; {m.weight_per_sheet_display}kg)
                          </option>
                        ))}
                      </select>
                      {!row.is_configured && row.material_id && (
                        <span className="text-[10px] text-amber-500 font-sans block mt-0.5">
                          Opening stock not initialized
                        </span>
                      )}
                    </td>

                    {/* Opening Stock */}
                    <td className="py-3 px-2">
                      <input
                        type="number"
                        step="any"
                        value={row.opening_stock}
                        onChange={e => handleRowFieldChange(row.id, 'opening_stock', e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 font-mono"
                      />
                    </td>

                    {/* Received */}
                    <td className="py-3 px-2">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={row.stock_received}
                        onChange={e => handleRowFieldChange(row.id, 'stock_received', e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono"
                      />
                    </td>

                    {/* Used Quantity (Sheets) */}
                    <td className="py-3 px-2">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={row.used_quantity}
                        onChange={e => handleRowFieldChange(row.id, 'used_quantity', e.target.value)}
                        required
                        className="w-full px-2 py-1.5 rounded-lg border border-sky-400 dark:border-sky-600 bg-sky-50/30 dark:bg-sky-950/20 font-bold font-mono text-sky-700 dark:text-sky-300"
                      />
                    </td>

                    {/* Weight per Sheet */}
                    <td className="py-3 px-2 text-slate-500">
                      {row.weight_per_sheet ? `${row.weight_per_sheet.toFixed(2)}` : '--'}
                    </td>

                    {/* Total Material Input Weight */}
                    <td className="py-3 px-2 font-bold text-slate-800 dark:text-slate-100">
                      {row.total_input_weight ? `${row.total_input_weight.toFixed(2)}` : '0.00'}
                    </td>

                    {/* Scrap Weight (kg) */}
                    <td className="py-3 px-2">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={row.scrap_weight}
                        onChange={e => handleRowFieldChange(row.id, 'scrap_weight', e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg border border-amber-300 dark:border-amber-600 bg-amber-50/30 dark:bg-amber-950/20 font-mono text-amber-700 dark:text-amber-300"
                      />
                    </td>

                    {/* Closing Stock */}
                    <td className={`py-3 px-2 font-bold ${row.closing_stock < 0 ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {row.closing_stock !== undefined ? row.closing_stock.toFixed(1) : '--'}
                    </td>

                    {/* Cutbit */}
                    <td className="py-3 px-2">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={row.cutbit_used}
                        onChange={e => handleRowFieldChange(row.id, 'cutbit_used', e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono"
                      />
                    </td>

                    {/* Remarks */}
                    <td className="py-3 px-2 font-sans">
                      <input
                        type="text"
                        placeholder="Row notes"
                        value={row.remarks}
                        onChange={e => handleRowFieldChange(row.id, 'remarks', e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs"
                      />
                    </td>

                    {/* Remove Action */}
                    <td className="py-3 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(row.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
                        title="Remove row"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Real-Time Live Batch Summary Footer */}
          <div className="mt-6 p-4 rounded-xl bg-slate-900 text-slate-200 border border-slate-800 grid grid-cols-2 md:grid-cols-5 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Total Sheets Punched</span>
              <span className="text-base font-bold text-sky-400 font-mono">{totalSheetsPunched.toFixed(1)} sheets</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Total Input Weight</span>
              <span className="text-base font-bold text-slate-100 font-mono">{totalMaterialWeight.toFixed(2)} kg</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Total Scrap Weight</span>
              <span className="text-base font-bold text-amber-400 font-mono">{totalScrapWeight.toFixed(2)} kg</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Total Cutbit</span>
              <span className="text-base font-bold text-slate-300 font-mono">{totalCutbitUsed.toFixed(1)} sheets</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Batch Wastage %</span>
              <span className={`text-base font-bold font-mono ${batchWastagePct > 10 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {batchWastagePct.toFixed(2)}%
              </span>
            </div>
          </div>

          {/* Action Submission Buttons */}
          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setRows([createEmptyRow()])}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Grid</span>
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold rounded-xl bg-sky-600 hover:bg-sky-500 text-white shadow-sm shadow-sky-600/30 transition-all disabled:opacity-50"
            >
              {submitting ? (
                <span>Writing to Google Sheets...</span>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Daily Transaction</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
