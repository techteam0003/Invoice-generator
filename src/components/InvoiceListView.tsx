import React, { useState, useMemo } from 'react';
import {
  Files,
  Search,
  Filter,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  Trash2,
  Calendar,
  Building,
  ArrowUpDown,
  Plus,
  FileSpreadsheet,
  AlertCircle,
  Edit3
} from 'lucide-react';
import { Invoice, Vendor } from '../types';
import { formatCurrency, formatDateToDisplay } from '../utils/formatters';
import { DeleteConfirmModal } from './DeleteConfirmModal';

interface InvoiceListViewProps {
  invoices: Invoice[];
  vendors: Vendor[];
  title: string;
  subtitle: string;
  statusFilterPreset?: 'ALL' | 'OPEN' | 'PAID';
  onViewInvoice: (invoice: Invoice) => void;
  onDownloadInvoice: (invoice: Invoice) => void;
  onEditInvoice?: (invoice: Invoice) => void;
  onMarkAsPaid: (invoiceId: string, paymentDate?: string) => void;
  onMarkAsOpen: (invoiceId: string) => void;
  onDeleteInvoice: (invoiceId: string) => void;
  onCreateNewInvoice: () => void;
}

export const InvoiceListView: React.FC<InvoiceListViewProps> = ({
  invoices,
  vendors,
  title,
  subtitle,
  statusFilterPreset = 'ALL',
  onViewInvoice,
  onDownloadInvoice,
  onEditInvoice,
  onMarkAsPaid,
  onMarkAsOpen,
  onDeleteInvoice,
  onCreateNewInvoice,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVendorFilter, setSelectedVendorFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'PAID'>(statusFilterPreset);
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');

  // Mark paid modal state
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
  const [paymentDateInput, setPaymentDateInput] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);

  const filteredInvoices = useMemo(() => {
    return (invoices || []).filter((inv) => {
      // Preset status filter
      if (statusFilterPreset !== 'ALL' && inv.status !== statusFilterPreset) {
        return false;
      }
      if (statusFilterPreset === 'ALL' && statusFilter !== 'ALL' && inv.status !== statusFilter) {
        return false;
      }

      // Vendor filter
      if (selectedVendorFilter && inv.vendorId !== selectedVendorFilter) {
        return false;
      }

      // Search query (invoice number, vendor name, vin, descriptions)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesNumber = (inv.invoiceNumber || '').toLowerCase().includes(q);
        const matchesVendor = (inv.vendor?.companyName || '').toLowerCase().includes(q);
        const matchesItems = (inv.items || []).some(
          (item) =>
            (item.title || '').toLowerCase().includes(q) ||
            (item.subDetails && item.subDetails.toLowerCase().includes(q))
        );
        if (!matchesNumber && !matchesVendor && !matchesItems) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'amount-desc') return (b.grandTotal || 0) - (a.grandTotal || 0);
      if (sortBy === 'amount-asc') return (a.grandTotal || 0) - (b.grandTotal || 0);
      if (sortBy === 'date-asc') {
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      }
      // date-desc default
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }, [invoices, statusFilterPreset, statusFilter, selectedVendorFilter, searchQuery, sortBy]);

  const handleConfirmPayment = () => {
    if (payingInvoice) {
      onMarkAsPaid(payingInvoice.id, paymentDateInput);
      setPayingInvoice(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Files className="w-6 h-6 text-indigo-600" />
            {title}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>

        <button
          onClick={onCreateNewInvoice}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-lg shadow transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Invoice</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Invoice #, Vendor Name, or VIN / Model..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Vendor Filter */}
          <div className="md:col-span-3">
            <select
              value={selectedVendorFilter}
              onChange={(e) => setSelectedVendorFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="">All Vendors ({vendors.length})</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.companyName}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter (if in All Invoices view) */}
          {statusFilterPreset === 'ALL' && (
            <div className="md:col-span-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="OPEN">Open / Unpaid</option>
                <option value="PAID">Paid / Completed</option>
              </select>
            </div>
          )}

          {/* Sort By */}
          <div className={statusFilterPreset === 'ALL' ? 'md:col-span-2' : 'md:col-span-4'}>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="amount-desc">Highest Amount</option>
              <option value="amount-asc">Lowest Amount</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
          <span>
            Showing <strong className="text-slate-800">{filteredInvoices.length}</strong> invoice(s)
          </span>
          {(searchQuery || selectedVendorFilter || (statusFilterPreset === 'ALL' && statusFilter !== 'ALL')) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedVendorFilter('');
                setStatusFilter('ALL');
              }}
              className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredInvoices.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No invoices found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {searchQuery || selectedVendorFilter
                ? 'No invoices match your search filters.'
                : 'No invoices in this section. Create an invoice to get started.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Vendor Name</th>
                  <th className="py-3 px-4">Invoice Date</th>
                  <th className="py-3 px-4 text-right">Tax (HST/GST)</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Payment Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                    {/* Invoice Number */}
                    <td className="py-3.5 px-4 font-bold font-mono text-slate-900">
                      <button
                        onClick={() => onViewInvoice(inv)}
                        className="text-indigo-700 hover:text-indigo-900 hover:underline cursor-pointer"
                      >
                        {inv.invoiceNumber}
                      </button>
                    </td>

                    {/* Vendor Name */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">
                        {inv.vendor?.companyName || 'N/A'}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-xs">
                        {inv.items?.length || 0} vehicle service fee(s)
                      </div>
                    </td>

                    {/* Invoice Date */}
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {formatDateToDisplay(inv.invoiceDate)}
                    </td>

                    {/* Tax Amount */}
                    <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                      {formatCurrency(inv.taxAmount)}
                    </td>

                    {/* Total Amount */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-950">
                      {formatCurrency(inv.grandTotal)}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center">
                      {inv.status === 'PAID' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          PAID
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          <Clock className="w-3 h-3" />
                          OPEN / UNPAID
                        </span>
                      )}
                    </td>

                    {/* Payment Date */}
                    <td className="py-3.5 px-4 text-center text-slate-600 text-[11px]">
                      {inv.status === 'PAID' && inv.paymentDate ? (
                        <span className="font-semibold text-emerald-800">
                          {formatDateToDisplay(inv.paymentDate)}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {inv.status === 'OPEN' ? (
                          <button
                            onClick={() => {
                              setPayingInvoice(inv);
                              setPaymentDateInput(new Date().toISOString().split('T')[0]);
                            }}
                            title="Mark as Paid"
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Mark Paid</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => onMarkAsOpen(inv.id)}
                            title="Re-open Invoice"
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[10px] font-medium transition cursor-pointer"
                          >
                            Re-open
                          </button>
                        )}

                        <button
                          onClick={() => onViewInvoice(inv)}
                          title="View Master PDF"
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

                        <button
                          onClick={() => setInvoiceToDelete(inv)}
                          title="Delete Invoice"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
          if (invoiceToDelete) {
            onDeleteInvoice(invoiceToDelete.id);
            setInvoiceToDelete(null);
          }
        }}
        onCancel={() => setInvoiceToDelete(null)}
      />

      {/* Mark As Paid Modal */}
      {payingInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Mark Invoice as Paid</h3>
                <p className="text-xs text-slate-500 font-mono font-bold">
                  {payingInvoice.invoiceNumber} • {formatCurrency(payingInvoice.grandTotal)}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Payment Received Date
                </label>
                <input
                  type="date"
                  required
                  value={paymentDateInput}
                  onChange={(e) => setPaymentDateInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <p className="text-[11px] text-slate-500">
                This will move the invoice from <strong className="text-amber-700">Open / Unpaid</strong> to{' '}
                <strong className="text-emerald-700">Paid / Completed</strong> and store the receipt record permanently.
              </p>
            </div>

            <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPayingInvoice(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPayment}
                className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow transition cursor-pointer"
              >
                Confirm Paid
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
