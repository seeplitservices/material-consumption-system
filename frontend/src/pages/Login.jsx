import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';
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
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-gray-50 to-slate-200/80 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Subtle industrial blueprint grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#cbd5e1_1px,transparent_1px),linear-gradient(to_bottom,#cbd5e1_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_40%,#000_60%,transparent_100%)] opacity-35 pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* Card */}
        <div className="bg-white/95 border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-slate-300/50 backdrop-blur-md">
          {/* Company Logo Header */}
          <div className="text-center mb-6">
            <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm inline-block max-w-full">
              <img
                src="/logo.jpg"
                alt="Saravanan Electricals and Engineering Pvt. Ltd"
                className="h-14 sm:h-16 w-auto max-w-full object-contain mx-auto"
              />
            </div>
            <h1 className="text-sm font-bold text-slate-800 tracking-tight mt-3">
              Material Consumption & Wastage System
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">
              Manufacturing & Punching Operations Portal
            </p>
          </div>

          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Portal Authentication
            </h2>
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live System
            </span>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <span className="font-semibold">Error:</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Corporate Email ID
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="operator@factory.com"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50/70 hover:bg-slate-50 focus:bg-white text-slate-900 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 transition-all font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50/70 hover:bg-slate-50 focus:bg-white text-slate-900 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 transition-all font-mono"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 active:from-red-700 active:to-red-800 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md shadow-red-600/25 transition-all disabled:opacity-50"
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
          <div className="mt-6 pt-5 border-t border-slate-100">
            <span className="text-[10px] font-semibold text-slate-400 block mb-2.5 text-center uppercase tracking-wider">
              Quick Role Selection
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickLogin('director@factory.com', 'Director@123')}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-purple-200 bg-purple-50/80 hover:bg-purple-100 text-purple-950 transition-colors text-center shadow-xs"
              >
                <div className="flex items-center gap-1.5 font-bold mb-0.5 text-purple-800">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                  <span>Director</span>
                </div>
                <span className="text-[10px] text-purple-600/80 font-medium">All Features Access</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('operator@factory.com', 'Operator@123')}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-sky-200 bg-sky-50/80 hover:bg-sky-100 text-sky-950 transition-colors text-center shadow-xs"
              >
                <div className="flex items-center gap-1.5 font-bold mb-0.5 text-sky-800">
                  <UserCheck className="w-3.5 h-3.5 text-sky-600" />
                  <span>Data Entry User</span>
                </div>
                <span className="text-[10px] text-sky-600/80 font-medium">Daily Entry & History</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-slate-500 mt-5 space-y-1">
          <p className="font-semibold text-slate-600">
            SARAVANAN ELECTRICALS AND ENGINEERING PVT. LTD
          </p>
          <p className="text-[10px] text-slate-400">
            Single Source of Truth: Google Sheets API
          </p>
        </div>
      </div>
    </div>
  );
}
