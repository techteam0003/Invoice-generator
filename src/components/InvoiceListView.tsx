import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  Edit3,
  Paperclip,
  CreditCard,
  FileText,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { Invoice, Vendor, InvoiceAttachment } from '../types';
import { formatCurrency, formatDateToDisplay, downloadAttachment, downloadAllAttachments } from '../utils/formatters';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { AttachmentViewerModal } from './AttachmentViewerModal';
import { storage } from '../services/storage';

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
  onAddAttachment?: (invoiceId: string, attachment: Omit<InvoiceAttachment, 'id' | 'uploadedAt'>) => void;
  onAddAttachments?: (invoiceId: string, attachments: Array<Omit<InvoiceAttachment, 'id' | 'uploadedAt'>>) => void;
  onRemoveAttachment?: (invoiceId: string, attachmentId: string) => void;
}

interface SavedFilterState {
  searchQuery?: string;
  selectedVendorFilter?: string;
  statusFilter?: 'ALL' | 'OPEN' | 'PARTIALLY_PAID' | 'PAID';
  sortBy?: 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';
  startDate?: string;
  endDate?: string;
  activeDateQuick?: 'all' | 'this-month' | 'last-month' | 'this-quarter' | 'this-year' | 'custom';
  currentPage?: number;
  pageSize?: number;
}

const getSavedFilters = (preset: string): SavedFilterState => {
  try {
    const raw = sessionStorage.getItem(`invoice_filters_${preset}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    // ignore parse or storage errors
  }
  return {};
};

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
  onAddAttachment,
  onAddAttachments,
  onRemoveAttachment,
}) => {
  // Load saved filter state so returning after editing/updating keeps all filters intact
  const savedFilters = useMemo(() => getSavedFilters(statusFilterPreset), [statusFilterPreset]);

  const [searchQuery, setSearchQuery] = useState(() => savedFilters.searchQuery || '');
  const [selectedVendorFilter, setSelectedVendorFilter] = useState(() => savedFilters.selectedVendorFilter || '');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'PARTIALLY_PAID' | 'PAID'>(
    () => savedFilters.statusFilter || (statusFilterPreset === 'ALL' ? 'ALL' : statusFilterPreset)
  );
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>(
    () => savedFilters.sortBy || 'date-desc'
  );

  // Date Range Filter State
  const [startDate, setStartDate] = useState(() => savedFilters.startDate || '');
  const [endDate, setEndDate] = useState(() => savedFilters.endDate || '');
  const [activeDateQuick, setActiveDateQuick] = useState<
    'all' | 'this-month' | 'last-month' | 'this-quarter' | 'this-year' | 'custom'
  >(() => savedFilters.activeDateQuick || 'all');

  const handleSelectQuickDate = (preset: 'all' | 'this-month' | 'last-month' | 'this-quarter' | 'this-year') => {
    setActiveDateQuick(preset);
    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
      return;
    }
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const pad = (n: number) => String(n).padStart(2, '0');

    if (preset === 'this-month') {
      const start = `${y}-${pad(m + 1)}-01`;
      const lastDay = new Date(y, m + 1, 0).getDate();
      const end = `${y}-${pad(m + 1)}-${pad(lastDay)}`;
      setStartDate(start);
      setEndDate(end);
    } else if (preset === 'last-month') {
      const prevM = m === 0 ? 11 : m - 1;
      const prevY = m === 0 ? y - 1 : y;
      const start = `${prevY}-${pad(prevM + 1)}-01`;
      const lastDay = new Date(prevY, prevM + 1, 0).getDate();
      const end = `${prevY}-${pad(prevM + 1)}-${pad(lastDay)}`;
      setStartDate(start);
      setEndDate(end);
    } else if (preset === 'this-quarter') {
      const q = Math.floor(m / 3);
      const start = `${y}-${pad(q * 3 + 1)}-01`;
      const lastDay = new Date(y, (q + 1) * 3, 0).getDate();
      const end = `${y}-${pad((q + 1) * 3)}-${pad(lastDay)}`;
      setStartDate(start);
      setEndDate(end);
    } else if (preset === 'this-year') {
      setStartDate(`${y}-01-01`);
      setEndDate(`${y}-12-31`);
    }
  };

  const handleClearDateRange = () => {
    setActiveDateQuick('all');
    setStartDate('');
    setEndDate('');
  };

  // Helper date parser
  const parseDateToYMD = (dateStr?: string): string => {
    if (!dateStr) return '';
    const trimmed = dateStr.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    if (trimmed.includes('T')) {
      return trimmed.split('T')[0];
    }
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return '';
  };

  // Attachment interactive modal & popover state
  const [attachmentModalInvoice, setAttachmentModalInvoice] = useState<Invoice | null>(null);
  const [activeAttachmentDropdownId, setActiveAttachmentDropdownId] = useState<string | null>(null);

  // Close attachment dropdown when clicking outside
  useEffect(() => {
    const handleGlobalClick = () => setActiveAttachmentDropdownId(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // Mark paid modal state
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
  const [paymentDateInput, setPaymentDateInput] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);

  const filteredInvoices = useMemo(() => {
    return (invoices || []).filter((inv) => {
      // Preset status filter
      if (statusFilterPreset !== 'ALL') {
        if (statusFilterPreset === 'OPEN') {
          // In "open invoices" tab, include OPEN and PARTIALLY_PAID
          if (inv.status !== 'OPEN' && inv.status !== 'PARTIALLY_PAID') return false;
        } else if (inv.status !== statusFilterPreset) {
          return false;
        }
      }
      if (statusFilterPreset === 'ALL' && statusFilter !== 'ALL' && inv.status !== statusFilter) {
        return false;
      }

      // Vendor filter
      if (selectedVendorFilter && inv.vendorId !== selectedVendorFilter) {
        return false;
      }

      // Date Range Filter
      if (startDate || endDate) {
        const invYMD = parseDateToYMD(inv.invoiceDate) || parseDateToYMD(inv.createdAt);
        if (invYMD) {
          if (startDate && invYMD < startDate) return false;
          if (endDate && invYMD > endDate) return false;
        }
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
  }, [invoices, statusFilterPreset, statusFilter, selectedVendorFilter, searchQuery, sortBy, startDate, endDate]);

  const handleConfirmPayment = () => {
    if (payingInvoice) {
      onMarkAsPaid(payingInvoice.id, paymentDateInput);
      setPayingInvoice(null);
    }
  };

  // Pagination State - defaults to 10 listings per page as requested, restoring saved page if available
  const [currentPage, setCurrentPage] = useState<number>(() => {
    return typeof savedFilters.currentPage === 'number' && savedFilters.currentPage > 0
      ? savedFilters.currentPage
      : 1;
  });
  const [pageSize, setPageSize] = useState<number>(() => {
    return typeof savedFilters.pageSize === 'number' && savedFilters.pageSize > 0
      ? savedFilters.pageSize
      : 10;
  });

  // Track initial mount so we don't reset currentPage on first load when returning
  const isFirstMountRef = useRef(true);

  // Reset pagination to page 1 ONLY when any filter or search is modified after mount
  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      return;
    }
    setCurrentPage(1);
  }, [searchQuery, selectedVendorFilter, statusFilter, statusFilterPreset, sortBy, startDate, endDate]);

  // Persist all filters and pagination to sessionStorage whenever they change
  useEffect(() => {
    try {
      sessionStorage.setItem(
        `invoice_filters_${statusFilterPreset}`,
        JSON.stringify({
          searchQuery,
          selectedVendorFilter,
          statusFilter,
          sortBy,
          startDate,
          endDate,
          activeDateQuick,
          currentPage,
          pageSize,
        })
      );
    } catch (e) {
      // ignore
    }
  }, [
    statusFilterPreset,
    searchQuery,
    selectedVendorFilter,
    statusFilter,
    sortBy,
    startDate,
    endDate,
    activeDateQuick,
    currentPage,
    pageSize,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / pageSize));

  // Ensure current page does not exceed total pages when dataset shrinks
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedInvoices = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredInvoices.slice(startIndex, startIndex + pageSize);
  }, [filteredInvoices, currentPage, pageSize]);

  const startRecord = filteredInvoices.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(filteredInvoices.length, currentPage * pageSize);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
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
                <option value="PARTIALLY_PAID">Partially Paid</option>
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

        {/* Date Range Filter Row */}
        <div className="pt-2.5 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1 mr-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>Date Range:</span>
            </span>
            {(
              [
                { id: 'all', label: 'All Time' },
                { id: 'this-month', label: 'This Month' },
                { id: 'last-month', label: 'Last Month' },
                { id: 'this-quarter', label: 'This Quarter' },
                { id: 'this-year', label: 'This Year' }
              ] as const
            ).map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectQuickDate(preset.id)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition cursor-pointer ${
                  activeDateQuick === preset.id
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg text-xs">
              <label htmlFor="inv-start-date" className="text-[11px] font-medium text-slate-400">
                From:
              </label>
              <input
                id="inv-start-date"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setActiveDateQuick('custom');
                }}
                className="bg-transparent text-slate-800 text-xs font-mono focus:outline-none cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg text-xs">
              <label htmlFor="inv-end-date" className="text-[11px] font-medium text-slate-400">
                To:
              </label>
              <input
                id="inv-end-date"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setActiveDateQuick('custom');
                }}
                className="bg-transparent text-slate-800 text-xs font-mono focus:outline-none cursor-pointer"
              />
            </div>

            {(startDate || endDate) && (
              <button
                type="button"
                onClick={handleClearDateRange}
                className="px-2 py-1 text-[11px] font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-md transition cursor-pointer"
              >
                Reset Date
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span>
              Showing <strong className="text-slate-800">{filteredInvoices.length > 0 ? `${startRecord}–${endRecord}` : 0}</strong> of{' '}
              <strong className="text-slate-800">{filteredInvoices.length}</strong> invoice(s)
              {filteredInvoices.length !== invoices.length && (
                <span className="text-slate-400 ml-1">({invoices.length} total in system)</span>
              )}
            </span>
            {(startDate || endDate) && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                <Calendar className="w-3 h-3" />
                {startDate || 'Earliest'} to {endDate || 'Latest'}
              </span>
            )}
          </div>
          {(searchQuery || selectedVendorFilter || (statusFilterPreset === 'ALL' && statusFilter !== 'ALL') || startDate || endDate) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedVendorFilter('');
                setStatusFilter(statusFilterPreset === 'ALL' ? 'ALL' : (statusFilterPreset as any));
                setSortBy('date-desc');
                handleClearDateRange();
                setCurrentPage(1);
                try {
                  sessionStorage.removeItem(`invoice_filters_${statusFilterPreset}`);
                } catch (e) {
                  // ignore
                }
              }}
              className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
            >
              Clear all filters
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
          <div className="table-scroll-container overflow-x-auto max-h-[calc(100vh-270px)] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[780px]">
              <thead className="sticky top-0 z-20 bg-slate-50 border-b border-slate-200 shadow-2xs">
                <tr className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 whitespace-nowrap">Invoice #</th>
                  <th className="py-3 px-4 whitespace-nowrap min-w-[180px]">Vendor Name</th>
                  <th className="py-3 px-4 whitespace-nowrap">Invoice Date</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Tax (HST/GST)</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Total Amount</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">Status</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">Payment Date</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedInvoices.map((inv) => (
                  <tr key={inv.id} className="group hover:bg-slate-50/80 transition">
                    {/* Invoice Number */}
                    <td className="py-3.5 px-4 font-bold font-mono text-slate-900">
                      <div className="flex items-center gap-2">
                        <button
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
                    <td className="py-3.5 px-4 text-slate-600 font-medium whitespace-nowrap">
                      {formatDateToDisplay(inv.invoiceDate)}
                    </td>

                    {/* Tax Amount */}
                    <td className="py-3.5 px-4 text-right font-mono text-slate-600 whitespace-nowrap">
                      {formatCurrency(inv.taxAmount)}
                    </td>

                    {/* Total Amount & Balance */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-950 whitespace-nowrap">
                      <div>{formatCurrency(inv.grandTotal)}</div>
                      {inv.status === 'PARTIALLY_PAID' && (
                        <div className="text-[10px] text-amber-600 font-normal">
                          Bal: {formatCurrency(inv.balanceDue || 0)}
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {inv.status === 'PAID' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          PAID
                        </span>
                      ) : inv.status === 'PARTIALLY_PAID' ? (
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200"
                          title={`Paid: ${formatCurrency(inv.amountPaid || 0)} / Balance: ${formatCurrency(inv.balanceDue || 0)}`}
                        >
                          <CreditCard className="w-3 h-3 text-blue-600" />
                          <span>PARTIAL</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          <Clock className="w-3 h-3" />
                          OPEN / UNPAID
                        </span>
                      )}
                    </td>

                    {/* Payment Date */}
                    <td className="py-3.5 px-4 text-center text-slate-600 text-[11px] whitespace-nowrap">
                      {inv.status === 'PAID' && inv.paymentDate ? (
                        <span className="font-semibold text-emerald-800">
                          {formatDateToDisplay(inv.paymentDate)}
                        </span>
                      ) : inv.status === 'PARTIALLY_PAID' && inv.payments && inv.payments.length > 0 ? (
                        <span className="font-medium text-blue-700">
                          {formatDateToDisplay(inv.payments[inv.payments.length - 1].date)}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        {inv.status !== 'PAID' ? (
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

        {/* Pagination Controls Footer */}
        {filteredInvoices.length > 0 && (
          <div className="px-4 py-3 bg-white border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 text-slate-600">
              <span>
                Showing <strong className="font-bold text-slate-900">{startRecord}</strong> to{' '}
                <strong className="font-bold text-slate-900">{endRecord}</strong> of{' '}
                <strong className="font-bold text-slate-900">{filteredInvoices.length}</strong> listings
              </span>
              <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200">
                <span className="text-slate-500 text-[11px]">Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-0.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={30}>30</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1 self-center sm:self-auto">
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  title="First page"
                  className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  title="Previous page"
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>

                <div className="flex items-center gap-1 mx-1">
                  {getPageNumbers().map((p, idx) =>
                    p === '...' ? (
                      <span key={`ellipsis-${idx}`} className="px-1 text-slate-400 select-none">
                        ...
                      </span>
                    ) : (
                      <button
                        key={`page-${p}`}
                        type="button"
                        onClick={() => setCurrentPage(p as number)}
                        className={`min-w-[28px] h-7 px-2 text-xs font-bold rounded-md transition cursor-pointer ${
                          currentPage === p
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-700 hover:bg-slate-100 border border-transparent'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  title="Next page"
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  title="Last page"
                  className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            )}
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
