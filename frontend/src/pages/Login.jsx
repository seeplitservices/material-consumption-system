import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, ShieldCheck, UserCheck, ClipboardPenLine } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, loginAsOperator } = useAuth();
  const [activeTab, setActiveTab] = useState('operator'); // 'operator' (easy sign-in) or 'director'
  const [operatorName, setOperatorName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmitDirector = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both corporate email and password.');
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

  const handleOperatorSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await loginAsOperator(operatorName);
    } catch (err) {
      setError(err.message || 'Operator sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDirector = (demoEmail, demoPass) => {
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

          {/* Tab Navigation: Easy Operator Sign-In vs Management Director Login */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl mb-5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => { setActiveTab('operator'); setError(''); }}
              className={`py-2 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'operator'
                  ? 'bg-white text-sky-700 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 text-sky-600" />
              <span>Operator (Easy Sign-In)</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('director'); setError(''); }}
              className={`py-2 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'director'
                  ? 'bg-white text-purple-700 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
              <span>Director / Admin</span>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <span className="font-semibold">Error:</span> {error}
            </div>
          )}

          {/* TAB 1: Operator Easy Sign-In (No Credentials Needed) */}
          {activeTab === 'operator' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-sky-50/70 border border-sky-100 text-sky-950">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <h3 className="font-bold text-xs text-sky-900 flex items-center gap-1.5">
                    <ClipboardPenLine className="w-3.5 h-3.5 text-sky-600" />
                    <span>Shop-Floor Easy Sign-In</span>
                  </h3>
                </div>
                <p className="text-[11px] text-sky-700 leading-relaxed">
                  No password required. Instant 1-click access to record daily sheet punching, cutbit usage, and scrap weighing.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Operator Name <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <UserCheck className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={operatorName}
                    onChange={e => setOperatorName(e.target.value)}
                    placeholder="e.g. Suriya / Murugan (or leave blank)"
                    className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-300 bg-slate-50/70 hover:bg-slate-50 focus:bg-white text-slate-900 focus:outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100 transition-all font-medium"
                  />
                </div>
                <span className="text-[10px] text-slate-400 block mt-1">
                  You can also enter your name during each material punching transaction.
                </span>
              </div>

              <button
                type="button"
                onClick={handleOperatorSignIn}
                disabled={loading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-sky-600 to-sky-700 hover:from-sky-500 hover:to-sky-600 active:from-sky-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-sky-600/25 transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <span>Opening Portal...</span>
                ) : (
                  <>
                    <span>Sign In as Data Entry Operator</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* TAB 2: Director / Administrator Secure Login (Password Protected) */}
          {activeTab === 'director' && (
            <form onSubmit={handleSubmitDirector} className="space-y-4">
              <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-100 text-purple-950 text-[11px] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
                <span>
                  <strong>Management Login:</strong> Enter corporate credentials for Dashboard, Material Stock, Reports & Settings.
                </span>
              </div>

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
                    placeholder="director@factory.com"
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
                className="w-full mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 active:from-red-700 active:to-red-800 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md shadow-red-600/25 transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <span>Verifying credentials...</span>
                ) : (
                  <>
                    <span>Sign In as Director / Admin</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleQuickDirector('director@factory.com', 'Director@123')}
                  className="w-full p-2 rounded-xl border border-purple-200 bg-purple-50/80 hover:bg-purple-100 text-purple-950 transition-colors text-xs flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                  <span className="font-semibold text-purple-800">Quick Fill Director Credentials</span>
                </button>
              </div>
            </form>
          )}
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
