import React from 'react';
import {
  LayoutDashboard,
  ClipboardPenLine,
  Boxes,
  Layers,
  Trash2,
  Activity,
  History,
  FileSpreadsheet,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  Factory
} from 'lucide-react';

const ALL_NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, directorOnly: true },
  { id: 'daily-entry', label: 'Daily Material Entry', icon: ClipboardPenLine, badge: 'Entry' },
  { id: 'material-stock', label: 'Material Stock', icon: Layers, directorOnly: true },
  { id: 'material-master', label: 'Material Master', icon: Boxes, directorOnly: true },
  { id: 'scrap-analysis', label: 'Scrap & Wastage', icon: Trash2, directorOnly: true },
  { id: 'production-summary', label: 'Production Summary', icon: Activity, directorOnly: true },
  { id: 'historical-records', label: 'Historical Records', icon: History },
  { id: 'reports', label: 'Reports & Export', icon: FileSpreadsheet, directorOnly: true },
  { id: 'user-management', label: 'User Management', icon: Users, directorOnly: true },
  { id: 'settings', label: 'Settings', icon: Settings, directorOnly: true },
];

export default function Sidebar({ currentPage, onNavigate, collapsed, onToggleCollapse, isDirector }) {
  // If not Director, show Daily Material Entry and Historical Records
  const visibleNavItems = ALL_NAV_ITEMS.filter(item => {
    if (!isDirector) {
      return item.id === 'daily-entry' || item.id === 'historical-records';
    }
    return true;
  });

  return (
    <aside
      className={`fixed top-0 left-0 h-screen z-30 transition-all duration-300 flex flex-col border-r
        ${collapsed ? 'w-20' : 'w-64'}
        bg-slate-900 border-slate-800 text-slate-300`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800 bg-slate-950/40">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 shrink-0">
            <Factory className="w-5 h-5" />
          </div>
          {!collapsed && (
            <div className="flex flex-col truncate">
              <span className="font-bold text-sm text-slate-100 tracking-tight">MCWMS</span>
              <span className="text-[11px] text-slate-400 font-medium truncate">
                {isDirector ? 'Executive Portal' : 'Operator Entry Portal'}
              </span>
            </div>
          )}
        </div>
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
        {visibleNavItems.map(item => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group relative
                ${isActive
                  ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {!collapsed && item.badge && (
                <span className={`ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded
                  ${isActive ? 'bg-sky-700 text-sky-100' : 'bg-slate-800 text-slate-400'}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-3 border-t border-slate-800 text-[11px] text-slate-400">
        {!collapsed ? (
          <div className="flex items-center justify-between">
            <span>Google Sheets Sync</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
        ) : (
          <div className="flex justify-center">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Google Sheets Sync Active"></span>
          </div>
        )}
      </div>
    </aside>
  );
}
