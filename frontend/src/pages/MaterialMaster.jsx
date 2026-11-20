import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Plus,
  Edit,
  Trash2,
  Sparkles,
  Calculator,
  CheckCircle2,
  AlertTriangle,
  X,
  Filter
} from 'lucide-react';
import DataTable from '../components/DataTable';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';
import Toast from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function MaterialMaster({ isRareModalOpen, onToggleRareModal }) {
  const { isDirector } = useAuth();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form Fields
  const [materialName, setMaterialName] = useState('');
  const [category, setCategory] = useState('CRCA');
  const [materialType, setMaterialType] = useState('Standard');
  const [lengthMm, setLengthMm] = useState('1250');
  const [widthMm, setWidthMm] = useState('2500');
  const [thicknessMm, setThicknessMm] = useState('1.2');
  const [densityCoeff, setDensityCoeff] = useState('0.00000785');
  const [manualWeight, setManualWeight] = useState('');
  const [isManualWeight, setIsManualWeight] = useState(false);
  const [unit, setUnit] = useState('Sheets');
  const [openingStock, setOpeningStock] = useState('');
  const [remarks, setRemarks] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Delete Confirm Dialog State
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, material: null });

  const fetchMaterials = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/materials');
      if (res.success) {
        setMaterials(res.materials || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load materials.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  useEffect(() => {
    if (isRareModalOpen) {
      openAddModal('Rare');
    }
  }, [isRareModalOpen]);

  const l = parseFloat(lengthMm) || 0;
  const w = parseFloat(widthMm) || 0;
  const t = parseFloat(thicknessMm) || 0;
  const d = parseFloat(densityCoeff) || 0;
  const liveCalculatedWeight = isManualWeight
    ? parseFloat(manualWeight) || 0
    : l * w * t * d;

  const openAddModal = (type = 'Standard') => {
    setIsEditing(false);
    setEditingId(null);
    setMaterialName('');
    setCategory(type === 'Rare' ? 'Special' : 'CRCA');
    setMaterialType(type);
    setLengthMm('1250');
    setWidthMm('2500');
    setThicknessMm('1.2');
    setDensityCoeff('0.00000785');
    setManualWeight('');
    setIsManualWeight(false);
    setUnit('Sheets');
    setOpeningStock('');
    setRemarks('');
    setIsModalOpen(true);
  };

  const openEditModal = (mat) => {
    setIsEditing(true);
    setEditingId(mat.material_id);
    setMaterialName(mat.material_name);
    setCategory(mat.category);
    setMaterialType(mat.material_type || 'Standard');
    setLengthMm(mat.length_mm ? String(mat.length_mm) : '');
    setWidthMm(mat.width_mm ? String(mat.width_mm) : '');
    setThicknessMm(mat.thickness_mm ? String(mat.thickness_mm) : '');
    setDensityCoeff(mat.density_coefficient ? String(mat.density_coefficient) : '0.00000785');
    setIsManualWeight(mat.is_manual_weight || false);
    setManualWeight(mat.weight_per_sheet ? String(mat.weight_per_sheet) : '');
    setUnit(mat.unit || 'Sheets');
    setOpeningStock('');
    setRemarks('');
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!materialName.trim()) {
      setToast({ type: 'warning', message: 'Material name is required.' });
      return;
    }

    setFormSubmitting(true);
    try {
      if (isEditing) {
        const payload = {
          material_name: materialName.trim(),
          category,
          length_mm: l,
          width_mm: w,
          thickness_mm: t,
          density_coefficient: d,
          manual_weight: isManualWeight ? parseFloat(manualWeight) : null,
          unit
        };
        const res = await api.put(`/api/materials/${editingId}`, payload);
        if (res.success) {
          setToast({ type: 'success', message: 'Material updated successfully.' });
          setIsModalOpen(false);
          fetchMaterials();
        }
      } else {
        const payload = {
          material_name: materialName.trim(),
          category,
          material_type: materialType,
          length_mm: !isManualWeight ? l : null,
          width_mm: !isManualWeight ? w : null,
          thickness_mm: !isManualWeight ? t : null,
          density_coefficient: !isManualWeight ? d : null,
          manual_weight: isManualWeight ? parseFloat(manualWeight) : null,
          unit,
          opening_stock: openingStock !== '' ? parseFloat(openingStock) : null,
          remarks
        };
        const res = await api.post('/api/materials', payload);
        if (res.success) {
          setToast({ type: 'success', message: res.message });
          setIsModalOpen(false);
          if (onToggleRareModal) onToggleRareModal(false);
          fetchMaterials();
        }
      }
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Operation failed.' });
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.material) return;
    try {
      const res = await api.delete(`/api/materials/${deleteConfirm.material.material_id}`);
      if (res.success) {
        setToast({ type: 'success', message: 'Material and all associated stock removed from backend sheet and UI.' });
        fetchMaterials();
      }
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to remove material.' });
    } finally {
      setDeleteConfirm({ isOpen: false, material: null });
    }
  };

  const filteredMaterials = materials.filter(m => {
    if (activeTab === 'all') return true;
    if (activeTab === 'Standard' || activeTab === 'Rare') return m.material_type === activeTab;
    return true;
  });

  const columns = [
    {
      key: 'material_id',
      label: 'ID',
      className: 'w-24 font-mono text-[11px] text-slate-500'
    },
    {
      key: 'material_name',
      label: 'Material Name',
      render: (val, row) => (
        <div>
          <span className="font-semibold text-slate-900 dark:text-slate-100 block">{val}</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
              row.material_type === 'Rare'
                ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
            }`}>
              {row.material_type || 'Standard'}
            </span>
            <span className="text-[10px] text-slate-400">&bull; {row.category}</span>
          </div>
        </div>
      )
    },
    {
      key: 'dimensions',
      label: 'Dimensions (L × W × T)',
      render: (_, row) => (
        row.length_mm && row.width_mm && row.thickness_mm ? (
          <span className="font-mono text-xs">
            {row.length_mm} × {row.width_mm} × {row.thickness_mm} mm
          </span>
        ) : (
          <span className="text-slate-400 italic text-xs">Non-dimensional</span>
        )
      )
    },
    {
      key: 'density_coefficient',
      label: 'Density',
      render: val => <span className="font-mono text-slate-500 text-xs">{val || '0.00000785'}</span>
    },
    {
      key: 'weight_per_sheet_display',
      label: 'Weight/Sheet (kg)',
      render: (val, row) => (
        <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs">
          {val} kg {row.is_manual_weight && <span className="text-[10px] text-amber-500 font-normal">(manual)</span>}
        </span>
      )
    },
    {
      key: 'is_active',
      label: 'Status',
      render: val => (
        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
          val
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
            : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
        }`}>
          {val ? 'Active' : 'Inactive'}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-1.5">
          {isDirector && (
            <>
              <button
                onClick={() => openEditModal(row)}
                className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                title="Edit Material Specs"
              >
                <Edit className="w-3.5 h-3.5" />
              </button>
              {row.is_active && (
                <button
                  onClick={() => setDeleteConfirm({ isOpen: true, material: row })}
                  className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-rose-50 text-slate-400 hover:text-rose-500"
                  title="Deactivate Material"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <Toast toast={toast} onClose={() => setToast(null)} />
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Deactivate & Remove Material"
        message={`Are you sure you want to deactivate and remove "${deleteConfirm.material?.material_name}"? This will permanently remove the material and all its stock records from the backend sheet and UI.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, material: null })}
        confirmText="Yes, Remove Material & Stock"
        confirmVariant="danger"
      />

      {/* Top Banner and Actions */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/90 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Material Master Specification Ledger
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Single unified sheet for factory sheet dimensions, thickness, density coefficients, and automatic weight calculations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => openAddModal('Rare')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-purple-300 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 transition-colors shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>+ Add Rare Material</span>
          </button>

          {isDirector && (
            <button
              onClick={() => openAddModal('Standard')}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-sky-600 hover:bg-sky-500 text-white shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Standard Material</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs w-fit">
        {[
          { id: 'all', label: 'All Materials' },
          { id: 'Standard', label: 'Standard Materials' },
          { id: 'Rare', label: 'Rare Materials' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 font-medium rounded-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && <ErrorMessage error={error} onRetry={fetchMaterials} />}

      {loading ? (
        <Loading message="Syncing Material Master from Google Sheets..." />
      ) : (
        <DataTable
          columns={columns}
          data={filteredMaterials}
          title={`Materials Catalog (${filteredMaterials.length})`}
          exportFilename="material_master"
          pageSize={10}
        />
      )}

      {/* Add / Edit Material Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-sky-50 dark:bg-sky-950 text-sky-600 rounded-lg">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    {isEditing ? 'Edit Material Specifications' : `Create ${materialType} Material`}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Saves directly to Sheet 1: Material_Master
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  if (onToggleRareModal) onToggleRareModal(false);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Material Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1.2 CRCA Sheet (1250 × 2500)"
                  value={materialName}
                  onChange={e => setMaterialName(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    placeholder="CRCA, GP, HRPO..."
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Material Type
                  </label>
                  <select
                    value={materialType}
                    onChange={e => setMaterialType(e.target.value)}
                    disabled={isEditing}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                  >
                    <option value="Standard">Standard</option>
                    <option value="Rare">Rare</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="manualToggle"
                  checked={isManualWeight}
                  onChange={e => setIsManualWeight(e.target.checked)}
                  className="rounded text-sky-600"
                />
                <label htmlFor="manualToggle" className="text-slate-600 dark:text-slate-400">
                  Non-dimensional or custom manual weight entry
                </label>
              </div>

              {!isManualWeight ? (
                <div className="space-y-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">Length (mm)</label>
                      <input
                        type="number"
                        step="any"
                        value={lengthMm}
                        onChange={e => setLengthMm(e.target.value)}
                        required
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">Width (mm)</label>
                      <input
                        type="number"
                        step="any"
                        value={widthMm}
                        onChange={e => setWidthMm(e.target.value)}
                        required
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">Thickness (mm)</label>
                      <input
                        type="number"
                        step="any"
                        value={thicknessMm}
                        onChange={e => setThicknessMm(e.target.value)}
                        required
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Density Coefficient (Steel: 0.00000785)
                    </label>
                    <input
                      type="number"
                      step="0.00000001"
                      value={densityCoeff}
                      onChange={e => setDensityCoeff(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Manual Weight per Unit (kg) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 29.44"
                    value={manualWeight}
                    onChange={e => setManualWeight(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-mono"
                  />
                </div>
              )}

              <div className="p-3 rounded-xl bg-slate-900 text-white flex items-center justify-between border border-slate-800">
                <span className="text-slate-300">Computed Unit Weight:</span>
                <span className="font-bold text-sky-400 text-sm font-mono">
                  {liveCalculatedWeight.toFixed(2)} kg{' '}
                  <span className="text-[10px] text-slate-400 font-normal">
                    ({liveCalculatedWeight.toFixed(4)} kg exact)
                  </span>
                </span>
              </div>

              {!isEditing && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Initial Opening Stock (Optional)
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 100"
                      value={openingStock}
                      onChange={e => setOpeningStock(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Unit of Measure
                    </label>
                    <input
                      type="text"
                      value={unit}
                      onChange={e => setUnit(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Remarks / Notes
                </label>
                <input
                  type="text"
                  placeholder="Material specs, mill origin, grade..."
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    if (onToggleRareModal) onToggleRareModal(false);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 hover:bg-slate-100 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold shadow-xs disabled:opacity-50"
                >
                  {formSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
