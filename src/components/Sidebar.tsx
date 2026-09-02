import React from 'react';
import {
  LayoutDashboard,
  Users,
  FilePlus2,
  Files,
  Clock,
  CheckCircle2,
  Settings,
  LogOut,
  Building2,
  ReceiptText
} from 'lucide-react';
import { ActiveNavTab } from '../types';

interface SidebarProps {
  activeTab: ActiveNavTab;
  onTabChange: (tab: ActiveNavTab) => void;
  openCount: number;
  paidCount: number;
  vendorCount: number;
  totalInvoiceCount: number;
  onLogout: () => void;
  username: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  openCount,
  paidCount,
  vendorCount,
  totalInvoiceCount,
  onLogout,
  username,
}) => {
  return (
    <aside
      id="main-sidebar"
      className="w-64 bg-slate-900 text-slate-300 flex flex-col flex-shrink-0 h-screen border-r border-slate-800/90 select-none"
    >
      {/* Brand Header */}
      <div className="p-6 flex items-center gap-3 bg-slate-950 border-b border-slate-800">
        <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center font-bold text-white text-xs shadow-md shadow-indigo-500/30">
          BK
        </div>
        <div className="overflow-hidden">
          <span className="font-bold text-white tracking-tight text-sm block truncate">
            9572-1049 QUÉBEC
          </span>
          <span className="text-[11px] text-slate-400 font-medium truncate block">
            BillFlow • AR26 Master
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto">
        {/* Dashboard */}
        <button
          id="nav-dashboard"
          onClick={() => onTabChange('dashboard')}
          className={`w-full flex items-center justify-between p-3 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
            activeTab === 'dashboard'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
              : 'text-slate-300 opacity-70 hover:opacity-100 hover:bg-slate-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </div>
        </button>

        {/* Vendors */}
        <button
          id="nav-vendors"
          onClick={() => onTabChange('vendors')}
          className={`w-full flex items-center justify-between p-3 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
            activeTab === 'vendors'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
              : 'text-slate-300 opacity-70 hover:opacity-100 hover:bg-slate-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <Users className="w-4 h-4" />
            <span>Vendors</span>
          </div>
          {vendorCount > 0 && (
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'vendors' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300'
              }`}
            >
              {vendorCount}
            </span>
          )}
        </button>

        {/* Create Invoice Action */}
        <button
          id="nav-create-invoice"
          onClick={() => onTabChange('create-invoice')}
          className={`w-full flex items-center justify-between p-3 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer ${
            activeTab === 'create-invoice'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-indigo-600/20 text-indigo-200 hover:bg-indigo-600/30 border border-indigo-500/30'
          }`}
        >
          <div className="flex items-center gap-3">
            <FilePlus2 className="w-4 h-4" />
            <span>+ Create Invoice</span>
          </div>
        </button>

        {/* Invoices Group Header */}
        <div className="pt-5 pb-1 px-3 text-[11px] uppercase font-semibold text-slate-500 tracking-wider">
          Invoices
        </div>

        {/* All Invoices */}
        <button
          id="nav-all-invoices"
          onClick={() => onTabChange('all-invoices')}
          className={`w-full flex items-center justify-between p-3 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
            activeTab === 'all-invoices'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
              : 'text-slate-300 opacity-70 hover:opacity-100 hover:bg-slate-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <Files className="w-4 h-4" />
            <span>All Invoices</span>
          </div>
          {totalInvoiceCount > 0 && (
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'all-invoices' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300'
              }`}
            >
              {totalInvoiceCount}
            </span>
          )}
        </button>

        {/* Open / Unpaid */}
        <button
          id="nav-open-invoices"
          onClick={() => onTabChange('open-invoices')}
          className={`w-full flex items-center justify-between p-3 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
            activeTab === 'open-invoices'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
              : 'text-slate-300 opacity-70 hover:opacity-100 hover:bg-slate-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 bg-amber-500 rounded-full" />
            <span>Open / Unpaid</span>
          </div>
          {openCount > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {openCount}
            </span>
          )}
        </button>

        {/* Paid / Completed */}
        <button
          id="nav-paid-invoices"
          onClick={() => onTabChange('paid-invoices')}
          className={`w-full flex items-center justify-between p-3 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
            activeTab === 'paid-invoices'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
              : 'text-slate-300 opacity-70 hover:opacity-100 hover:bg-slate-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 bg-emerald-500 rounded-full" />
            <span>Paid / Completed</span>
          </div>
          {paidCount > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {paidCount}
            </span>
          )}
        </button>

        {/* Settings */}
        <div className="pt-4 pb-1 px-3 text-[11px] uppercase font-semibold text-slate-500 tracking-wider">
          System
        </div>

        <button
          id="nav-settings"
          onClick={() => onTabChange('settings')}
          className={`w-full flex items-center justify-between p-3 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
              : 'text-slate-300 opacity-70 hover:opacity-100 hover:bg-slate-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <Settings className="w-4 h-4" />
            <span>Tax & Settings</span>
          </div>
        </button>
      </nav>

      {/* User & Logout section */}
      <div className="p-4 border-t border-slate-800 bg-slate-950">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-indigo-900/60 border border-indigo-500/30 text-indigo-300 flex items-center justify-center font-bold text-xs">
              {username}
            </div>
            <div className="text-xs overflow-hidden">
              <p className="font-medium text-white truncate">{username} (Admin)</p>
              <p className="text-[10px] text-slate-400">System ID: 4737</p>
            </div>
          </div>
          <button
            id="sidebar-logout-btn"
            onClick={onLogout}
            title="Sign Out"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
