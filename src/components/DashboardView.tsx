import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Clock,
  CheckCircle2,
  FileText,
  FileSpreadsheet,
  PlusCircle,
  Users,
  Download,
  Eye,
  Trash2,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Building,
  Edit3,
  Paperclip,
  CreditCard,
  Receipt,
  Landmark,
  Percent,
  Scale,
  Image as ImageIcon
} from 'lucide-react';
import { Invoice, Vendor, ActiveNavTab, InvoiceAttachment, Expense } from '../types';
import { formatCurrency, formatDateToDisplay, downloadAttachment, downloadAllAttachments } from '../utils/formatters';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { AttachmentViewerModal } from './AttachmentViewerModal';
import { InvoiceReportsAccounting } from './InvoiceReportsAccounting';
import { storage } from '../services/storage';

interface DashboardViewProps {
  invoices: Invoice[];
  vendors: Vendor[];
  expenses?: Expense[];
  onNavigate: (tab: ActiveNavTab) => void;
  onViewInvoice: (invoice: Invoice) => void;
  onDownloadInvoice: (invoice: Invoice) => void;
  onEditInvoice?: (invoice: Invoice) => void;
  onMarkAsPaid: (invoiceId: string) => void;
  onDeleteInvoice?: (invoiceId: string) => void;
  onAddAttachment?: (invoiceId: string, attachment: Omit<InvoiceAttachment, 'id' | 'uploadedAt'>) => void;
  onAddAttachments?: (invoiceId: string, attachments: Array<Omit<InvoiceAttachment, 'id' | 'uploadedAt'>>) => void;
  onRemoveAttachment?: (invoiceId: string, attachmentId: string) => void;
  onShowToast?: (message: string, type?: 'success' | 'info') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  invoices,
  vendors,
  expenses = [],
  onNavigate,
  onViewInvoice,
  onDownloadInvoice,
  onEditInvoice,
  onMarkAsPaid,
  onDeleteInvoice,
  onAddAttachment,
  onAddAttachments,
  onRemoveAttachment,
  onShowToast,
}) => {
  const safeInvoices = invoices || [];
  const safeVendors = vendors || [];
  const totalInvoiced = safeInvoices.reduce((acc, inv) => acc + (inv.grandTotal || 0), 0);
  const openInvoices = safeInvoices.filter((inv) => inv.status === 'OPEN');
  const partialInvoices = safeInvoices.filter((inv) => inv.status === 'PARTIALLY_PAID');
  const paidInvoices = safeInvoices.filter((inv) => inv.status === 'PAID');

  const openBalance = safeInvoices.reduce((acc, inv) => {
    if (inv.status === 'PAID') return acc;
    if (inv.balanceDue !== undefined) return acc + inv.balanceDue;
    const paid = inv.amountPaid || 0;
    return acc + Math.max(0, inv.grandTotal - paid);
  }, 0);

  const paidBalance = safeInvoices.reduce((acc, inv) => {
    if (inv.status === 'PAID') return acc + inv.grandTotal;
    return acc + (inv.amountPaid || 0);
  }, 0);

  const totalTaxCollected = safeInvoices.reduce((acc, inv) => acc + (inv.taxAmount || 0), 0);
  const taxCollectedRealized = safeInvoices.reduce((acc, inv) => {
    if (inv.status === 'PAID') return acc + (inv.taxAmount || 0);
    if (inv.amountPaid && inv.grandTotal > 0) {
      return acc + (inv.amountPaid / inv.grandTotal) * (inv.taxAmount || 0);
    }
    return acc;
  }, 0);

  const safeExpenses = expenses || [];
  const totalExpenses = safeExpenses.reduce((acc, exp) => acc + (Number(exp.amount) || 0), 0);
  const totalTaxPaid = safeExpenses.reduce((acc, exp) => acc + (Number(exp.taxAmount) || 0), 0);
  const expensesWithTaxCount = safeExpenses.filter((e) => Number(e.taxAmount) > 0).length;
  const netTaxRemittance = totalTaxCollected - totalTaxPaid;
  const netOperatingIncome = totalInvoiced - totalExpenses;

  const recentInvoices = safeInvoices.slice(0, 5);
  const recentExpenses = safeExpenses.slice(0, 4);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);

  // Attachment interactive modal & popover state
  const [attachmentModalInvoice, setAttachmentModalInvoice] = useState<Invoice | null>(null);
  const [activeAttachmentDropdownId, setActiveAttachmentDropdownId] = useState<string | null>(null);

  // Close attachment dropdown when clicking outside
  useEffect(() => {
    const handleGlobalClick = () => setActiveAttachmentDropdownId(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-6 text-white shadow-lg border border-slate-800">
        <div>
          <span className="inline-block px-3 py-1 bg-indigo-500/20 text-indigo-300 text-xs font-semibold rounded-full border border-indigo-400/20 mb-2">
            Master Invoice Management
          </span>
          <h1 className="text-2xl font-bold tracking-tight">9572-1049 QUÉBEC INC.</h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1">
            Vehicle Sourcing & Locating Services • Financial Overview & Active Billing
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            id="dash-create-invoice-btn"
            onClick={() => onNavigate('create-invoice')}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-lg shadow transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Invoice</span>
          </button>
          <button
            id="dash-expenses-btn"
            onClick={() => onNavigate('expenses')}
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-600/30 hover:bg-rose-600/40 active:bg-rose-600/50 text-white text-xs font-semibold rounded-lg border border-rose-400/30 transition cursor-pointer"
          >
            <Receipt className="w-4 h-4 text-rose-300" />
            <span>Track Expenses ({safeExpenses.length})</span>
          </button>
          <button
            id="dash-reports-btn"
            onClick={() => {
              const el = document.getElementById('invoice-reports-accounting');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-500/20 hover:bg-indigo-500/30 active:bg-indigo-500/40 text-white text-xs font-semibold rounded-lg border border-indigo-400/30 transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-indigo-300" />
            <span>Accounting Reports & CSV</span>
          </button>
          <button
            id="dash-manage-vendors-btn"
            onClick={() => onNavigate('vendors')}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-xs font-semibold rounded-lg border border-white/20 transition cursor-pointer"
          >
            <Users className="w-4 h-4" />
            <span>Manage Vendors</span>
          </button>
        </div>
      </div>

      {/* Metrics Row (Invoices + Expenses + Net Profit) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Total Invoiced */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Invoiced
            </p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1 font-mono">
              {formatCurrency(totalInvoiced)}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 font-medium">
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
              {invoices.length} invoices generated
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Open / Unpaid */}
        <div
          onClick={() => onNavigate('open-invoices')}
          className="bg-white rounded-xl p-5 border border-amber-200 bg-amber-50/20 shadow-sm flex items-center justify-between cursor-pointer hover:border-amber-300 transition"
        >
          <div>
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider flex items-center gap-1">
              <span>Open / Unpaid</span>
              <ArrowUpRight className="w-3 h-3" />
            </p>
            <h3 className="text-2xl font-bold text-amber-900 mt-1 font-mono">
              {formatCurrency(openBalance)}
            </h3>
            <p className="text-[11px] text-amber-700 mt-1 font-semibold">
              {openInvoices.length} awaiting payment
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Paid / Completed */}
        <div
          onClick={() => onNavigate('paid-invoices')}
          className="bg-white rounded-xl p-5 border border-emerald-200 bg-emerald-50/20 shadow-sm flex items-center justify-between cursor-pointer hover:border-emerald-300 transition"
        >
          <div>
            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
              <span>Paid / Collected</span>
              <ArrowUpRight className="w-3 h-3" />
            </p>
            <h3 className="text-2xl font-bold text-emerald-900 mt-1 font-mono">
              {formatCurrency(paidBalance)}
            </h3>
            <p className="text-[11px] text-emerald-700 mt-1 font-semibold">
              {paidInvoices.length} completed
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Total Business Expenses */}
        <div
          onClick={() => onNavigate('expenses')}
          className="bg-white rounded-xl p-5 border border-rose-200 bg-rose-50/20 shadow-sm flex items-center justify-between cursor-pointer hover:border-rose-300 transition"
        >
          <div>
            <p className="text-xs font-semibold text-rose-700 uppercase tracking-wider flex items-center gap-1">
              <span>Total Outlays</span>
              <ArrowUpRight className="w-3 h-3" />
            </p>
            <h3 className="text-2xl font-bold text-rose-900 mt-1 font-mono">
              {formatCurrency(totalExpenses)}
            </h3>
            <p className="text-[11px] text-rose-700 mt-1 font-semibold">
              {safeExpenses.length} non-invoiced costs
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        {/* Net Operating Profit */}
        <div className={`bg-white rounded-xl p-5 border shadow-sm flex items-center justify-between ${
          netOperatingIncome >= 0 ? 'border-emerald-200 bg-emerald-50/30' : 'border-rose-200 bg-rose-50/30'
        }`}>
          <div>
            <p className={`text-xs font-semibold uppercase tracking-wider ${
              netOperatingIncome >= 0 ? 'text-emerald-800' : 'text-rose-800'
            }`}>
              Net Operating Profit
            </p>
            <h3 className={`text-2xl font-bold mt-1 font-mono ${
              netOperatingIncome >= 0 ? 'text-emerald-950' : 'text-rose-950'
            }`}>
              {formatCurrency(netOperatingIncome)}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">
              Revenue - Outlays
            </p>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            netOperatingIncome >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
          }`}>
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tax Accounting Cards (Tax Collected & Tax Paid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Tax Collected Card */}
        <div className="bg-white rounded-xl p-5 border border-indigo-200 bg-indigo-50/20 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5 text-indigo-600" />
              <span>Tax Collected (Invoices)</span>
            </p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1 font-mono">
              {formatCurrency(totalTaxCollected)}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">
              HST/GST/QST on invoices ({formatCurrency(taxCollectedRealized)} collected)
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0">
            <Percent className="w-6 h-6" />
          </div>
        </div>

        {/* Tax Paid Card */}
        <div
          onClick={() => onNavigate('expenses')}
          className="bg-white rounded-xl p-5 border border-amber-200 bg-amber-50/20 shadow-sm flex items-center justify-between cursor-pointer hover:border-amber-300 transition"
        >
          <div>
            <p className="text-xs font-semibold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-amber-600" />
              <span>Tax Paid (Expenses)</span>
              <ArrowUpRight className="w-3 h-3 text-amber-600" />
            </p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1 font-mono">
              {formatCurrency(totalTaxPaid)}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">
              Input tax credits paid on business outlays ({expensesWithTaxCount} items)
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        {/* Net Tax Remittance Card */}
        <div className={`bg-white rounded-xl p-5 border shadow-sm flex items-center justify-between sm:col-span-2 lg:col-span-1 ${
          netTaxRemittance >= 0 ? 'border-slate-200 bg-slate-50/40' : 'border-blue-200 bg-blue-50/20'
        }`}>
          <div>
            <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-slate-600" />
              <span>Net Tax Remittance</span>
            </p>
            <h3 className={`text-2xl font-bold mt-1 font-mono ${
              netTaxRemittance >= 0 ? 'text-slate-900' : 'text-blue-900'
            }`}>
              {formatCurrency(netTaxRemittance)}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">
              {netTaxRemittance >= 0
                ? 'Tax Collected − Tax Paid (Payable to Government)'
                : 'Tax Paid > Tax Collected (Tax Refund Due)'}
            </p>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
            netTaxRemittance >= 0 ? 'bg-slate-200/80 text-slate-700' : 'bg-blue-100 text-blue-700'
          }`}>
            <Scale className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Invoice Reports & Accounting Module */}
      <InvoiceReportsAccounting
        invoices={safeInvoices}
        vendors={safeVendors}
        onViewInvoice={onViewInvoice}
        onShowToast={onShowToast || ((msg) => console.log(msg))}
      />

      {/* Recent Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recent Invoices</h3>
            <p className="text-xs text-slate-500">
              Latest generated invoices matching master company template
            </p>
          </div>
          <button
            onClick={() => onNavigate('all-invoices')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
          >
            <span>View All</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentInvoices.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold">No invoices generated yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Click &quot;Create New Invoice&quot; to generate your first invoice.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-5">Invoice #</th>
                  <th className="py-3 px-5">Vendor / Billed To</th>
                  <th className="py-3 px-5">Date</th>
                  <th className="py-3 px-5 text-right">Tax</th>
                  <th className="py-3 px-5 text-right">Total Amount</th>
                  <th className="py-3 px-5 text-center">Status</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-5 font-bold text-slate-900 font-mono">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onViewInvoice(inv)}
                          className="text-indigo-700 hover:text-indigo-900 hover:underline cursor-pointer"
                        >
                          {inv.invoiceNumber}
                        </button>
                        {inv.attachments && inv.attachments.length > 0 && (
                          <div className="relative inline-block">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveAttachmentDropdownId(
                                  activeAttachmentDropdownId === inv.id ? null : inv.id
                                );
                              }}
                              title={`Click to view or download ${inv.attachments.length} attachment(s)`}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[10px] font-bold transition cursor-pointer shadow-2xs group"
                            >
                              <Paperclip className="w-3 h-3 text-indigo-600 group-hover:scale-110 transition-transform" />
                              <span>{inv.attachments.length}</span>
                            </button>

                            {/* Dropdown Popover */}
                            {activeAttachmentDropdownId === inv.id && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute left-0 top-full mt-1.5 z-40 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 p-2.5 text-left font-sans animate-in fade-in zoom-in-95 duration-100"
                              >
                                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 text-xs font-bold text-slate-800">
                                  <span className="flex items-center gap-1.5">
                                    <Paperclip className="w-3.5 h-3.5 text-indigo-600" />
                                    Attachments ({inv.attachments.length})
                                  </span>
                                  {inv.attachments.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => downloadAllAttachments(inv.attachments || [])}
                                      className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                                    >
                                      <Download className="w-3 h-3" />
                                      Download All
                                    </button>
                                  )}
                                </div>

                                <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                                  {inv.attachments.map((att) => {
                                    const isPdf = att.type?.includes('pdf') || att.name.toLowerCase().endsWith('.pdf');
                                    return (
                                      <div
                                        key={att.id}
                                        className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 border border-slate-100 transition text-xs"
                                      >
                                        <div className="flex items-center gap-2 min-w-0 pr-1">
                                          <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                                            isPdf ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'
                                          }`}>
                                            {isPdf ? <FileText className="w-3.5 h-3.5" /> : <ImageIcon className="w-3.5 h-3.5" />}
                                          </div>
                                          <div className="min-w-0">
                                            <p className="font-semibold text-slate-800 truncate text-[11px]" title={att.name}>
                                              {att.name}
                                            </p>
                                            <p className="text-[9px] text-slate-400 font-mono">
                                              {att.size ? (att.size < 1024 * 1024 ? `${Math.round(att.size / 1024)} KB` : `${(att.size / (1024 * 1024)).toFixed(1)} MB`) : ''}
                                            </p>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-1 shrink-0">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActiveAttachmentDropdownId(null);
                                              setAttachmentModalInvoice(inv);
                                            }}
                                            title="Open and view preview"
                                            className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition cursor-pointer"
                                          >
                                            <Eye className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => downloadAttachment(att)}
                                            title="Download this file"
                                            className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition cursor-pointer"
                                          >
                                            <Download className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>

                                <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveAttachmentDropdownId(null);
                                      setAttachmentModalInvoice(inv);
                                    }}
                                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span>Full Viewer & Manager</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setActiveAttachmentDropdownId(null)}
                                    className="text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer"
                                  >
                                    Close
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-5">
                      <div className="font-semibold text-slate-900">
                        {inv.vendor?.companyName || 'N/A'}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-xs">
                        {inv.items?.length || 0} vehicle service item(s)
                      </div>
                    </td>
                    <td className="py-3 px-5 text-slate-600">
                      {formatDateToDisplay(inv.invoiceDate)}
                    </td>
                    <td className="py-3 px-5 text-right font-mono text-slate-600">
                      {formatCurrency(inv.taxAmount)}
                    </td>
                    <td className="py-3 px-5 text-right font-mono font-bold text-slate-900">
                      <div>{formatCurrency(inv.grandTotal)}</div>
                      {inv.status === 'PARTIALLY_PAID' && (
                        <div className="text-[10px] text-amber-600 font-normal">
                          Bal: {formatCurrency(inv.balanceDue || 0)}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-5 text-center">
                      {inv.status === 'PAID' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          PAID
                        </span>
                      ) : inv.status === 'PARTIALLY_PAID' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200" title={`Paid: ${formatCurrency(inv.amountPaid || 0)} / Balance: ${formatCurrency(inv.balanceDue || 0)}`}>
                          <CreditCard className="w-3 h-3 text-blue-600" />
                          PARTIAL
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          <Clock className="w-3 h-3" />
                          OPEN
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {inv.status === 'OPEN' && (
                          <button
                            onClick={() => onMarkAsPaid(inv.id)}
                            title="Mark as Paid"
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold transition cursor-pointer"
                          >
                            Mark Paid
                          </button>
                        )}
                        <button
                          onClick={() => onViewInvoice(inv)}
                          title="Preview Master Invoice"
                          className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded transition cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {onEditInvoice && (
                          <button
                            onClick={() => onEditInvoice(inv)}
                            title="Edit Invoice"
                            className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded transition cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => onDownloadInvoice(inv)}
                          title="Download PDF"
                          className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded transition cursor-pointer"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        {inv.attachments && inv.attachments.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setAttachmentModalInvoice(inv)}
                            title={`View & Download ${inv.attachments.length} attachment(s)`}
                            className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition cursor-pointer relative"
                          >
                            <Paperclip className="w-4 h-4" />
                            <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 bg-indigo-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                              {inv.attachments.length}
                            </span>
                          </button>
                        )}
                        {onDeleteInvoice && (
                          <button
                            onClick={() => setInvoiceToDelete(inv)}
                            title="Delete Invoice"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Business Outlays & Expenses Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-rose-500" />
              <span>Recent Non-Invoiced Outlays & Expenses</span>
            </h3>
            <p className="text-xs text-slate-500">
              Operational expenses (towing, safety inspections, fuel, maintenance, licensing & custom categories)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('expenses')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
            >
              <span>Manage All Expenses</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {recentExpenses.length === 0 ? (
          <div className="py-10 text-center text-slate-500">
            <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">No expenses recorded yet</p>
            <button
              onClick={() => onNavigate('expenses')}
              className="mt-2 text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
            >
              + Add an expense
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Payee</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {recentExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-medium">
                      {formatDateToDisplay(exp.date)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {exp.title}
                      {exp.reference && (
                        <span className="text-[10px] text-slate-400 font-mono ml-2">
                          #{exp.reference}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                      {exp.payee || <span className="text-slate-300 italic">—</span>}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                      {exp.paymentMethod}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-right font-mono font-bold text-slate-900">
                      {formatCurrency(exp.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Popup */}
      <DeleteConfirmModal
        isOpen={!!invoiceToDelete}
        title="Delete Invoice"
        itemName={`Invoice #${invoiceToDelete?.invoiceNumber}`}
        itemSubtitle={`${invoiceToDelete?.vendor.companyName} • Total: ${invoiceToDelete ? formatCurrency(invoiceToDelete.grandTotal) : ''}`}
        message="Are you sure you want to permanently delete this invoice from your database? This action cannot be undone."
        confirmText="Yes, Delete Invoice"
        onConfirm={() => {
          if (invoiceToDelete && onDeleteInvoice) {
            onDeleteInvoice(invoiceToDelete.id);
            setInvoiceToDelete(null);
          }
        }}
        onCancel={() => setInvoiceToDelete(null)}
      />

      {/* Attachment Viewer & Download Modal */}
      {attachmentModalInvoice && (
        <AttachmentViewerModal
          isOpen={Boolean(attachmentModalInvoice)}
          invoice={attachmentModalInvoice}
          onClose={() => setAttachmentModalInvoice(null)}
          onAddAttachment={(invoiceId, att) => {
            if (onAddAttachment) {
              onAddAttachment(invoiceId, att);
            } else {
              storage.addAttachment(invoiceId, att);
            }
            const updated = storage.getInvoiceById(invoiceId);
            if (updated) setAttachmentModalInvoice(updated);
          }}
          onAddAttachments={(invoiceId, atts) => {
            if (onAddAttachments) {
              onAddAttachments(invoiceId, atts);
            } else {
              storage.addAttachments(invoiceId, atts);
            }
            const updated = storage.getInvoiceById(invoiceId);
            if (updated) setAttachmentModalInvoice(updated);
          }}
          onRemoveAttachment={(invoiceId, attId) => {
            if (onRemoveAttachment) {
              onRemoveAttachment(invoiceId, attId);
            } else {
              storage.removeAttachment(invoiceId, attId);
            }
            const updated = storage.getInvoiceById(invoiceId);
            if (updated) setAttachmentModalInvoice(updated);
          }}
        />
      )}
    </div>
  );
};
