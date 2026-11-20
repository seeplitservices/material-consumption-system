import React, { useState } from 'react';
import { Factory, Lock, Mail, ArrowRight, ShieldCheck, UserCheck, Eye } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30" />

      <div className="w-full max-w-md z-10">
        {/* App Logo & Title */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-sky-500/5">
            <Factory className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight">
            Material Consumption & Wastage
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manufacturing Operations & Inventory System
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
          <h2 className="text-sm font-semibold text-slate-200 mb-4 pb-2 border-b border-slate-800">
            Secure Portal Authentication
          </h2>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Corporate Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="operator@factory.com"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-950 text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-950 text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm shadow-sky-600/30 transition-all disabled:opacity-50"
            >
              {loading ? (
                <span>Verifying credentials...</span>
              ) : (
                <>
                  <span>Sign In to System</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Role Presets */}
          <div className="mt-6 pt-5 border-t border-slate-800">
            <span className="text-[11px] font-medium text-slate-400 block mb-2 text-center uppercase tracking-wider">
              Select Role for Testing
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickLogin('director@factory.com', 'Director@123')}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-purple-800/80 bg-purple-950/30 hover:bg-purple-950/60 text-purple-200 transition-colors text-center"
              >
                <div className="flex items-center gap-1.5 font-bold mb-0.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                  <span>Director</span>
                </div>
                <span className="text-[10px] text-purple-300/70">All Features Access</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('operator@factory.com', 'Operator@123')}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-sky-800/80 bg-sky-950/30 hover:bg-sky-950/60 text-sky-200 transition-colors text-center"
              >
                <div className="flex items-center gap-1.5 font-bold mb-0.5">
                  <UserCheck className="w-3.5 h-3.5 text-sky-400" />
                  <span>Data Entry User</span>
                </div>
                <span className="text-[10px] text-sky-300/70">Daily Entry Only</span>
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-500 mt-6">
          Single Source of Truth: Google Sheets API (Unified Sheet)
        </p>
      </div>
    </div>
  );
}
