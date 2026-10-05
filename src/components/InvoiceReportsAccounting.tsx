import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Filter,
  RefreshCw,
  Search,
  DollarSign,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Users,
  Percent,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Building2,
  CreditCard,
  Eye,
  Check,
  Tag,
  Scale
} from 'lucide-react';
import { Invoice, Vendor } from '../types';
import { formatCurrency, formatDateToDisplay } from '../utils/formatters';

interface InvoiceReportsAccountingProps {
  invoices: Invoice[];
  vendors: Vendor[];
  onViewInvoice: (invoice: Invoice) => void;
  onShowToast: (message: string, type?: 'success' | 'info') => void;
}

type DateFieldType = 'invoiceDate' | 'paymentDate' | 'dueDate';
type QuickFilterType =
  | 'this-month'
  | 'last-month'
  | 'this-quarter'
  | 'last-quarter'
  | 'this-year'
  | 'last-year'
  | 'all-time'
  | 'custom';

// Normalize any date string (ISO, "YYYY-MM-DD", "August 19, 2026") into "YYYY-MM-DD"
function parseDateToYMD(dateStr?: string): string {
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
}

// Format "YYYY-MM-DD" into "01 Sep 2026" or "01 September 2026"
function formatDisplayDate(ymd: string, format: 'short' | 'long' = 'long'): string {
  if (!ymd) return '';
  const parts = ymd.split('-');
  if (parts.length !== 3) return ymd;
  const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  if (isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString('en-US', {
    day: '2-digit',
    month: format === 'short' ? 'short' : 'long',
    year: 'numeric'
  });
}

// Calculate due date timestamp or fallback to invoiceDate + 7 days
function getDueDateYMD(invoice: Invoice): string {
  if (invoice.dueDate) {
    const parsed = parseDateToYMD(invoice.dueDate);
    if (parsed) return parsed;
    // Handle "Net X days"
    const match = invoice.dueDate.match(/\d+/);
    const days = match ? parseInt(match[0], 10) : 7;
    const invDateYMD = parseDateToYMD(invoice.invoiceDate);
    if (invDateYMD) {
      const d = new Date(invDateYMD);
      d.setDate(d.getDate() + days);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
  }
  return parseDateToYMD(invoice.invoiceDate);
}

// Check if an invoice is overdue relative to today
function isInvoiceOverdue(invoice: Invoice, todayYMD: string): boolean {
  if (invoice.status === 'PAID') return false;
  const dueYMD = getDueDateYMD(invoice);
  if (!dueYMD) return false;
  return dueYMD < todayYMD;
}

export const InvoiceReportsAccounting: React.FC<InvoiceReportsAccountingProps> = ({
  invoices,
  vendors,
  onViewInvoice,
  onShowToast
}) => {
  // Today's date reference
  const today = useMemo(() => new Date(), []);
  const todayYMD = useMemo(() => {
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [today]);

  // Compute standard date boundaries based on 2026 / current date
  const dateRanges = useMemo(() => {
    const curYear = today.getFullYear();
    const curMonth = today.getMonth(); // 0-indexed

    // This month
    const startThisMonth = new Date(curYear, curMonth, 1);
    const endThisMonth = new Date(curYear, curMonth + 1, 0);

    // Last month
    const startLastMonth = new Date(curYear, curMonth - 1, 1);
    const endLastMonth = new Date(curYear, curMonth, 0);

    // This quarter
    const curQuarter = Math.floor(curMonth / 3);
    const startThisQuarter = new Date(curYear, curQuarter * 3, 1);
    const endThisQuarter = new Date(curYear, (curQuarter + 1) * 3, 0);

    // Last quarter
    const prevQuarterYear = curQuarter === 0 ? curYear - 1 : curYear;
    const prevQuarterMonth = curQuarter === 0 ? 9 : (curQuarter - 1) * 3;
    const startLastQuarter = new Date(prevQuarterYear, prevQuarterMonth, 1);
    const endLastQuarter = new Date(prevQuarterYear, prevQuarterMonth + 3, 0);

    // This year
    const startThisYear = new Date(curYear, 0, 1);
    const endThisYear = new Date(curYear, 11, 31);

    // Last year
    const startLastYear = new Date(curYear - 1, 0, 1);
    const endLastYear = new Date(curYear - 1, 11, 31);

    const toYMD = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    return {
      'this-month': { start: toYMD(startThisMonth), end: toYMD(endThisMonth), label: 'This Month' },
      'last-month': { start: toYMD(startLastMonth), end: toYMD(endLastMonth), label: 'Last Month' },
      'this-quarter': { start: toYMD(startThisQuarter), end: toYMD(endThisQuarter), label: 'This Quarter' },
      'last-quarter': { start: toYMD(startLastQuarter), end: toYMD(endLastQuarter), label: 'Last Quarter' },
      'this-year': { start: toYMD(startThisYear), end: toYMD(endThisYear), label: 'This Year' },
      'last-year': { start: toYMD(startLastYear), end: toYMD(endLastYear), label: 'Last Year' },
      'all-time': { start: '', end: '', label: 'All Invoices' }
    };
  }, [today]);

  // Filter States: Default to "all-time" or "this-year" so all records show immediately,
  // while offering 1-click filters for Month/Quarter/Year
  const [activeQuickFilter, setActiveQuickFilter] = useState<QuickFilterType>('all-time');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [appliedStartDate, setAppliedStartDate] = useState<string>('');
  const [appliedEndDate, setAppliedEndDate] = useState<string>('');
  const [dateField, setDateField] = useState<DateFieldType>('invoiceDate');

  // Table & Section Specific Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'PARTIALLY_PAID' | 'OPEN' | 'OVERDUE'>('ALL');
  const [vendorFilter, setVendorFilter] = useState<string>('ALL');
  const [vendorSearch, setVendorSearch] = useState('');

  // Table Sorting & Pagination
  const [sortField, setSortField] = useState<'invoiceNumber' | 'invoiceDate' | 'vendor' | 'grandTotal' | 'status'>('invoiceDate');
  const [sortAsc, setSortAsc] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Apply quick date range selection
  const handleSelectQuickFilter = (q: QuickFilterType) => {
    setActiveQuickFilter(q);
    if (q === 'custom') return;
    const range = dateRanges[q];
    if (range) {
      setStartDate(range.start);
      setEndDate(range.end);
      setAppliedStartDate(range.start);
      setAppliedEndDate(range.end);
      setCurrentPage(1);
    }
  };

  const handleApplyFilter = () => {
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
    setActiveQuickFilter('custom');
    setCurrentPage(1);
    onShowToast(`Filter applied: ${startDate || 'Earliest'} to ${endDate || 'Latest'}`);
  };

  const handleResetFilter = () => {
    setActiveQuickFilter('all-time');
    setStartDate('');
    setEndDate('');
    setAppliedStartDate('');
    setAppliedEndDate('');
    setDateField('invoiceDate');
    setSearchQuery('');
    setStatusFilter('ALL');
    setVendorFilter('ALL');
    setVendorSearch('');
    setCurrentPage(1);
    onShowToast('Date filters reset to show all invoices.');
  };

  // Determine if an invoice matches the date range filter
  const dateFilteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      let targetDateStr = '';
      if (dateField === 'invoiceDate') {
        targetDateStr = parseDateToYMD(inv.invoiceDate);
      } else if (dateField === 'paymentDate') {
        // If payment date filter is selected, check paymentDate or payments array
        targetDateStr = parseDateToYMD(inv.paymentDate);
        if (!targetDateStr && inv.payments && inv.payments.length > 0) {
          targetDateStr = parseDateToYMD(inv.payments[inv.payments.length - 1].date);
        }
        // If invoice is unpaid, it doesn't match a payment date range
        if (!targetDateStr) return false;
      } else if (dateField === 'dueDate') {
        targetDateStr = getDueDateYMD(inv);
      }

      if (!targetDateStr) return false;

      if (appliedStartDate && targetDateStr < appliedStartDate) return false;
      if (appliedEndDate && targetDateStr > appliedEndDate) return false;

      return true;
    });
  }, [invoices, appliedStartDate, appliedEndDate, dateField]);

  // Overall Accounting Summary Calculations (Based strictly on dateFilteredInvoices)
  const accountingSummary = useMemo(() => {
    let totalInvoiced = 0;
    let totalPaid = 0;
    let totalPending = 0;
    let totalOverdue = 0;
    let overdueCount = 0;
    let totalTax = 0;
    const totalDiscounts = 0; // Default zero unless specified in items

    const uniqueVendors = new Set<string>();

    dateFilteredInvoices.forEach((inv) => {
      totalInvoiced += Number(inv.grandTotal) || 0;
      totalTax += Number(inv.taxAmount) || 0;

      // Calculate paid amount
      let paid = 0;
      if (inv.status === 'PAID') {
        paid = Number(inv.amountPaid) || Number(inv.grandTotal) || 0;
      } else if (inv.amountPaid && inv.amountPaid > 0) {
        paid = Number(inv.amountPaid);
      } else if (inv.payments && inv.payments.length > 0) {
        paid = inv.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
      }

      const pending = Math.max(0, (Number(inv.grandTotal) || 0) - paid);

      totalPaid += paid;
      totalPending += pending;

      if (isInvoiceOverdue(inv, todayYMD)) {
        totalOverdue += pending;
        overdueCount += 1;
      }

      if (inv.vendor?.companyName) {
        uniqueVendors.add(inv.vendor.companyName);
      } else if (inv.vendorId) {
        uniqueVendors.add(inv.vendorId);
      }
    });

    return {
      totalInvoices: dateFilteredInvoices.length,
      totalInvoiced,
      totalPaid,
      totalPending,
      totalOverdue,
      overdueCount,
      totalTax,
      totalDiscounts,
      totalOutstanding: totalPending,
      totalVendors: uniqueVendors.size
    };
  }, [dateFilteredInvoices, todayYMD]);

  // Status Breakdown
  const statusSummary = useMemo(() => {
    let paidCount = 0;
    let paidAmount = 0;
    let partiallyPaidCount = 0;
    let partiallyPaidAmount = 0;
    let openPendingCount = 0;
    let openPendingAmount = 0;
    let overdueCount = 0;
    let overdueAmount = 0;

    dateFilteredInvoices.forEach((inv) => {
      const total = Number(inv.grandTotal) || 0;
      let paid = 0;
      if (inv.status === 'PAID') {
        paid = Number(inv.amountPaid) || total;
      } else if (inv.amountPaid) {
        paid = Number(inv.amountPaid);
      } else if (inv.payments && inv.payments.length > 0) {
        paid = inv.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
      }
      const pending = Math.max(0, total - paid);

      if (inv.status === 'PAID') {
        paidCount++;
        paidAmount += total;
      } else if (isInvoiceOverdue(inv, todayYMD)) {
        overdueCount++;
        overdueAmount += pending;
      } else if (inv.status === 'PARTIALLY_PAID') {
        partiallyPaidCount++;
        partiallyPaidAmount += pending;
      } else {
        openPendingCount++;
        openPendingAmount += pending;
      }
    });

    const totalCount = dateFilteredInvoices.length || 1;

    return {
      paid: { count: paidCount, amount: paidAmount, pct: Math.round((paidCount / totalCount) * 100) },
      partiallyPaid: { count: partiallyPaidCount, amount: partiallyPaidAmount, pct: Math.round((partiallyPaidCount / totalCount) * 100) },
      pending: { count: openPendingCount, amount: openPendingAmount, pct: Math.round((openPendingCount / totalCount) * 100) },
      overdue: { count: overdueCount, amount: overdueAmount, pct: Math.round((overdueCount / totalCount) * 100) }
    };
  }, [dateFilteredInvoices, todayYMD]);

  // Dedicated Dynamic Tax Breakdown (Aggregated from all invoices in period)
  const taxSummary = useMemo(() => {
    let totalTaxableAmount = 0;
    let totalTaxAmount = 0;
    let totalTaxCollectedRealized = 0;

    // Map: taxLabel -> { label, rate, taxableBase, taxAmount, invoiceCount }
    const taxBuckets: Record<string, { label: string; rate: number; taxableBase: number; taxAmount: number; invoiceCount: number }> = {};

    dateFilteredInvoices.forEach((inv) => {
      const subtotal = Number(inv.subtotal) || 0;
      const tax = Number(inv.taxAmount) || 0;
      totalTaxableAmount += subtotal;
      totalTaxAmount += tax;

      if (inv.status === 'PAID') {
        totalTaxCollectedRealized += tax;
      } else if (inv.amountPaid && inv.grandTotal > 0) {
        const paidRatio = Math.min(1, inv.amountPaid / inv.grandTotal);
        totalTaxCollectedRealized += tax * paidRatio;
      }

      if (inv.taxType === 'QUEBEC') {
        // Dual Tax (GST 5% + QST 9.975%)
        const gstVal = inv.gstAmount ?? subtotal * 0.05;
        const qstVal = inv.qstAmount ?? subtotal * 0.09975;

        // GST Bucket
        const gstKey = 'GST 5.0%';
        if (!taxBuckets[gstKey]) {
          taxBuckets[gstKey] = { label: 'GST (Federal)', rate: 5.0, taxableBase: 0, taxAmount: 0, invoiceCount: 0 };
        }
        taxBuckets[gstKey].taxableBase += subtotal;
        taxBuckets[gstKey].taxAmount += gstVal;
        taxBuckets[gstKey].invoiceCount += 1;

        // QST Bucket
        const qstKey = 'QST 9.975%';
        if (!taxBuckets[qstKey]) {
          taxBuckets[qstKey] = { label: 'QST (Revenu Québec)', rate: 9.975, taxableBase: 0, taxAmount: 0, invoiceCount: 0 };
        }
        taxBuckets[qstKey].taxableBase += subtotal;
        taxBuckets[qstKey].taxAmount += qstVal;
        taxBuckets[qstKey].invoiceCount += 1;
      } else if (inv.taxType === 'HST') {
        const rate = inv.taxRate || 13.0;
        const key = `HST ${rate}%`;
        if (!taxBuckets[key]) {
          taxBuckets[key] = { label: `HST (Harmonized Sales Tax)`, rate, taxableBase: 0, taxAmount: 0, invoiceCount: 0 };
        }
        taxBuckets[key].taxableBase += subtotal;
        taxBuckets[key].taxAmount += tax;
        taxBuckets[key].invoiceCount += 1;
      } else {
        const rate = inv.taxRate || 0;
        const key = `CUSTOM ${rate}%`;
        if (!taxBuckets[key]) {
          taxBuckets[key] = { label: `Custom Tax`, rate, taxableBase: 0, taxAmount: 0, invoiceCount: 0 };
        }
        taxBuckets[key].taxableBase += subtotal;
        taxBuckets[key].taxAmount += tax;
        taxBuckets[key].invoiceCount += 1;
      }
    });

    return {
      totalTaxableAmount,
      totalTaxAmount,
      totalTaxCollectedRealized,
      totalTaxPending: Math.max(0, totalTaxAmount - totalTaxCollectedRealized),
      taxBuckets: Object.values(taxBuckets)
    };
  }, [dateFilteredInvoices]);

  // Customer / Vendor Summary
  const vendorSummary = useMemo(() => {
    // vendorKey -> stats
    const map: Record<
      string,
      {
        name: string;
        invoiceCount: number;
        totalInvoiced: number;
        totalPaid: number;
        totalPending: number;
        totalTax: number;
        outstandingBalance: number;
      }
    > = {};

    dateFilteredInvoices.forEach((inv) => {
      const name = inv.vendor?.companyName || 'Unspecified Vendor / Customer';
      if (!map[name]) {
        map[name] = {
          name,
          invoiceCount: 0,
          totalInvoiced: 0,
          totalPaid: 0,
          totalPending: 0,
          totalTax: 0,
          outstandingBalance: 0
        };
      }

      const total = Number(inv.grandTotal) || 0;
      const tax = Number(inv.taxAmount) || 0;

      let paid = 0;
      if (inv.status === 'PAID') {
        paid = Number(inv.amountPaid) || total;
      } else if (inv.amountPaid) {
        paid = Number(inv.amountPaid);
      } else if (inv.payments && inv.payments.length > 0) {
        paid = inv.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
      }

      const pending = Math.max(0, total - paid);

      map[name].invoiceCount += 1;
      map[name].totalInvoiced += total;
      map[name].totalPaid += paid;
      map[name].totalPending += pending;
      map[name].totalTax += tax;
      map[name].outstandingBalance += pending;
    });

    let list = Object.values(map);
    if (vendorSearch.trim()) {
      const q = vendorSearch.toLowerCase().trim();
      list = list.filter((v) => v.name.toLowerCase().includes(q));
    }

    return list.sort((a, b) => b.totalInvoiced - a.totalInvoiced);
  }, [dateFilteredInvoices, vendorSearch]);

  // Unique vendor names for dropdown filter
  const availableVendors = useMemo(() => {
    const set = new Set<string>();
    dateFilteredInvoices.forEach((inv) => {
      if (inv.vendor?.companyName) set.add(inv.vendor.companyName);
    });
    return Array.from(set).sort();
  }, [dateFilteredInvoices]);

  // Detailed Invoices for Table (Date Filtered + Search + Secondary Filters + Sorting)
  const processedInvoices = useMemo(() => {
    let result = [...dateFilteredInvoices];

    // Status filter
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'OVERDUE') {
        result = result.filter((inv) => isInvoiceOverdue(inv, todayYMD));
      } else {
        result = result.filter((inv) => inv.status === statusFilter);
      }
    }

    // Vendor filter
    if (vendorFilter !== 'ALL') {
      result = result.filter((inv) => inv.vendor?.companyName === vendorFilter);
    }

    // Text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((inv) => {
        const num = (inv.invoiceNumber || '').toLowerCase();
        const vName = (inv.vendor?.companyName || '').toLowerCase();
        const email = (inv.vendor?.email || '').toLowerCase();
        const notes = (inv.notes || '').toLowerCase();
        const items = inv.items?.some(
          (item) => item.title.toLowerCase().includes(q) || (item.subDetails || '').toLowerCase().includes(q)
        );
        return num.includes(q) || vName.includes(q) || email.includes(q) || notes.includes(q) || items;
      });
    }

    // Sorting
    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'invoiceNumber') {
        cmp = a.invoiceNumber.localeCompare(b.invoiceNumber);
      } else if (sortField === 'invoiceDate') {
        cmp = parseDateToYMD(a.invoiceDate).localeCompare(parseDateToYMD(b.invoiceDate));
      } else if (sortField === 'vendor') {
        cmp = (a.vendor?.companyName || '').localeCompare(b.vendor?.companyName || '');
      } else if (sortField === 'grandTotal') {
        cmp = (a.grandTotal || 0) - (b.grandTotal || 0);
      } else if (sortField === 'status') {
        cmp = a.status.localeCompare(b.status);
      }
      return sortAsc ? cmp : -cmp;
    });

    return result;
  }, [dateFilteredInvoices, statusFilter, vendorFilter, searchQuery, sortField, sortAsc, todayYMD]);

  // Paginated records
  const paginatedInvoices = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return processedInvoices.slice(startIndex, startIndex + pageSize);
  }, [processedInvoices, currentPage, pageSize]);

  const totalPages = Math.ceil(processedInvoices.length / pageSize) || 1;

  // Header display string for reporting period
  const reportingPeriodDisplay = useMemo(() => {
    if (!appliedStartDate && !appliedEndDate) {
      return 'All Historic Invoices (Complete Database)';
    }
    const startStr = appliedStartDate ? formatDisplayDate(appliedStartDate) : 'Earliest';
    const endStr = appliedEndDate ? formatDisplayDate(appliedEndDate) : 'Latest';
    return `${startStr} – ${endStr}`;
  }, [appliedStartDate, appliedEndDate]);

  // CSV Generator Helper: RFC 4180 Escaping
  const escapeCSV = (val: any): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // 1. Export Detailed Invoices CSV
  const handleExportDetailedCSV = () => {
    if (dateFilteredInvoices.length === 0) {
      onShowToast('No invoice records found in the selected date range to export.', 'info');
      return;
    }

    const headers = [
      'Invoice Number',
      'Invoice Date',
      'Due Date',
      'Customer/Vendor Name',
      'Company Name',
      'Email',
      'Phone',
      'Billing Address',
      'Tax Number / NEQ',
      'Subtotal ($)',
      'Discount ($)',
      'Taxable Amount ($)',
      'Tax Type',
      'Tax Rate (%)',
      'Tax Amount ($)',
      'GST Amount ($)',
      'QST Amount ($)',
      'Total Invoice Amount ($)',
      'Amount Paid ($)',
      'Amount Pending ($)',
      'Balance Due ($)',
      'Payment Status',
      'Payment Method',
      'Payment Date',
      'Transaction Reference',
      'Currency',
      'Notes'
    ];

    const rows = dateFilteredInvoices.map((inv) => {
      const subtotal = Number(inv.subtotal) || 0;
      const total = Number(inv.grandTotal) || 0;
      let paid = 0;
      if (inv.status === 'PAID') {
        paid = Number(inv.amountPaid) || total;
      } else if (inv.amountPaid) {
        paid = Number(inv.amountPaid);
      } else if (inv.payments && inv.payments.length > 0) {
        paid = inv.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
      }
      const pending = Math.max(0, total - paid);

      const latestPayment = inv.payments && inv.payments.length > 0 ? inv.payments[inv.payments.length - 1] : null;
      const paymentMethod = latestPayment?.method || (inv.status === 'PAID' ? 'Direct / Bank' : 'N/A');
      const paymentDate = inv.paymentDate || latestPayment?.date || '';
      const txRef = latestPayment?.reference || '';

      const isOverdue = isInvoiceOverdue(inv, todayYMD);
      const computedStatus = isOverdue ? 'Overdue' : inv.status === 'PAID' ? 'Paid' : inv.status === 'PARTIALLY_PAID' ? 'Partially Paid' : 'Pending';

      return [
        escapeCSV(inv.invoiceNumber),
        escapeCSV(parseDateToYMD(inv.invoiceDate)),
        escapeCSV(getDueDateYMD(inv)),
        escapeCSV(inv.vendor?.companyName || ''),
        escapeCSV(inv.vendor?.companyName || ''),
        escapeCSV(inv.vendor?.email || ''),
        escapeCSV(inv.vendor?.phone || ''),
        escapeCSV(inv.vendor?.address || ''),
        escapeCSV(''), // Tax number if stored
        subtotal.toFixed(2),
        '0.00',
        subtotal.toFixed(2),
        escapeCSV(inv.taxType),
        inv.taxRate ? inv.taxRate.toFixed(3) : '0.000',
        (Number(inv.taxAmount) || 0).toFixed(2),
        (Number(inv.gstAmount) || 0).toFixed(2),
        (Number(inv.qstAmount) || 0).toFixed(2),
        total.toFixed(2),
        paid.toFixed(2),
        pending.toFixed(2),
        pending.toFixed(2),
        computedStatus,
        escapeCSV(paymentMethod),
        escapeCSV(paymentDate),
        escapeCSV(txRef),
        'CAD',
        escapeCSV(inv.notes || '')
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const startFileStr = appliedStartDate || 'All_Start';
    const endFileStr = appliedEndDate || 'All_End';
    const filename = `Invoice_Report_${startFileStr}_to_${endFileStr}.csv`;

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    const toastPeriodStr = appliedStartDate && appliedEndDate
      ? `${formatDisplayDate(appliedStartDate, 'short')} – ${formatDisplayDate(appliedEndDate, 'short')}`
      : 'all records';
    onShowToast(`Invoice report exported successfully for ${toastPeriodStr}.`, 'success');
  };

  // 2. Export Summary Accounting CSV
  const handleExportSummaryCSV = () => {
    const startStr = appliedStartDate || 'Start';
    const endStr = appliedEndDate || 'End';

    const lines: string[] = [];
    lines.push('INVOICE ACCOUNTING & FINANCIAL SUMMARY REPORT');
    lines.push(`Reporting Period,${escapeCSV(reportingPeriodDisplay)}`);
    lines.push(`Filter Date Basis,${escapeCSV(dateField.toUpperCase())}`);
    lines.push(`Report Generated At,${new Date().toISOString()}`);
    lines.push(`Total Invoice Records,${accountingSummary.totalInvoices}`);
    lines.push('');
    lines.push('--- FINANCIAL OVERVIEW ---');
    lines.push(`Total Invoiced Amount (CAD),${accountingSummary.totalInvoiced.toFixed(2)}`);
    lines.push(`Total Paid / Collected (CAD),${accountingSummary.totalPaid.toFixed(2)}`);
    lines.push(`Total Pending / Balance Due (CAD),${accountingSummary.totalPending.toFixed(2)}`);
    lines.push(`Total Overdue Balance (CAD),${accountingSummary.totalOverdue.toFixed(2)}`);
    lines.push(`Total Tax Charged (CAD),${accountingSummary.totalTax.toFixed(2)}`);
    lines.push(`Total Discounts Granted (CAD),${accountingSummary.totalDiscounts.toFixed(2)}`);
    lines.push(`Total Outstanding (CAD),${accountingSummary.totalOutstanding.toFixed(2)}`);
    lines.push(`Total Active Vendors/Customers,${accountingSummary.totalVendors}`);
    lines.push('');
    lines.push('--- INVOICE STATUS BREAKDOWN ---');
    lines.push('Status,Count,Total Amount ($)');
    lines.push(`Paid,${statusSummary.paid.count},${statusSummary.paid.amount.toFixed(2)}`);
    lines.push(`Partially Paid,${statusSummary.partiallyPaid.count},${statusSummary.partiallyPaid.amount.toFixed(2)}`);
    lines.push(`Pending / Open,${statusSummary.pending.count},${statusSummary.pending.amount.toFixed(2)}`);
    lines.push(`Overdue,${statusSummary.overdue.count},${statusSummary.overdue.amount.toFixed(2)}`);
    lines.push('');
    lines.push('--- TAX SUMMARY BREAKDOWN ---');
    lines.push('Tax Name / Authority,Rate (%),Taxable Base ($),Tax Amount ($),Invoices Subject');
    taxSummary.taxBuckets.forEach((b) => {
      lines.push(`${escapeCSV(b.label)},${b.rate.toFixed(3)},${b.taxableBase.toFixed(2)},${b.taxAmount.toFixed(2)},${b.invoiceCount}`);
    });
    lines.push(`TOTAL TAX, ,${taxSummary.totalTaxableAmount.toFixed(2)},${taxSummary.totalTaxAmount.toFixed(2)},${dateFilteredInvoices.length}`);
    lines.push(`Total Tax Realized (Paid), , ,${taxSummary.totalTaxCollectedRealized.toFixed(2)}, `);
    lines.push(`Total Tax Pending (Unpaid), , ,${taxSummary.totalTaxPending.toFixed(2)}, `);
    lines.push('');
    lines.push('--- CUSTOMER / VENDOR PERFORMANCE ---');
    lines.push('Customer / Vendor Name,Invoices Count,Total Invoiced ($),Total Paid ($),Total Pending ($),Total Tax ($)');
    vendorSummary.forEach((v) => {
      lines.push(`${escapeCSV(v.name)},${v.invoiceCount},${v.totalInvoiced.toFixed(2)},${v.totalPaid.toFixed(2)},${v.totalPending.toFixed(2)},${v.totalTax.toFixed(2)}`);
    });

    const csvContent = '\uFEFF' + lines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const filename = `Invoice_Summary_${startStr}_to_${endStr}.csv`;
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    onShowToast(`Accounting summary CSV exported for ${reportingPeriodDisplay}.`, 'success');
  };

  // 3. Export Both in Quick Succession
  const handleExportBoth = () => {
    handleExportDetailedCSV();
    setTimeout(() => {
      handleExportSummaryCSV();
    }, 400);
  };

  return (
    <section id="invoice-reports-accounting" className="space-y-6">
      {/* Section Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 sm:p-7 text-white shadow-xl border border-indigo-900/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="p-2 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                <FileSpreadsheet className="w-5 h-5" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                Accounting & Audit Module
              </span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              Invoice Reports & Accounting
            </h2>
            <p className="text-sm text-slate-300 max-w-2xl mt-1">
              Filter by custom date ranges, review dynamic HST/GST/QST tax reconciliations, inspect customer performance, and export accountant-ready CSV files.
            </p>
          </div>

          {/* Prominent Export Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              id="export-detailed-csv-btn"
              onClick={handleExportDetailedCSV}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-900/40 transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export Detailed CSV</span>
            </button>
            <button
              id="export-summary-csv-btn"
              onClick={handleExportSummaryCSV}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-semibold rounded-xl border border-indigo-400/30 transition cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Summary CSV</span>
            </button>
            <button
              onClick={handleExportBoth}
              title="Download both Detailed Records and Accounting Summary files"
              className="flex items-center gap-1.5 px-3 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-xl border border-white/20 transition cursor-pointer"
            >
              <span>Download Both</span>
            </button>
          </div>
        </div>

        {/* Date Filter Control Bar */}
        <div className="mt-6 pt-5 border-t border-slate-700/60 flex flex-col gap-4">
          {/* Quick Date Range Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1 mr-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              Quick Periods:
            </span>
            {(
              [
                { id: 'this-month', label: 'This Month' },
                { id: 'last-month', label: 'Last Month' },
                { id: 'this-quarter', label: 'This Quarter' },
                { id: 'last-quarter', label: 'Last Quarter' },
                { id: 'this-year', label: 'This Year' },
                { id: 'last-year', label: 'Last Year' },
                { id: 'all-time', label: 'All Invoices' }
              ] as const
            ).map((q) => {
              const active = activeQuickFilter === q.id;
              return (
                <button
                  key={q.id}
                  onClick={() => handleSelectQuickFilter(q.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    active
                      ? 'bg-indigo-500 text-white shadow-sm ring-1 ring-white/30'
                      : 'bg-white/5 hover:bg-white/15 text-slate-300 border border-white/10'
                  }`}
                >
                  {q.label}
                </button>
              );
            })}
          </div>

          {/* Custom Date Inputs + Date Field Selector + Apply / Reset */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Start Date */}
            <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <label htmlFor="report-start-date" className="text-xs font-medium text-slate-400">
                From:
              </label>
              <input
                id="report-start-date"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setActiveQuickFilter('custom');
                }}
                className="bg-transparent text-white text-xs font-mono focus:outline-none cursor-pointer"
              />
            </div>

            {/* End Date */}
            <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <label htmlFor="report-end-date" className="text-xs font-medium text-slate-400">
                To:
              </label>
              <input
                id="report-end-date"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setActiveQuickFilter('custom');
                }}
                className="bg-transparent text-white text-xs font-mono focus:outline-none cursor-pointer"
              />
            </div>

            {/* Date Basis (Invoice Date, Payment Date, Due Date) */}
            <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <label htmlFor="report-date-field" className="text-xs font-medium text-slate-400">
                Date Basis:
              </label>
              <select
                id="report-date-field"
                value={dateField}
                onChange={(e) => setDateField(e.target.value as DateFieldType)}
                className="bg-transparent text-indigo-300 text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value="invoiceDate" className="bg-slate-900 text-white">Invoice Date (Default)</option>
                <option value="paymentDate" className="bg-slate-900 text-white">Payment Date</option>
                <option value="dueDate" className="bg-slate-900 text-white">Due Date</option>
              </select>
            </div>

            {/* Apply & Reset Buttons */}
            <button
              onClick={handleApplyFilter}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-500 hover:bg-indigo-400 active:bg-indigo-600 text-white text-xs font-bold rounded-lg shadow transition cursor-pointer"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Apply Filter</span>
            </button>
            <button
              onClick={handleResetFilter}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 active:bg-white/30 text-slate-300 hover:text-white text-xs font-medium rounded-lg border border-white/10 transition cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset</span>
            </button>

            {/* Reporting Period Badge */}
            <div className="ml-auto flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-200 border border-indigo-400/30">
              <Calendar className="w-3.5 h-3.5 text-indigo-300" />
              <span>Period: {reportingPeriodDisplay}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Accounting Summary Cards (9 Cards) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Scale className="w-4 h-4 text-indigo-600" />
            <span>Accounting Summary ({reportingPeriodDisplay})</span>
          </h3>
          <span className="text-xs font-medium text-slate-500">
            {accountingSummary.totalInvoices} invoices in scope
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-9 gap-3">
          {/* 1. Total Invoices */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Invoices
            </p>
            <h4 className="text-xl font-bold text-slate-900 mt-1 font-mono">
              {accountingSummary.totalInvoices}
            </h4>
            <p className="text-[10px] text-slate-400 mt-0.5 truncate">Records matching</p>
          </div>

          {/* 2. Total Invoice Value */}
          <div className="bg-white p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/20 shadow-xs flex flex-col justify-between">
            <p className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider">
              Total Value
            </p>
            <h4 className="text-xl font-bold text-indigo-950 mt-1 font-mono">
              {formatCurrency(accountingSummary.totalInvoiced)}
            </h4>
            <p className="text-[10px] text-indigo-600 mt-0.5">Gross invoiced</p>
          </div>

          {/* 3. Total Paid */}
          <div className="bg-white p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs flex flex-col justify-between">
            <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
              Total Paid
            </p>
            <h4 className="text-xl font-bold text-emerald-950 mt-1 font-mono">
              {formatCurrency(accountingSummary.totalPaid)}
            </h4>
            <p className="text-[10px] text-emerald-600 mt-0.5">Funds collected</p>
          </div>

          {/* 4. Total Pending */}
          <div className="bg-white p-3.5 rounded-xl border border-amber-200 bg-amber-50/20 shadow-xs flex flex-col justify-between">
            <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">
              Total Pending
            </p>
            <h4 className="text-xl font-bold text-amber-950 mt-1 font-mono">
              {formatCurrency(accountingSummary.totalPending)}
            </h4>
            <p className="text-[10px] text-amber-600 mt-0.5">Awaiting settlement</p>
          </div>

          {/* 5. Total Overdue */}
          <div className="bg-white p-3.5 rounded-xl border border-rose-200 bg-rose-50/20 shadow-xs flex flex-col justify-between">
            <p className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider">
              Total Overdue
            </p>
            <h4 className="text-xl font-bold text-rose-950 mt-1 font-mono">
              {formatCurrency(accountingSummary.totalOverdue)}
            </h4>
            <p className="text-[10px] text-rose-600 mt-0.5">{accountingSummary.overdueCount} overdue</p>
          </div>

          {/* 6. Total Tax */}
          <div className="bg-white p-3.5 rounded-xl border border-purple-200 bg-purple-50/20 shadow-xs flex flex-col justify-between">
            <p className="text-[11px] font-semibold text-purple-700 uppercase tracking-wider">
              Total Tax
            </p>
            <h4 className="text-xl font-bold text-purple-950 mt-1 font-mono">
              {formatCurrency(accountingSummary.totalTax)}
            </h4>
            <p className="text-[10px] text-purple-600 mt-0.5">HST / GST / QST</p>
          </div>

          {/* 7. Total Discounts */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Discounts
            </p>
            <h4 className="text-xl font-bold text-slate-900 mt-1 font-mono">
              {formatCurrency(accountingSummary.totalDiscounts)}
            </h4>
            <p className="text-[10px] text-slate-400 mt-0.5">Deductions</p>
          </div>

          {/* 8. Total Outstanding */}
          <div className="bg-white p-3.5 rounded-xl border border-blue-200 bg-blue-50/20 shadow-xs flex flex-col justify-between">
            <p className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">
              Outstanding
            </p>
            <h4 className="text-xl font-bold text-blue-950 mt-1 font-mono">
              {formatCurrency(accountingSummary.totalOutstanding)}
            </h4>
            <p className="text-[10px] text-blue-600 mt-0.5">Net balance due</p>
          </div>

          {/* 9. Total Number of Customers/Vendors */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Clients / Vendors
            </p>
            <h4 className="text-xl font-bold text-slate-900 mt-1 font-mono">
              {accountingSummary.totalVendors}
            </h4>
            <p className="text-[10px] text-slate-400 mt-0.5">Active in period</p>
          </div>
        </div>
      </div>

      {/* Invoice Status Summary (Visual breakdown bar + 4 status breakdown cards) */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <CheckCircle2 className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-bold text-slate-900">
              Invoice Status Summary & Payment Distribution
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Based on {accountingSummary.totalInvoices} invoices in period
          </span>
        </div>

        {/* Visual Progress / Proportion Bar */}
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
          <div
            style={{ width: `${statusSummary.paid.pct}%` }}
            className="bg-emerald-500 transition-all duration-500"
            title={`Paid: ${statusSummary.paid.count} invoices (${statusSummary.paid.pct}%)`}
          />
          <div
            style={{ width: `${statusSummary.partiallyPaid.pct}%` }}
            className="bg-blue-500 transition-all duration-500"
            title={`Partially Paid: ${statusSummary.partiallyPaid.count} invoices (${statusSummary.partiallyPaid.pct}%)`}
          />
          <div
            style={{ width: `${statusSummary.pending.pct}%` }}
            className="bg-amber-400 transition-all duration-500"
            title={`Pending: ${statusSummary.pending.count} invoices (${statusSummary.pending.pct}%)`}
          />
          <div
            style={{ width: `${statusSummary.overdue.pct}%` }}
            className="bg-rose-500 transition-all duration-500"
            title={`Overdue: ${statusSummary.overdue.count} invoices (${statusSummary.overdue.pct}%)`}
          />
        </div>

        {/* Status Breakdown Cards (Count + Amount) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {/* Paid */}
          <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/30 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold text-emerald-800">Paid Invoices</span>
              </div>
              <p className="text-lg font-bold text-emerald-950 mt-1 font-mono">
                {statusSummary.paid.count} invoices — {formatCurrency(statusSummary.paid.amount)}
              </p>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                {statusSummary.paid.pct}% of total records
              </p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Check className="w-5 h-5" />
            </div>
          </div>

          {/* Partially Paid */}
          <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/30 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-xs font-bold text-blue-800">Partially Paid</span>
              </div>
              <p className="text-lg font-bold text-blue-950 mt-1 font-mono">
                {statusSummary.partiallyPaid.count} invoices — {formatCurrency(statusSummary.partiallyPaid.amount)}
              </p>
              <p className="text-[11px] text-blue-700 mt-0.5">Partial balance due</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          {/* Pending */}
          <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/30 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="text-xs font-bold text-amber-800">Pending / Open</span>
              </div>
              <p className="text-lg font-bold text-amber-950 mt-1 font-mono">
                {statusSummary.pending.count} invoices — {formatCurrency(statusSummary.pending.amount)}
              </p>
              <p className="text-[11px] text-amber-700 mt-0.5">Within payment terms</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>

          {/* Overdue */}
          <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/30 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="text-xs font-bold text-rose-800">Overdue</span>
              </div>
              <p className="text-lg font-bold text-rose-950 mt-1 font-mono">
                {statusSummary.overdue.count} invoices — {formatCurrency(statusSummary.overdue.amount)}
              </p>
              <p className="text-[11px] text-rose-700 mt-0.5">Past due date</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Dedicated Tax Summary Section (Dynamic calculations from actual records) */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
                <Percent className="w-4 h-4" />
              </span>
              <h3 className="text-base font-bold text-slate-900">
                Tax Accounting Summary & Rates Breakdown
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Dynamically aggregated from each invoice in the selected period (preserving individual tax type breakdowns)
            </p>
          </div>

          {/* High-level Tax Totals Pill */}
          <div className="flex items-center gap-3 bg-purple-50/60 px-4 py-2 rounded-xl border border-purple-100 text-xs">
            <div>
              <span className="text-slate-500">Total Taxable:</span>{' '}
              <span className="font-bold font-mono text-slate-900">{formatCurrency(taxSummary.totalTaxableAmount)}</span>
            </div>
            <div className="w-px h-4 bg-purple-200" />
            <div>
              <span className="text-purple-700 font-semibold">Total Tax:</span>{' '}
              <span className="font-bold font-mono text-purple-950">{formatCurrency(taxSummary.totalTaxAmount)}</span>
            </div>
          </div>
        </div>

        {/* Dynamic Tax Rates Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-4">Tax Type / Authority</th>
                <th className="py-2.5 px-4 text-center">Tax Rate</th>
                <th className="py-2.5 px-4 text-right">Taxable Amount</th>
                <th className="py-2.5 px-4 text-right">Tax Amount</th>
                <th className="py-2.5 px-4 text-center">Invoices Count</th>
                <th className="py-2.5 px-4 text-right">Effective Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {taxSummary.taxBuckets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400">
                    No tax records found for the selected date period.
                  </td>
                </tr>
              ) : (
                taxSummary.taxBuckets.map((bucket, i) => (
                  <tr key={i} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <div className="flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5 text-purple-600" />
                        <span>{bucket.label}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-semibold text-slate-700">
                      {bucket.rate.toFixed(3)}%
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-800">
                      {formatCurrency(bucket.taxableBase)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-purple-900">
                      {formatCurrency(bucket.taxAmount)}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-600">
                      {bucket.invoiceCount} invoices
                    </td>
                    <td className="py-3 px-4 text-right text-[11px]">
                      <span className="px-2 py-0.5 rounded-full font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                        Remittance Ready
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {taxSummary.taxBuckets.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 font-bold text-slate-900 border-t-2 border-slate-200">
                  <td className="py-3 px-4">TOTAL TAX ACCRUAL</td>
                  <td className="py-3 px-4 text-center font-mono text-slate-500">—</td>
                  <td className="py-3 px-4 text-right font-mono text-slate-900">
                    {formatCurrency(taxSummary.totalTaxableAmount)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-purple-950 text-sm">
                    {formatCurrency(taxSummary.totalTaxAmount)}
                  </td>
                  <td className="py-3 px-4 text-center font-mono">{dateFilteredInvoices.length}</td>
                  <td className="py-3 px-4 text-right text-[11px] text-slate-500 font-mono">
                    Realized: {formatCurrency(taxSummary.totalTaxCollectedRealized)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Customer / Vendor Summary Section */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Building2 className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Customer & Vendor Performance Summary
              </h3>
              <p className="text-xs text-slate-500">
                Volume of business, payments, and outstanding balances during the selected period
              </p>
            </div>
          </div>

          {/* Search/filter by Customer/Vendor Name */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search customer/vendor..."
              value={vendorSearch}
              onChange={(e) => setVendorSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-4">Customer / Vendor Name</th>
                <th className="py-2.5 px-4 text-center">Invoices</th>
                <th className="py-2.5 px-4 text-right">Total Invoiced</th>
                <th className="py-2.5 px-4 text-right">Total Paid</th>
                <th className="py-2.5 px-4 text-right">Total Pending</th>
                <th className="py-2.5 px-4 text-right">Total Tax</th>
                <th className="py-2.5 px-4 text-right">Outstanding Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vendorSummary.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400">
                    No customer or vendor data found matching criteria.
                  </td>
                </tr>
              ) : (
                vendorSummary.map((v, i) => (
                  <tr key={i} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {v.name}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-medium text-slate-600">
                      {v.invoiceCount}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(v.totalInvoiced)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-emerald-700">
                      {formatCurrency(v.totalPaid)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-amber-700">
                      {formatCurrency(v.totalPending)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-purple-700">
                      {formatCurrency(v.totalTax)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-blue-900">
                      {formatCurrency(v.outstandingBalance)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Invoice Records Table with Search, Sort, Filters, and Pagination */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Controls Header */}
        <div className="p-5 border-b border-slate-200 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                  <FileText className="w-4 h-4" />
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Detailed Invoice Records ({processedInvoices.length} of {dateFilteredInvoices.length})
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Complete invoice records in date range. Click any invoice number to view or print the full invoice.
              </p>
            </div>

            {/* Quick Export in table header */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportDetailedCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search invoice #, client, items..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <label htmlFor="report-status-filter" className="text-xs font-medium text-slate-500">
                Status:
              </label>
              <select
                id="report-status-filter"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer flex-1"
              >
                <option value="ALL">All Statuses</option>
                <option value="PAID">Paid Only</option>
                <option value="PARTIALLY_PAID">Partially Paid</option>
                <option value="OPEN">Pending / Open</option>
                <option value="OVERDUE">Overdue Invoices</option>
              </select>
            </div>

            {/* Vendor / Customer Filter */}
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <label htmlFor="report-vendor-filter" className="text-xs font-medium text-slate-500">
                Customer:
              </label>
              <select
                id="report-vendor-filter"
                value={vendorFilter}
                onChange={(e) => {
                  setVendorFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer flex-1 truncate"
              >
                <option value="ALL">All Customers ({availableVendors.length})</option>
                {availableVendors.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            {/* Page Size Selector */}
            <div className="flex items-center justify-between bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <span className="text-xs font-medium text-slate-500">Show per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value={10}>10 records</option>
                <option value={25}>25 records</option>
                <option value={50}>50 records</option>
                <option value={100}>100 records</option>
              </select>
            </div>
          </div>
        </div>

        {/* Detailed Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <th
                  onClick={() => {
                    setSortField('invoiceNumber');
                    setSortAsc(!sortAsc);
                  }}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Invoice #</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => {
                    setSortField('invoiceDate');
                    setSortAsc(!sortAsc);
                  }}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Date</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => {
                    setSortField('vendor');
                    setSortAsc(!sortAsc);
                  }}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Customer / Vendor</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4 text-right">Subtotal</th>
                <th className="py-3 px-4 text-right">Tax</th>
                <th
                  onClick={() => {
                    setSortField('grandTotal');
                    setSortAsc(!sortAsc);
                  }}
                  className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100 transition select-none"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Total</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4 text-right">Paid</th>
                <th className="py-3 px-4 text-right">Pending</th>
                <th
                  onClick={() => {
                    setSortField('status');
                    setSortAsc(!sortAsc);
                  }}
                  className="py-3 px-4 text-center cursor-pointer hover:bg-slate-100 transition select-none"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Status</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4 text-left">Payment Method</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedInvoices.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No invoices match the current reporting filter</p>
                    <p className="text-xs text-slate-400 mt-1">Try resetting the date range or search keyword.</p>
                  </td>
                </tr>
              ) : (
                paginatedInvoices.map((inv) => {
                  const subtotal = Number(inv.subtotal) || 0;
                  const total = Number(inv.grandTotal) || 0;

                  let paid = 0;
                  if (inv.status === 'PAID') {
                    paid = Number(inv.amountPaid) || total;
                  } else if (inv.amountPaid) {
                    paid = Number(inv.amountPaid);
                  } else if (inv.payments && inv.payments.length > 0) {
                    paid = inv.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
                  }
                  const pending = Math.max(0, total - paid);

                  const isOverdue = isInvoiceOverdue(inv, todayYMD);
                  const latestPay = inv.payments && inv.payments.length > 0 ? inv.payments[inv.payments.length - 1] : null;
                  const paymentMethod = latestPay?.method || (inv.status === 'PAID' ? 'Bank Transfer' : 'Pending');

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                      {/* Invoice # */}
                      <td className="py-3 px-4 font-mono font-bold">
                        <button
                          type="button"
                          onClick={() => onViewInvoice(inv)}
                          className="text-indigo-600 hover:text-indigo-900 hover:underline cursor-pointer"
                        >
                          {inv.invoiceNumber}
                        </button>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {formatDateToDisplay(inv.invoiceDate)}
                      </td>

                      {/* Customer / Vendor */}
                      <td className="py-3 px-4 font-medium text-slate-900 max-w-xs truncate">
                        <p className="font-semibold text-slate-800">{inv.vendor?.companyName}</p>
                        <p className="text-[10px] text-slate-400 truncate">{inv.vendor?.email || inv.vendor?.address}</p>
                      </td>

                      {/* Subtotal */}
                      <td className="py-3 px-4 text-right font-mono text-slate-700">
                        {formatCurrency(subtotal)}
                      </td>

                      {/* Tax */}
                      <td className="py-3 px-4 text-right font-mono">
                        <div className="flex flex-col items-end">
                          <span className="font-semibold text-purple-900">{formatCurrency(inv.taxAmount || 0)}</span>
                          <span className="text-[9px] text-purple-600 uppercase">
                            {inv.taxType === 'QUEBEC' ? 'GST+QST' : inv.taxType} {inv.taxRate}%
                          </span>
                        </div>
                      </td>

                      {/* Total */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(total)}
                      </td>

                      {/* Paid */}
                      <td className="py-3 px-4 text-right font-mono text-emerald-700 font-semibold">
                        {formatCurrency(paid)}
                      </td>

                      {/* Pending */}
                      <td className="py-3 px-4 text-right font-mono text-amber-700 font-semibold">
                        {formatCurrency(pending)}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        {inv.status === 'PAID' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Check className="w-3 h-3" />
                            Paid
                          </span>
                        ) : isOverdue ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertTriangle className="w-3 h-3" />
                            Overdue
                          </span>
                        ) : inv.status === 'PARTIALLY_PAID' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            <Clock className="w-3 h-3" />
                            Partial
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <CreditCard className="w-3 h-3" />
                            Pending
                          </span>
                        )}
                      </td>

                      {/* Payment Method */}
                      <td className="py-3 px-4 text-slate-600 text-[11px] whitespace-nowrap">
                        {paymentMethod}
                        {latestPay?.reference && (
                          <span className="block text-[9px] text-slate-400 font-mono">
                            Ref: {latestPay.reference}
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => onViewInvoice(inv)}
                          title="View Invoice Preview"
                          className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            Showing <span className="font-semibold text-slate-900">{processedInvoices.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> to{' '}
            <span className="font-semibold text-slate-900">
              {Math.min(currentPage * pageSize, processedInvoices.length)}
            </span>{' '}
            of <span className="font-semibold text-slate-900">{processedInvoices.length}</span> entries
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer text-xs font-semibold"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            <span className="font-mono text-xs font-bold text-slate-700 px-2">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer text-xs font-semibold"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
