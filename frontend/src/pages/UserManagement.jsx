import React, { useState, useEffect } from 'react';
import { Users, Plus, Shield, User, Lock, Mail, CheckCircle2, X, Trash2 } from 'lucide-react';
import DataTable from '../components/DataTable';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';
import Toast from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import { api } from '../services/api';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // Add User Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Employee');
  const [submitting, setSubmitting] = useState(false);

  // Delete User State
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, user: null });
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/auth/users');
      if (res.success) {
        setUsers(res.users || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load user accounts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      setToast({ type: 'warning', message: 'All fields are required.' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/api/auth/users', {
        name: name.trim(),
        email: email.trim(),
        password,
        role
      });
      if (res.success) {
        setToast({ type: 'success', message: `User ${email} created successfully.` });
        setIsModalOpen(false);
        setName('');
        setEmail('');
        setPassword('');
        fetchUsers();
      }
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to create user.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (user) => {
    try {
      const res = await api.put(`/api/auth/users/${user.user_id}`, {
        is_active: !user.is_active
      });
      if (res.success) {
        setToast({
          type: 'success',
          message: `User ${user.email} marked as ${!user.is_active ? 'Active' : 'Inactive'}.`
        });
        fetchUsers();
      }
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Status update failed.' });
    }
  };

  const columns = [
    { key: 'user_id', label: 'User ID', className: 'w-24 font-mono text-xs text-slate-500' },
    { key: 'name', label: 'Full Name', render: val => <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">{val}</span> },
    { key: 'email', label: 'Email Address', render: val => <span className="font-mono text-xs">{val}</span> },
    {
      key: 'role',
      label: 'Role',
      render: val => (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
          val === 'Director'
            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
            : val === 'Admin'
            ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
        }`}>
          {val === 'Director' || val === 'Admin' ? <Shield className="w-2.5 h-2.5" /> : <User className="w-2.5 h-2.5" />}
          {val}
        </span>
      )
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (val, row) => (
        <button
          onClick={() => handleToggleActive(row)}
          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
            val
              ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
              : 'bg-rose-100 hover:bg-rose-200 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
          }`}
          title="Click to toggle account activation"
        >
          {val ? 'Active' : 'Deactivated'}
        </button>
      )
    },
    { key: 'created_at', label: 'Registered Date', className: 'font-mono text-[11px] text-slate-400' },
    {
      key: 'actions',
      label: 'Action',
      sortable: false,
      render: (_, row) => (
        <button
          onClick={() => setDeleteConfirm({ isOpen: true, user: row })}
          className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors"
          title="Delete User Account"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )
    }
  ];

  const handleDeleteUser = async () => {
    if (!deleteConfirm.user) return;
    const targetUser = deleteConfirm.user;

    // Safety check: Prevent deleting if this is the only active Director or Admin
    if (targetUser.role === 'Director' || targetUser.role === 'Admin') {
      const otherAdmins = users.filter(u =>
        u.user_id !== targetUser.user_id &&
        (u.role === 'Director' || u.role === 'Admin') &&
        u.is_active
      );
      if (otherAdmins.length === 0) {
        setToast({
          type: 'error',
          message: 'Cannot delete the only active Director/Administrator. Create or activate another admin first.'
        });
        setDeleteConfirm({ isOpen: false, user: null });
        return;
      }
    }

    setDeleting(true);
    try {
      const res = await api.delete(`/api/auth/users/${deleteConfirm.user.user_id}`);
      if (res.success) {
        setToast({ type: 'success', message: `User "${deleteConfirm.user.email}" removed from Google Sheets.` });
        fetchUsers();
      }
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to delete user.' });
    } finally {
      setDeleting(false);
      setDeleteConfirm({ isOpen: false, user: null });
    }
  };

  return (
    <div className="space-y-6">
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Top Banner */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/90 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            User Access & Role Management
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Administer factory operators and management accounts. Passwords are encrypted with SHA-256 / PBKDF2 in Sheet 8: Users.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-sky-600 hover:bg-sky-500 text-white shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add User Account</span>
        </button>
      </div>

      {error && <ErrorMessage error={error} onRetry={fetchUsers} />}

      {loading ? (
        <Loading message="Reading user directory from Google Sheets..." />
      ) : (
        <DataTable
          columns={columns}
          data={users}
          title={`Registered Users (${users.length})`}
          exportFilename="user_accounts"
          pageSize={10}
        />
      )}

      {/* Add User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md shadow-xl overflow-hidden p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Create Factory User Account
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  placeholder="e.g. jdoe@factory.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Initial Password *
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  System Role
                </label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-medium"
                >
                  <option value="Director">Director (Full Factory & System Control)</option>
                  <option value="Admin">Administrator (Full Access & Adjustments)</option>
                  <option value="Employee">Employee (Daily Material Entry & Viewing)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 hover:bg-slate-100 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold shadow-xs disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirm Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Delete User Account"
        message={`Are you sure you want to permanently delete user account "${deleteConfirm.user?.email}" from Google Sheets?`}
        onConfirm={handleDeleteUser}
        onCancel={() => setDeleteConfirm({ isOpen: false, user: null })}
        confirmText={deleting ? "Deleting..." : "Yes, Delete User"}
        confirmVariant="danger"
      />
    </div>
  );
}
