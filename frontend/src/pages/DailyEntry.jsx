import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Save,
  RotateCcw,
  Sparkles,
  ClipboardPenLine,
  CheckCircle2,
  AlertTriangle,
  X,
  Calculator,
  Scale
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import Toast from '../components/Toast';
import { STANDARD_MATERIALS_FALLBACK } from '../utils/standardMaterials';

export default function DailyEntry({ onSaved }) {
  const { user } = useAuth();

  // Header State
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [shift, setShift] = useState('Day');
  const [jobNumber, setJobNumber] = useState('');
  const [employeeName, setEmployeeName] = useState(() => {
    const defaultName = user?.name || '';
    return defaultName === 'Data Entry Operator' ? '' : defaultName;
  });
  const [generalRemarks, setGeneralRemarks] = useState('');
  const [totalScrapWeight, setTotalScrapWeight] = useState('');

  // Available Materials Cache & Unified Stock Balances
  const [materials, setMaterials] = useState(STANDARD_MATERIALS_FALLBACK);
  const [stockBalances, setStockBalances] = useState({});
  const [loadingMats, setLoadingMats] = useState(false);

  // Dynamic Multi-Row Entry Table State
  const [rows, setRows] = useState([createEmptyRow()]);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  // Embedded Rare Material Modal State
  const [isRareModalOpen, setIsRareModalOpen] = useState(false);
  const [targetRowId, setTargetRowId] = useState(null);
  const [rareName, setRareName] = useState('');
  const [rareCategory, setRareCategory] = useState('CRCA');
  const [rareLength, setRareLength] = useState('1250');
  const [rareWidth, setRareWidth] = useState('2500');
  const [rareThickness, setRareThickness] = useState('1.2');
  const [rareDensity, setRareDensity] = useState('0.00000785');
  const [isManualWeight, setIsManualWeight] = useState(false);
  const [manualWeight, setManualWeight] = useState('');
  const [rareUnit, setRareUnit] = useState('Sheets');
  const [rareOpeningStock, setRareOpeningStock] = useState('0');
  const [rareRemarks, setRareRemarks] = useState('');
  const [submittingRare, setSubmittingRare] = useState(false);

  function createEmptyRow() {
    return {
      id: Math.random().toString(36).substring(7),
      material_id: '',
      material_name: '',
      opening_stock: 0,
      used_quantity: 0,
      weight_per_sheet: 0,
      total_input_weight: 0,
      closing_stock: 0,
      is_custom_closing: false,
      cutbit_used: 0,
      remarks: '',
      is_configured: true
    };
  }

  // Load all materials and unified stock inventory
  const loadMaterialsAndStock = async () => {
    setLoadingMats(true);
    try {
      const [matRes, stockRes] = await Promise.all([
        api.get('/api/materials'),
        api.get('/api/stock')
      ]);

      if (matRes.success && matRes.materials && matRes.materials.length > 0) {
        setMaterials(matRes.materials);
      } else {
        try {
          const restoreRes = await api.post('/api/materials/restore-defaults');
          if (restoreRes.success && restoreRes.materials && restoreRes.materials.length > 0) {
            setMaterials(restoreRes.materials);
          } else {
            setMaterials(STANDARD_MATERIALS_FALLBACK);
          }
        } catch {
          setMaterials(STANDARD_MATERIALS_FALLBACK);
        }
      }

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
  }, []);

  // Restore factory standard materials manually
  const handleRestoreMaterials = async () => {
    setLoadingMats(true);
    try {
      const res = await api.post('/api/materials/restore-defaults');
      if (res.success) {
        setMaterials(res.materials || STANDARD_MATERIALS_FALLBACK);
        setToast({
          type: 'success',
          message: `Restored ${res.restored_count || 12} standard materials in Google Sheets!`
        });
        loadMaterialsAndStock();
      }
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to restore default materials.' });
    } finally {
      setLoadingMats(false);
    }
  };

  // Open Rare Material Modal
  const openRareModal = (rowId = null) => {
    setTargetRowId(rowId);
    setRareName('');
    setRareCategory('CRCA');
    setRareLength('1250');
    setRareWidth('2500');
    setRareThickness('1.2');
    setRareDensity('0.00000785');
    setIsManualWeight(false);
    setManualWeight('');
    setRareUnit('Sheets');
    setRareOpeningStock('0');
    setRareRemarks('');
    setIsRareModalOpen(true);
  };

  // Live Sheet Weight Calculation for Rare Material Modal
  const rL = parseFloat(rareLength) || 0;
  const rW = parseFloat(rareWidth) || 0;
  const rT = parseFloat(rareThickness) || 0;
  const rD = parseFloat(rareDensity) || 0;
  const liveRareWeight = isManualWeight
    ? (parseFloat(manualWeight) || 0)
    : (rL * rW * rT * rD);

  // Save Rare Material handler
  const handleSaveRareMaterial = async (e) => {
    e.preventDefault();
    if (!rareName.trim()) {
      setToast({ type: 'warning', message: 'Material name is required.' });
      return;
    }

    setSubmittingRare(true);
    try {
      const payload = {
        material_name: rareName.trim(),
        category: rareCategory,
        material_type: 'Rare',
        length_mm: isManualWeight ? null : parseFloat(rareLength),
        width_mm: isManualWeight ? null : parseFloat(rareWidth),
        thickness_mm: isManualWeight ? null : parseFloat(rareThickness),
        density_coefficient: isManualWeight ? null : parseFloat(rareDensity),
        manual_weight: isManualWeight ? parseFloat(manualWeight) : null,
        unit: rareUnit,
        opening_stock: parseFloat(rareOpeningStock) || 0,
        remarks: rareRemarks.trim()
      };

      const res = await api.post('/api/materials', payload);
      if (res.success && res.material) {
        setToast({
          type: 'success',
          message: `Rare material "${res.material.material_name}" registered and saved in Google Sheets!`
        });

        const [matRes, stockRes] = await Promise.all([
          api.get('/api/materials'),
          api.get('/api/stock')
        ]);

        const updatedMats = matRes.materials || [];
        setMaterials(updatedMats);

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

        const newMatId = res.material.material_id;
        const newOpeningStock = parseFloat(rareOpeningStock) || 0;
        const unitWt = res.material.weight_per_sheet || 0;

        if (targetRowId) {
          setRows(prevRows =>
            prevRows.map(row => {
              if (row.id !== targetRowId) return row;
              const used = row.used_quantity || 0;
              const closing = newOpeningStock - used;
              const totalInput = used * unitWt;
              return {
                ...row,
                material_id: newMatId,
                material_name: res.material.material_name,
                weight_per_sheet: unitWt,
                opening_stock: newOpeningStock,
                closing_stock: closing,
                total_input_weight: totalInput,
                is_configured: true
              };
            })
          );
        } else {
          setRows(prevRows => {
            const emptyIdx = prevRows.findIndex(r => !r.material_id);
            if (emptyIdx !== -1) {
              const copy = [...prevRows];
              copy[emptyIdx] = {
                ...copy[emptyIdx],
                material_id: newMatId,
                material_name: res.material.material_name,
                weight_per_sheet: unitWt,
                opening_stock: newOpeningStock,
                closing_stock: newOpeningStock,
                is_configured: true
              };
              return copy;
            } else {
              const newRow = createEmptyRow();
              newRow.material_id = newMatId;
              newRow.material_name = res.material.material_name;
              newRow.weight_per_sheet = unitWt;
              newRow.opening_stock = newOpeningStock;
              newRow.closing_stock = newOpeningStock;
              newRow.is_configured = true;
              return [...prevRows, newRow];
            }
          });
        }

        setIsRareModalOpen(false);
      }
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to add rare material.' });
    } finally {
      setSubmittingRare(false);
    }
  };

  // Handle Material Selection on a Row
  const handleMaterialChange = (rowId, matId) => {
    if (matId === '__NEW_RARE__') {
      openRareModal(rowId);
      return;
    }

    const availablePool = materials.length > 0 ? materials : STANDARD_MATERIALS_FALLBACK;
    const selectedMat = availablePool.find(m => m.material_id === matId) ||
      STANDARD_MATERIALS_FALLBACK.find(m => m.material_id === matId);
    if (!selectedMat) return;

    const balanceInfo = stockBalances[matId] || { closing_stock: 0, is_configured: false };
    const openingStock = balanceInfo.closing_stock !== null ? balanceInfo.closing_stock : 0;
    const unitWeight = selectedMat.weight_per_sheet || 0;

    setRows(prevRows =>
      prevRows.map(row => {
        if (row.id !== rowId) return row;

        const used = row.used_quantity || 0;
        const closing = openingStock - used;
        const totalInput = used * unitWeight;

        return {
          ...row,
          material_id: matId,
          material_name: selectedMat.material_name,
          weight_per_sheet: unitWeight,
          opening_stock: openingStock,
          closing_stock: closing,
          is_custom_closing: false,
          total_input_weight: totalInput,
          is_configured: balanceInfo.is_configured
        };
      })
    );
  };

  // Handle Field Changes
  const handleRowFieldChange = (rowId, field, value) => {
    setRows(prevRows =>
      prevRows.map(row => {
        if (row.id !== rowId) return row;

        const updated = { ...row, [field]: value };
        const op = parseFloat(updated.opening_stock) || 0;
        const used = parseFloat(updated.used_quantity) || 0;
        const unitWt = parseFloat(updated.weight_per_sheet) || 0;

        // Closing Stock is auto-calculated by default (Opening - Used),
        // but user can manually edit it if new stock arrived on that day.
        if (field === 'closing_stock') {
          const clVal = value === '' ? '' : parseFloat(value);
          updated.closing_stock = clVal;
          const autoCl = op - used;
          updated.is_custom_closing = (value !== '' && !isNaN(clVal) && clVal !== autoCl);
        } else if (field === 'opening_stock' || field === 'used_quantity') {
          if (!updated.is_custom_closing) {
            updated.closing_stock = op - used;
          }
        }

        updated.total_input_weight = used * unitWt;

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

  // Real-time Batch Totals Calculation (Scrap calculated across overall materials)
  const totalSheetsPunched = rows.reduce((acc, r) => acc + (parseFloat(r.used_quantity) || 0), 0);
  const totalMaterialWeight = rows.reduce((acc, r) => acc + (parseFloat(r.total_input_weight) || 0), 0);
  const scrapWeightNum = parseFloat(totalScrapWeight) || 0;
  const netConsumedWeight = Math.max(0, totalMaterialWeight - scrapWeightNum);
  const totalCutbitUsed = rows.reduce((acc, r) => acc + (parseFloat(r.cutbit_used) || 0), 0);
  const batchWastagePct =
    totalMaterialWeight > 0 ? (scrapWeightNum / totalMaterialWeight) * 100 : 0;

  // Submit Daily Transaction Batch
  const handleSubmit = async (e) => {
    e.preventDefault();

    const invalidRows = rows.filter(r => !r.material_id);
    if (invalidRows.length > 0) {
      setToast({ type: 'warning', message: 'Please select a material for all rows.' });
      return;
    }

    if (!employeeName.trim()) {
      setToast({ type: 'warning', message: 'Please enter the Operator / Person Name.' });
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
        job_number: jobNumber,
        employee_name: employeeName.trim(),
        total_scrap_weight: scrapWeightNum,
        remarks: generalRemarks,
        rows: rows.map(r => {
          const op = parseFloat(r.opening_stock) || 0;
          const used = parseFloat(r.used_quantity) || 0;
          const cl = (r.closing_stock !== undefined && r.closing_stock !== null && r.closing_stock !== '')
            ? parseFloat(r.closing_stock)
            : (op - used);
          const diff = cl - (op - used);
          const received = diff > 0 ? diff : 0;

          return {
            material_id: r.material_id,
            material_name: r.material_name,
            opening_stock: op,
            stock_received: received,
            used_quantity: used,
            closing_stock: cl,
            weight_per_sheet: r.weight_per_sheet,
            cutbit_used: r.cutbit_used,
            remarks: r.remarks
          };
        })
      };

      const res = await api.post('/api/entries', payload);
      if (res.success) {
        setToast({
          type: 'success',
          message: `Successfully recorded ${res.entries.length} material entries in Google Sheets!`
        });
        setRows([createEmptyRow()]);
        setJobNumber('');
        setGeneralRemarks('');
        setTotalScrapWeight('');
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
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-900">
                <ClipboardPenLine className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Daily Material Consumption & Punching Entry
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Record daily factory sheet punching, off-cut cutbit, and overall batch scrap weight into Google Sheets.
                </p>
              </div>
            </div>

            {/* Embedded Rare Material Button */}
            <button
              type="button"
              onClick={() => openRareModal()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-purple-300 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>+ Add Rare Material</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 text-xs">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Entry Date *
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
                Shift *
              </label>
              <select
                value={shift}
                onChange={e => setShift(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium"
              >
                <option value="Day">Day Shift</option>
                <option value="Night">Night Shift</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Job / Project Reference
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
                Operator / Person Name *
              </label>
              <input
                type="text"
                placeholder="Enter operator name (e.g. Karthik, Suresh)..."
                value={employeeName}
                onChange={e => setEmployeeName(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-1 focus:ring-sky-500"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Enter the name of the person operating / logging this entry
              </span>
            </div>

            {/* Overall Scrap Weight Field for the Entire Batch / Shift */}
            <div>
              <label className="block font-medium text-amber-700 dark:text-amber-300 mb-1 flex items-center gap-1">
                <Scale className="w-3.5 h-3.5" />
                <span>Overall Scrap Wt (kg)</span>
              </label>
              <input
                type="number"
                step="any"
                min="0"
                placeholder="Total batch scrap..."
                value={totalScrapWeight}
                onChange={e => setTotalScrapWeight(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-600 bg-amber-50/40 dark:bg-amber-950/20 font-bold font-mono text-amber-800 dark:text-amber-200 placeholder:text-amber-400"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Total scrap weighed across all punched materials
              </span>
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
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Material Punching Rows ({rows.length})
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRestoreMaterials}
                disabled={loadingMats}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors shadow-xs"
                title="Restore all preconfigured factory standard materials in Google Sheets & dropdown"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${loadingMats ? 'animate-spin' : ''}`} />
                <span>Restore Standard Materials</span>
              </button>
              <button
                type="button"
                onClick={handleAddRow}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-800 dark:text-slate-100 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Material Row</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-2 w-8 text-center">#</th>
                  <th className="py-3 px-3 min-w-[260px]">Material Specification</th>
                  <th className="py-3 px-2 w-28">Opening Stock</th>
                  <th className="py-3 px-2 w-28">Used Sheets</th>
                  <th className="py-3 px-2 w-24">Weight/Sh</th>
                  <th className="py-3 px-2 w-28">Total Wt (kg)</th>
                  <th className="py-3 px-2 w-32">
                    <div className="flex items-center gap-1">
                      <span>Closing Stock</span>
                      <span className="text-[9px] font-normal lowercase tracking-normal text-slate-400 dark:text-slate-500">(auto/edit)</span>
                    </div>
                  </th>
                  <th className="py-3 px-2 w-24">Cutbit</th>
                  <th className="py-3 px-2 min-w-[140px]">Remarks</th>
                  <th className="py-3 px-2 w-10 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                {rows.map((row, index) => (
                  <tr key={row.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-2 text-center text-slate-400 font-sans">{index + 1}</td>
                    
                    {/* Unified Material Dropdown */}
                    <td className="py-3 px-3 font-sans">
                      <select
                        value={row.material_id}
                        onChange={e => handleMaterialChange(row.id, e.target.value)}
                        required
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-sky-500 font-medium"
                      >
                        <option value="">-- Select Material --</option>
                        <option value="__NEW_RARE__" className="font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950">
                          ✨ + Add New / Rare Material...
                        </option>
                        <optgroup label="Available Factory Materials">
                          {(materials && materials.length > 0 ? materials : STANDARD_MATERIALS_FALLBACK).map(m => (
                            <option key={m.material_id} value={m.material_id}>
                              {m.material_name} ({m.thickness_mm || '-'}mm &bull; {m.weight_per_sheet_display || (m.weight_per_sheet ? Number(m.weight_per_sheet).toFixed(2) : '-')}kg) {m.material_type === 'Rare' ? '[Rare]' : ''}
                            </option>
                          ))}
                        </optgroup>
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

                    {/* Closing Stock (Auto-calculated: Opening Stock - Used Quantity, editable if new stock arrived) */}
                    <td className="py-3 px-2">
                      <div className="relative">
                        <input
                          type="number"
                          step="any"
                          value={row.closing_stock !== undefined && row.closing_stock !== null ? row.closing_stock : ''}
                          onChange={e => handleRowFieldChange(row.id, 'closing_stock', e.target.value)}
                          title="Auto-calculated (Opening - Used). You can edit directly if new stock arrived."
                          placeholder="0"
                          className={`w-full px-2 py-1.5 rounded-lg border font-mono font-bold text-xs ${
                            Number(row.closing_stock) < 0
                              ? 'border-rose-400 bg-rose-50/50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400'
                              : row.is_custom_closing
                              ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300'
                              : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100'
                          }`}
                        />
                        {row.is_custom_closing && (
                          <div className="flex items-center justify-between text-[9px] mt-0.5 font-sans leading-tight">
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold truncate max-w-[70px]">
                              {Number(row.closing_stock) > ((parseFloat(row.opening_stock) || 0) - (parseFloat(row.used_quantity) || 0))
                                ? `+${(Number(row.closing_stock) - ((parseFloat(row.opening_stock) || 0) - (parseFloat(row.used_quantity) || 0))).toFixed(1)} new`
                                : `${(Number(row.closing_stock) - ((parseFloat(row.opening_stock) || 0) - (parseFloat(row.used_quantity) || 0))).toFixed(1)} adj`}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const op = parseFloat(row.opening_stock) || 0;
                                const used = parseFloat(row.used_quantity) || 0;
                                setRows(prev => prev.map(r => r.id === row.id ? { ...r, closing_stock: op - used, is_custom_closing: false } : r));
                              }}
                              className="text-sky-600 dark:text-sky-400 hover:underline shrink-0"
                              title="Reset back to auto-calculation (Opening - Used)"
                            >
                              Auto
                            </button>
                          </div>
                        )}
                      </div>
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

          {/* Real-Time Live Batch Summary Footer (Scrap calculated over overall materials) */}
          <div className="mt-6 p-4 rounded-xl bg-slate-900 text-slate-200 border border-slate-800 grid grid-cols-2 md:grid-cols-5 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Total Sheets Punched</span>
              <span className="text-base font-bold text-sky-400 font-mono">{totalSheetsPunched.toFixed(1)} sheets</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Overall Material Input</span>
              <span className="text-base font-bold text-slate-100 font-mono">{totalMaterialWeight.toFixed(2)} kg</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Total Scrap Weighed</span>
              <span className="text-base font-bold text-amber-400 font-mono">{scrapWeightNum.toFixed(2)} kg</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Net Consumed Weight</span>
              <span className="text-base font-bold text-emerald-400 font-mono">{netConsumedWeight.toFixed(2)} kg</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Overall Wastage %</span>
              <span className={`text-base font-bold font-mono ${batchWastagePct > 10 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {batchWastagePct.toFixed(2)}%
              </span>
            </div>
          </div>

          {/* Action Submission Buttons */}
          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setRows([createEmptyRow()]);
                setTotalScrapWeight('');
              }}
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

      {/* Embedded Rare Material Creation Modal */}
      {isRareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl border border-purple-200 dark:border-purple-900/60 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-purple-50/40 dark:bg-purple-950/20 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    Register Rare Material (Day of Usage)
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Adds rare specification directly into Google Sheets and populates your entry row.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRareModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveRareMaterial} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Material Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1.6 SS-304 Sheet / Rare Copper Strip"
                    value={rareName}
                    onChange={e => setRareName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Category *
                  </label>
                  <select
                    value={rareCategory}
                    onChange={e => setRareCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium"
                  >
                    <option value="CRCA">CRCA (Cold Rolled)</option>
                    <option value="HRPO">HRPO (Hot Rolled Pickled)</option>
                    <option value="HR">HR (Hot Rolled)</option>
                    <option value="GP">GP (Galvanized Plain)</option>
                    <option value="Stainless Steel">Stainless Steel</option>
                    <option value="Copper">Copper</option>
                    <option value="Aluminum">Aluminum</option>
                    <option value="Special">Special Alloy</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Unit of Measurement
                  </label>
                  <select
                    value={rareUnit}
                    onChange={e => setRareUnit(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  >
                    <option value="Sheets">Sheets</option>
                    <option value="Pcs">Pcs</option>
                    <option value="Kg">Kg</option>
                  </select>
                </div>
              </div>

              {/* Weight Calculation Method Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <span className="font-medium text-slate-700 dark:text-slate-300 text-[11px]">
                  Calculation: {isManualWeight ? 'Manual Sheet Weight' : 'Dimension Formula (L × W × T × Density)'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsManualWeight(!isManualWeight)}
                  className="text-xs text-sky-600 dark:text-sky-400 font-semibold underline"
                >
                  {isManualWeight ? 'Switch to Dimensions' : 'Switch to Manual Weight'}
                </button>
              </div>

              {!isManualWeight ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Length (mm) *
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={rareLength}
                        onChange={e => setRareLength(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-mono text-center"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Width (mm) *
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={rareWidth}
                        onChange={e => setRareWidth(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-mono text-center"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Thickness (mm) *
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={rareThickness}
                        onChange={e => setRareThickness(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-mono text-center"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Density Coefficient (kg/mm³)
                    </label>
                    <input
                      type="number"
                      step="0.00000001"
                      required
                      value={rareDensity}
                      onChange={e => setRareDensity(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-mono"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Standard Steel: 0.00000785 &bull; Stainless Steel: 0.00000793 &bull; Aluminum: 0.00000270
                    </span>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Manual Weight per Sheet (kg) *
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    placeholder="e.g. 29.44"
                    value={manualWeight}
                    onChange={e => setManualWeight(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-mono font-bold text-sky-600"
                  />
                </div>
              )}

              {/* Dynamic Live Weight Calculation Preview */}
              <div className="p-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-purple-700 dark:text-purple-300 block">
                    Calculated Weight per Sheet
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {!isManualWeight
                      ? `${rareLength} × ${rareWidth} × ${rareThickness} × ${rareDensity}`
                      : 'Manual weight override'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold font-mono text-purple-700 dark:text-purple-300">
                    {liveRareWeight.toFixed(2)} kg
                  </span>
                  <span className="block text-[10px] text-slate-400">
                    ({liveRareWeight.toFixed(4)} kg full precision)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Initial Opening Stock (Sheets)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={rareOpeningStock}
                    onChange={e => setRareOpeningStock(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Remarks / Origin
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Special order for batch #301"
                    value={rareRemarks}
                    onChange={e => setRareRemarks(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRareModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRare}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{submittingRare ? 'Saving to Google Sheets...' : 'Save & Select Rare Material'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
