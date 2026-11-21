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
  X
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

export default function Sidebar({
  currentPage,
  onNavigate,
  collapsed,
  onToggleCollapse,
  isDirector,
  mobileOpen = false,
  onCloseMobile
}) {
  // If not Director, show Daily Material Entry and Historical Records
  const visibleNavItems = ALL_NAV_ITEMS.filter(item => {
    if (!isDirector) {
      return item.id === 'daily-entry' || item.id === 'historical-records';
    }
    return true;
  });

  const handleItemClick = (id) => {
    onNavigate(id);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-30 md:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-screen z-40 md:z-30 transition-all duration-300 flex flex-col border-r
          bg-white border-slate-200 text-slate-700 shadow-md md:shadow-xs
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          ${collapsed ? 'md:w-20' : 'md:w-64'}
          w-64`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-3 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="bg-white rounded-lg p-1 shrink-0 flex items-center justify-center border border-slate-200 shadow-xs w-9 h-9 overflow-hidden">
              <img src="/logo.jpg" alt="Saravanan Logo" className="w-full h-full object-contain" />
            </div>
            {(!collapsed || mobileOpen) && (
              <div className="flex flex-col truncate">
                <span className="font-bold text-xs text-slate-900 tracking-tight leading-tight truncate">
                  SARAVANAN
                </span>
                <span className="text-[10px] text-slate-500 font-medium truncate leading-tight">
                  {isDirector ? 'Executive Portal' : 'Operator Portal'}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Desktop Collapse Toggle */}
            <button
              onClick={onToggleCollapse}
              className="hidden md:flex p-1.5 rounded-lg hover:bg-slate-200/70 text-slate-500 hover:text-slate-800 transition-colors"
              title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>

            {/* Mobile Close Button */}
            <button
              onClick={onCloseMobile}
              className="flex md:hidden p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
              title="Close Menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
          {visibleNavItems.map(item => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group relative
                  ${isActive
                    ? 'bg-red-600 text-white shadow-sm shadow-red-600/30 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/90'
                  }`}
                title={collapsed && !mobileOpen ? item.label : undefined}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-700'}`} />
                {(!collapsed || mobileOpen) && <span className="truncate">{item.label}</span>}
                {(!collapsed || mobileOpen) && item.badge && (
                  <span className={`ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded
                    ${isActive ? 'bg-red-700 text-red-100' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50/50 text-[11px] text-slate-500">
          {(!collapsed || mobileOpen) ? (
            <div className="flex items-center justify-between">
              <span className="font-medium text-[10px]">Google Sheets Sync</span>
              <span className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Active
              </span>
            </div>
          ) : (
            <div className="flex justify-center">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Google Sheets Sync Active"></span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
