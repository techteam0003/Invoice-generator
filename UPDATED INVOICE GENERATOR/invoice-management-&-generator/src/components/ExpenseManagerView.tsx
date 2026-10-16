import React, { useState, useMemo } from 'react';
import {
  Expense,
  ExpenseCategory,
  ExpenseAttachment,
  Vendor,
  Invoice
} from '../types';
import {
  formatCurrency,
  formatDateToDisplay,
  getTodayDateString,
  downloadAttachment
} from '../utils/formatters';
import {
  PlusCircle,
  Search,
  Filter,
  Trash2,
  Edit3,
  Paperclip,
  Download,
  Calendar,
  DollarSign,
  Tag,
  CreditCard,
  Building,
  TrendingDown,
  TrendingUp,
  Receipt,
  FileSpreadsheet,
  X,
  CheckCircle2,
  ExternalLink,
  Plus,
  Layers,
  PieChart,
  HelpCircle,
  FileText
} from 'lucide-react';
import { DeleteConfirmModal } from './DeleteConfirmModal';

interface ExpenseManagerViewProps {
  expenses: Expense[];
  categories: ExpenseCategory[];
  vendors: Vendor[];
  invoices: Invoice[];
  onAddExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => void;
  onUpdateExpense: (id: string, updates: Partial<Expense>) => void;
  onDeleteExpense: (id: string) => void;
  onAddCategory: (name: string, color?: string) => ExpenseCategory;
  onDeleteCategory: (id: string) => void;
}

const PAYMENT_METHODS = [
  'Credit Card',
  'Bank Transfer',
  'Interac / e-Transfer',
  'Cash',
  'Cheque',
  'Debit Card',
  'Company Account',
  'Other'
];

const PRESET_COLORS = [
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#F43F5E', // Rose
  '#F97316', // Orange
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#14B8A6', // Teal
  '#06B6D4', // Cyan
  '#64748B', // Slate
];

export const ExpenseManagerView: React.FC<ExpenseManagerViewProps> = ({
  expenses = [],
  categories = [],
  vendors = [],
  invoices = [],
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
  onAddCategory,
  onDeleteCategory,
}) => {
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  const [selectedPaymentFilter, setSelectedPaymentFilter] = useState('ALL');
  const [selectedTimeFilter, setSelectedTimeFilter] = useState<'ALL' | 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_YEAR'>('ALL');
  const [isCategoryBreakdownOpen, setIsCategoryBreakdownOpen] = useState(false);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<{ name: string; dataUrl: string; type: string } | null>(null);

  // Expense Form State
  const [formTitle, setFormTitle] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formDate, setFormDate] = useState(getTodayDateString());
  const [formPaymentMethod, setFormPaymentMethod] = useState(PAYMENT_METHODS[0]);
  const [formPayee, setFormPayee] = useState('');
  const [formReference, setFormReference] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formTaxDeductible, setFormTaxDeductible] = useState(true);
  const [formTaxAmount, setFormTaxAmount] = useState('');
  const [formAttachments, setFormAttachments] = useState<ExpenseAttachment[]>([]);
  const [formError, setFormError] = useState('');

  // Inline "Add Category On My Own" inside Expense Modal
  const [isCreatingInlineCategory, setIsCreatingInlineCategory] = useState(false);
  const [newInlineCategoryName, setNewInlineCategoryName] = useState('');
  const [newInlineCategoryColor, setNewInlineCategoryColor] = useState(PRESET_COLORS[0]);

  // Manage Category Modal Form
  const [modalCategoryName, setModalCategoryName] = useState('');
  const [modalCategoryColor, setModalCategoryColor] = useState(PRESET_COLORS[1]);

  // Filter logic
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      // Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = exp.title.toLowerCase().includes(query);
        const matchesPayee = (exp.payee || '').toLowerCase().includes(query);
        const matchesCategory = exp.category.toLowerCase().includes(query);
        const matchesRef = (exp.reference || '').toLowerCase().includes(query);
        const matchesNotes = (exp.notes || '').toLowerCase().includes(query);
        if (!matchesTitle && !matchesPayee && !matchesCategory && !matchesRef && !matchesNotes) {
          return false;
        }
      }

      // Category
      if (selectedCategoryFilter !== 'ALL' && exp.category !== selectedCategoryFilter) {
        return false;
      }

      // Payment Method
      if (selectedPaymentFilter !== 'ALL' && exp.paymentMethod !== selectedPaymentFilter) {
        return false;
      }

      // Time Range
      if (selectedTimeFilter !== 'ALL') {
        try {
          const expDate = new Date(exp.date);
          const expYear = expDate.getFullYear();
          const expMonth = expDate.getMonth();

          if (selectedTimeFilter === 'THIS_MONTH') {
            if (expYear !== currentYear || expMonth !== currentMonth) return false;
          } else if (selectedTimeFilter === 'LAST_MONTH') {
            const targetMonth = currentMonth === 0 ? 11 : currentMonth - 1;
            const targetYear = currentMonth === 0 ? currentYear - 1 : currentYear;
            if (expYear !== targetYear || expMonth !== targetMonth) return false;
          } else if (selectedTimeFilter === 'THIS_YEAR') {
            if (expYear !== currentYear) return false;
          }
        } catch {
          // ignore parsing error
        }
      }

      return true;
    });
  }, [expenses, searchQuery, selectedCategoryFilter, selectedPaymentFilter, selectedTimeFilter, currentYear, currentMonth]);

  // Calculations
  const totalExpenseAmount = useMemo(() => {
    return expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [expenses]);

  const filteredExpenseAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [filteredExpenses]);

  const thisMonthExpenses = useMemo(() => {
    return expenses.filter((e) => {
      try {
        const d = new Date(e.date);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      } catch {
        return false;
      }
    });
  }, [expenses, currentYear, currentMonth]);

  const thisMonthAmount = useMemo(() => {
    return thisMonthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [thisMonthExpenses]);

  // Invoiced Revenue & Financial Calculations
  const totalInvoicedRevenue = useMemo(() => {
    return invoices.reduce((sum, inv) => sum + (Number(inv.grandTotal) || 0), 0);
  }, [invoices]);

  const totalCollectedRevenue = useMemo(() => {
    return invoices.reduce((sum, inv) => {
      if (inv.status === 'PAID') return sum + (Number(inv.grandTotal) || 0);
      return sum + (Number(inv.amountPaid) || 0);
    }, 0);
  }, [invoices]);

  const netOperatingIncome = totalInvoicedRevenue - totalExpenseAmount;
  const netCashFlow = totalCollectedRevenue - totalExpenseAmount;

  // Category Breakdown Calculation
  const categoryStats = useMemo(() => {
    const statsMap: Record<string, { total: number; count: number; color?: string }> = {};
    
    // Initialize with known categories
    categories.forEach((cat) => {
      statsMap[cat.name] = { total: 0, count: 0, color: cat.color };
    });

    expenses.forEach((e) => {
      const catName = e.category || 'Miscellaneous & Other';
      if (!statsMap[catName]) {
        statsMap[catName] = { total: 0, count: 0, color: '#64748B' };
      }
      statsMap[catName].total += Number(e.amount) || 0;
      statsMap[catName].count += 1;
    });

    return Object.entries(statsMap)
      .map(([name, data]) => ({
        name,
        total: data.total,
        count: data.count,
        color: data.color || '#6366F1',
        percentage: totalExpenseAmount > 0 ? (data.total / totalExpenseAmount) * 100 : 0
      }))
      .filter((c) => c.total > 0 || categories.some((orig) => orig.name === c.name))
      .sort((a, b) => b.total - a.total);
  }, [expenses, categories, totalExpenseAmount]);

  const topCategory = categoryStats.length > 0 && categoryStats[0].total > 0 ? categoryStats[0] : null;

  // Category color lookup
  const getCategoryColor = (catName: string) => {
    const found = categories.find((c) => c.name.toLowerCase() === catName.toLowerCase());
    return found?.color || '#6366F1';
  };

  // Open modal for Create
  const handleOpenAddModal = () => {
    setEditingExpense(null);
    setFormTitle('');
    setFormAmount('');
    setFormCategory(categories[0]?.name || 'Vehicle Inspection & Certifications');
    setFormDate(getTodayDateString());
    setFormPaymentMethod(PAYMENT_METHODS[0]);
    setFormPayee('');
    setFormReference('');
    setFormNotes('');
    setFormTaxDeductible(true);
    setFormTaxAmount('');
    setFormAttachments([]);
    setFormError('');
    setIsCreatingInlineCategory(false);
    setIsAddModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEditModal = (expense: Expense) => {
    setEditingExpense(expense);
    setFormTitle(expense.title);
    setFormAmount(expense.amount.toString());
    setFormCategory(expense.category);
    setFormDate(expense.date);
    setFormPaymentMethod(expense.paymentMethod);
    setFormPayee(expense.payee || '');
    setFormReference(expense.reference || '');
    setFormNotes(expense.notes || '');
    setFormTaxDeductible(expense.taxDeductible !== false);
    setFormTaxAmount(expense.taxAmount !== undefined ? expense.taxAmount.toString() : '');
    setFormAttachments(expense.attachments || []);
    setFormError('');
    setIsCreatingInlineCategory(false);
    setIsAddModalOpen(true);
  };

  // Save new custom category inline
  const handleSaveInlineCategory = () => {
    if (!newInlineCategoryName.trim()) return;
    const created = onAddCategory(newInlineCategoryName.trim(), newInlineCategoryColor);
    setFormCategory(created.name);
    setNewInlineCategoryName('');
    setIsCreatingInlineCategory(false);
  };

  // Upload receipt attachment in form
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;

    files.forEach((file: File) => {
      if (file.size > 8 * 1024 * 1024) {
        alert(`File ${file.name} is larger than 8MB limit.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const newAtt: ExpenseAttachment = {
          id: 'att_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          dataUrl,
          uploadedAt: new Date().toISOString()
        };
        setFormAttachments((prev) => [...prev, newAtt]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    e.target.value = '';
  };

  // Save Form (Create or Edit)
  const handleSubmitExpenseForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formTitle.trim()) {
      setFormError('Please enter a description or title for the expense.');
      return;
    }

    const numAmount = parseFloat(formAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError('Please enter a valid expense amount greater than $0.00.');
      return;
    }

    if (!formCategory.trim()) {
      setFormError('Please select or specify a category for this expense.');
      return;
    }

    if (!formDate) {
      setFormError('Please select the date of this expense.');
      return;
    }

    const payload: Omit<Expense, 'id' | 'createdAt'> = {
      title: formTitle.trim(),
      amount: Math.round(numAmount * 100) / 100,
      category: formCategory.trim(),
      date: formDate,
      paymentMethod: formPaymentMethod,
      payee: formPayee.trim() || undefined,
      reference: formReference.trim() || undefined,
      notes: formNotes.trim() || undefined,
      taxDeductible: formTaxDeductible,
      taxAmount: formTaxAmount ? parseFloat(formTaxAmount) : undefined,
      attachments: formAttachments,
    };

    if (editingExpense) {
      onUpdateExpense(editingExpense.id, payload);
    } else {
      onAddExpense(payload);
    }

    setIsAddModalOpen(false);
  };

  // Export Expenses to CSV
  const handleExportCSV = () => {
    if (filteredExpenses.length === 0) {
      alert('No expenses to export with the current filter settings.');
      return;
    }

    const headers = [
      'Date',
      'Title / Description',
      'Category',
      'Amount (CAD)',
      'Payee',
      'Payment Method',
      'Reference / Receipt #',
      'Tax Amount',
      'Notes'
    ];

    const rows = filteredExpenses.map((exp) => [
      `"${exp.date}"`,
      `"${exp.title.replace(/"/g, '""')}"`,
      `"${exp.category.replace(/"/g, '""')}"`,
      `"${exp.amount.toFixed(2)}"`,
      `"${(exp.payee || '').replace(/"/g, '""')}"`,
      `"${exp.paymentMethod.replace(/"/g, '""')}"`,
      `"${(exp.reference || '').replace(/"/g, '""')}"`,
      `"${exp.taxAmount !== undefined ? exp.taxAmount.toFixed(2) : ''}"`,
      `"${(exp.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `company_expenses_${getTodayDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-6 text-white shadow-lg border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-block px-3 py-1 bg-rose-500/20 text-rose-300 text-xs font-semibold rounded-full border border-rose-400/20">
              Non-Invoiced Expenses & Outlays
            </span>
            <span className="text-xs text-slate-400">• Financial Tracking & Profit Calculations</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Business Expense Manager</h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl">
            Track outlays that cannot be billed directly on client invoices (vehicle inspections, towing, fuel, parts, licensing & custom categories) to calculate accurate net profit.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            id="add-expense-main-btn"
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-lg shadow-sm transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Add Expense</span>
          </button>

          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-xs font-semibold rounded-lg border border-white/20 transition cursor-pointer"
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Manage Categories</span>
          </button>

          <button
            onClick={handleExportCSV}
            title="Export filtered expenses to CSV"
            className="flex items-center gap-2 px-3.5 py-2.5 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-xs font-semibold rounded-lg border border-white/20 transition cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Metrics & Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Expenses */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Expenses
            </p>
            <h3 className="text-2xl font-bold text-rose-600 mt-1 font-mono">
              {formatCurrency(totalExpenseAmount)}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 font-medium flex items-center gap-1">
              <Receipt className="w-3.5 h-3.5 text-slate-400" />
              <span>{expenses.length} expenses recorded</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        {/* This Month's Expenses */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              This Month Outlays
            </p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1 font-mono">
              {formatCurrency(thisMonthAmount)}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 font-medium flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              <span>{thisMonthExpenses.length} transactions this month</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        {/* Net Profit (Invoiced - Expenses) */}
        <div className={`bg-white rounded-xl p-5 border shadow-sm flex items-center justify-between ${
          netOperatingIncome >= 0 ? 'border-emerald-200 bg-emerald-50/20' : 'border-rose-200 bg-rose-50/20'
        }`}>
          <div>
            <p className={`text-xs font-semibold uppercase tracking-wider flex items-center gap-1 ${
              netOperatingIncome >= 0 ? 'text-emerald-700' : 'text-rose-700'
            }`}>
              <span>Net Operating Profit</span>
            </p>
            <h3 className={`text-2xl font-bold mt-1 font-mono ${
              netOperatingIncome >= 0 ? 'text-emerald-900' : 'text-rose-900'
            }`}>
              {formatCurrency(netOperatingIncome)}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">
              Invoiced {formatCurrency(totalInvoicedRevenue)} - Expenses
            </p>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            netOperatingIncome >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
          }`}>
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Top Expense Category */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="overflow-hidden pr-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">
              Top Outlay Category
            </p>
            <h3 className="text-lg font-bold text-slate-900 mt-1 truncate" title={topCategory ? topCategory.name : 'N/A'}>
              {topCategory ? topCategory.name : 'None yet'}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 font-semibold text-rose-600 font-mono">
              {topCategory ? `${formatCurrency(topCategory.total)} (${topCategory.percentage.toFixed(0)}%)` : '$0.00'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
            <PieChart className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Financial Health & P&L Calculation Banner */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>Financial Position & Profit / Loss Reconciliation</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Automated bottom-line calculation combining revenue from all client invoices and tracked business outlays.
            </p>
          </div>
          <button
            onClick={() => setIsCategoryBreakdownOpen(!isCategoryBreakdownOpen)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition cursor-pointer self-start md:self-auto"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{isCategoryBreakdownOpen ? 'Hide Category Distribution' : 'Show Category Distribution'}</span>
          </button>
        </div>

        {/* 4-Pillar Financial Equation */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4">
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200/60">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Gross Invoiced (Revenue)</span>
            <span className="text-base sm:text-lg font-bold text-slate-900 font-mono mt-0.5 block">{formatCurrency(totalInvoicedRevenue)}</span>
            <span className="text-[10px] text-slate-500">{invoices.length} invoices generated</span>
          </div>

          <div className="bg-emerald-50/50 rounded-lg p-3 border border-emerald-200/60">
            <span className="text-[10px] uppercase font-bold text-emerald-700 block tracking-wider">Collected Cash In</span>
            <span className="text-base sm:text-lg font-bold text-emerald-800 font-mono mt-0.5 block">{formatCurrency(totalCollectedRevenue)}</span>
            <span className="text-[10px] text-emerald-600">From paid & partial invoices</span>
          </div>

          <div className="bg-rose-50/50 rounded-lg p-3 border border-rose-200/60">
            <span className="text-[10px] uppercase font-bold text-rose-700 block tracking-wider">Total Expenses Out</span>
            <span className="text-base sm:text-lg font-bold text-rose-800 font-mono mt-0.5 block">{formatCurrency(totalExpenseAmount)}</span>
            <span className="text-[10px] text-rose-600">{expenses.length} expense vouchers</span>
          </div>

          <div className="bg-indigo-50/50 rounded-lg p-3 border border-indigo-200/60">
            <span className="text-[10px] uppercase font-bold text-indigo-700 block tracking-wider">Realized Net Cash Flow</span>
            <span className={`text-base sm:text-lg font-bold font-mono mt-0.5 block ${netCashFlow >= 0 ? 'text-indigo-900' : 'text-rose-900'}`}>
              {formatCurrency(netCashFlow)}
            </span>
            <span className="text-[10px] text-indigo-600">Collected Cash - Total Expenses</span>
          </div>
        </div>

        {/* Collapsible Category Breakdown Visualizer */}
        {isCategoryBreakdownOpen && (
          <div className="mt-5 pt-4 border-t border-slate-100 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span>Category Breakdown & Outlay Shares</span>
              <span className="text-slate-400 font-mono text-[11px]">{categoryStats.length} active categories</span>
            </div>

            {/* Visual Color Segment Bar */}
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
              {categoryStats.filter((c) => c.total > 0).map((c, idx) => (
                <div
                  key={idx}
                  style={{ width: `${c.percentage}%`, backgroundColor: c.color }}
                  title={`${c.name}: ${formatCurrency(c.total)} (${c.percentage.toFixed(1)}%)`}
                  className="h-full transition-all duration-300 hover:opacity-80"
                />
              ))}
            </div>

            {/* Category Pills & Totals */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2">
              {categoryStats.map((cat, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedCategoryFilter(selectedCategoryFilter === cat.name ? 'ALL' : cat.name)}
                  className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition ${
                    selectedCategoryFilter === cat.name
                      ? 'border-indigo-500 bg-indigo-50/40 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden pr-2">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="font-semibold text-slate-800 truncate">{cat.name}</span>
                  </div>
                  <div className="text-right flex-shrink-0 font-mono">
                    <span className="font-bold text-slate-900">{formatCurrency(cat.total)}</span>
                    <span className="text-[10px] text-slate-400 block">{cat.percentage.toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search expenses by description, payee, reference #, or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Filter */}
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Time Filter */}
            <select
              value={selectedTimeFilter}
              onChange={(e) => setSelectedTimeFilter(e.target.value as any)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
            >
              <option value="ALL">All Dates</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="LAST_MONTH">Last Month</option>
              <option value="THIS_YEAR">This Year ({currentYear})</option>
            </select>

            {/* Payment Method Filter */}
            <select
              value={selectedPaymentFilter}
              onChange={(e) => setSelectedPaymentFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
            >
              <option value="ALL">All Payment Methods</option>
              {PAYMENT_METHODS.map((pm) => (
                <option key={pm} value={pm}>
                  {pm}
                </option>
              ))}
            </select>

            {(searchQuery || selectedCategoryFilter !== 'ALL' || selectedTimeFilter !== 'ALL' || selectedPaymentFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategoryFilter('ALL');
                  setSelectedTimeFilter('ALL');
                  setSelectedPaymentFilter('ALL');
                }}
                className="px-2.5 py-2 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Results summary pill */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
          <span>
            Showing <strong className="text-slate-800">{filteredExpenses.length}</strong> of {expenses.length} expenses
          </span>
          <span>
            Filtered Total: <strong className="text-slate-900 font-mono">{formatCurrency(filteredExpenseAmount)}</strong>
          </span>
        </div>
      </div>

      {/* Main Expenses Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredExpenses.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-base font-semibold text-slate-800">No Expenses Found</p>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              {expenses.length === 0
                ? 'You have not added any expenses yet. Click "+ Add Expense" to record vehicle inspection, transport, or custom costs.'
                : 'No expenses matched your search or filter criteria. Try clearing filters to see all entries.'}
            </p>
            <button
              onClick={handleOpenAddModal}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm cursor-pointer transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Add First Expense</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Description / Details</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Payee / Recipient</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4">Receipt</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredExpenses.map((expense) => {
                  const categoryColor = getCategoryColor(expense.category);
                  const hasReceipts = expense.attachments && expense.attachments.length > 0;

                  return (
                    <tr
                      key={expense.id}
                      className="hover:bg-slate-50/80 transition-colors duration-100"
                    >
                      {/* Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-800">
                        {formatDateToDisplay(expense.date)}
                      </td>

                      {/* Title & Notes */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-semibold text-slate-900">{expense.title}</div>
                        {expense.notes && (
                          <div className="text-[11px] text-slate-400 truncate mt-0.5" title={expense.notes}>
                            {expense.notes}
                          </div>
                        )}
                        {expense.reference && (
                          <div className="text-[10px] text-indigo-600 font-mono mt-0.5">
                            Ref: {expense.reference}
                          </div>
                        )}
                      </td>

                      {/* Category Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                          style={{
                            backgroundColor: `${categoryColor}18`,
                            color: categoryColor,
                            border: `1px solid ${categoryColor}30`,
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: categoryColor }}
                          />
                          <span>{expense.category}</span>
                        </span>
                      </td>

                      {/* Payee / Vendor */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 font-medium">
                        {expense.payee ? (
                          <span className="flex items-center gap-1.5">
                            <Building className="w-3.5 h-3.5 text-slate-400" />
                            <span>{expense.payee}</span>
                          </span>
                        ) : (
                          <span className="text-slate-300 italic">—</span>
                        )}
                      </td>

                      {/* Payment Method */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                        <span className="flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                          <span>{expense.paymentMethod}</span>
                        </span>
                      </td>

                      {/* Receipt Attachment Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {hasReceipts ? (
                          <div className="flex items-center gap-1.5">
                            {expense.attachments!.map((att, idx) => (
                              <button
                                key={idx}
                                onClick={() => setViewingReceipt(att)}
                                title={`Click to view/download ${att.name}`}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-[10px] font-semibold border border-indigo-200 transition cursor-pointer"
                              >
                                <Paperclip className="w-3 h-3 text-indigo-600" />
                                <span className="truncate max-w-[80px]">{att.name}</span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-300 text-[11px] italic">None</span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-right font-mono font-bold text-slate-900 text-sm">
                        {formatCurrency(expense.amount)}
                        {expense.taxAmount !== undefined && (
                          <span className="block text-[10px] text-slate-400 font-normal">
                            incl. {formatCurrency(expense.taxAmount)} tax
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEditModal(expense)}
                            title="Edit Expense"
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setExpenseToDelete(expense)}
                            title="Delete Expense"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD / EDIT EXPENSE MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">
                  {editingExpense ? 'Edit Business Expense' : 'Add New Business Expense'}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Record operational outlays, transport, safety inspections & custom category costs
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmitExpenseForm} className="p-6 overflow-y-auto space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium">
                  {formError}
                </div>
              )}

              {/* Title / Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Expense Description / Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. SAAQ Technical Vehicle Safety Inspection, Flatbed Towing, Fuel"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  required
                />
              </div>

              {/* Amount & Date Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Amount ($ CAD) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Expense Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              {/* Category Selector with "+ Add Category On My Own" */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCreatingInlineCategory(!isCreatingInlineCategory)}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isCreatingInlineCategory ? 'Select Existing Category' : '+ Add Category On My Own'}</span>
                  </button>
                </div>

                {isCreatingInlineCategory ? (
                  <div className="p-3 bg-white rounded-lg border border-indigo-200 space-y-2.5 animate-fade-in">
                    <p className="text-[11px] text-slate-500">
                      Type your custom category name and pick a color:
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. Customs Brokerage, Storage Fees, Marketing"
                        value={newInlineCategoryName}
                        onChange={(e) => setNewInlineCategoryName(e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={handleSaveInlineCategory}
                        disabled={!newInlineCategoryName.trim()}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg cursor-pointer transition"
                      >
                        Create & Apply
                      </button>
                    </div>
                    {/* Color palette */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-slate-400 font-medium">Color:</span>
                      {PRESET_COLORS.map((col) => (
                        <button
                          key={col}
                          type="button"
                          onClick={() => setNewInlineCategoryColor(col)}
                          style={{ backgroundColor: col }}
                          className={`w-4 h-4 rounded-full transition-transform cursor-pointer ${
                            newInlineCategoryColor === col ? 'scale-125 ring-2 ring-indigo-600 ring-offset-1' : ''
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Payee / Vendor & Payment Method */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Payee / Vendor / Recipient
                  </label>
                  <input
                    type="text"
                    list="vendors-datalist"
                    placeholder="e.g. CAA Towing, SAAQ, Shell"
                    value={formPayee}
                    onChange={(e) => setFormPayee(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  <datalist id="vendors-datalist">
                    {vendors.map((v) => (
                      <option key={v.id} value={v.companyName} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={formPaymentMethod}
                    onChange={(e) => setFormPaymentMethod(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                  >
                    {PAYMENT_METHODS.map((pm) => (
                      <option key={pm} value={pm}>
                        {pm}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Reference & Tax Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Receipt # / Check # / Reference
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CHK-1092, REF-4891, INV-8201"
                    value={formReference}
                    onChange={(e) => setFormReference(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Taxes Included ($ HST/GST)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00 (optional)"
                    value={formTaxAmount}
                    onChange={(e) => setFormTaxAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Additional Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional context or vehicle VIN details..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                />
              </div>

              {/* Receipt Attachments */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Receipt or Invoice Document (Optional)
                </label>
                <div className="border border-dashed border-slate-300 rounded-xl p-3 bg-slate-50 hover:bg-slate-100/70 transition">
                  <input
                    type="file"
                    id="expense-receipt-upload"
                    multiple
                    accept="image/*,application/pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor="expense-receipt-upload"
                    className="flex flex-col items-center justify-center cursor-pointer text-center py-2"
                  >
                    <Paperclip className="w-5 h-5 text-indigo-500 mb-1" />
                    <span className="text-xs font-semibold text-slate-700">Click to upload receipt photo or PDF</span>
                    <span className="text-[10px] text-slate-400">PNG, JPG, PDF up to 8MB</span>
                  </label>
                </div>

                {formAttachments.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {formAttachments.map((att, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 bg-indigo-50/60 rounded-lg border border-indigo-200 text-xs"
                      >
                        <span className="font-semibold text-indigo-900 truncate max-w-xs">{att.name}</span>
                        <button
                          type="button"
                          onClick={() => setFormAttachments((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition cursor-pointer"
                >
                  {editingExpense ? 'Save Changes' : 'Record Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CATEGORY MANAGER MODAL */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 flex flex-col max-h-[85vh]">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Tag className="w-4 h-4 text-indigo-400" />
                  <span>Manage Expense Categories</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Define your own categories for custom tracking & analytics
                </p>
              </div>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              {/* Add New Category Box */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                <label className="block text-xs font-bold text-slate-800">
                  + Add Custom Category
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Category name (e.g. Customs, Marketing)"
                    value={modalCategoryName}
                    onChange={(e) => setModalCategoryName(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!modalCategoryName.trim()) return;
                      onAddCategory(modalCategoryName.trim(), modalCategoryColor);
                      setModalCategoryName('');
                    }}
                    disabled={!modalCategoryName.trim()}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg cursor-pointer transition"
                  >
                    Add
                  </button>
                </div>

                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-400 font-medium">Color:</span>
                  {PRESET_COLORS.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setModalCategoryColor(col)}
                      style={{ backgroundColor: col }}
                      className={`w-4 h-4 rounded-full transition-transform cursor-pointer ${
                        modalCategoryColor === col ? 'scale-125 ring-2 ring-indigo-600 ring-offset-1' : ''
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Existing Categories List */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Active Categories ({categories.length})
                </span>
                {categories.map((cat) => {
                  const expenseCount = expenses.filter((e) => e.category.toLowerCase() === cat.name.toLowerCase()).length;

                  return (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50 text-xs transition"
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: cat.color || '#6366F1' }}
                        />
                        <span className="font-semibold text-slate-800 truncate">{cat.name}</span>
                        {cat.isDefault && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-medium">
                            Default
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400 font-mono">
                          {expenseCount} {expenseCount === 1 ? 'expense' : 'expenses'}
                        </span>
                        {!cat.isDefault && (
                          <button
                            onClick={() => onDeleteCategory(cat.id)}
                            title="Delete Category"
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 text-right">
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECEIPT PREVIEW MODAL */}
      {viewingReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2 truncate">
                <Paperclip className="w-4 h-4 text-indigo-400" />
                <span className="font-bold text-sm truncate">{viewingReceipt.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadAttachment(viewingReceipt)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
                <button
                  onClick={() => setViewingReceipt(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 flex-1 overflow-auto bg-slate-100 flex items-center justify-center min-h-[300px]">
              {viewingReceipt.type.includes('image') || viewingReceipt.dataUrl.startsWith('data:image') ? (
                <img
                  src={viewingReceipt.dataUrl}
                  alt={viewingReceipt.name}
                  className="max-h-[70vh] object-contain rounded-lg shadow-sm"
                />
              ) : viewingReceipt.type.includes('pdf') || viewingReceipt.dataUrl.startsWith('data:application/pdf') ? (
                <iframe
                  src={viewingReceipt.dataUrl}
                  title={viewingReceipt.name}
                  className="w-full h-[65vh] rounded-lg border border-slate-300"
                />
              ) : (
                <div className="text-center p-8">
                  <FileText className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">{viewingReceipt.name}</p>
                  <p className="text-xs text-slate-400 mt-1">Binary file preview not available</p>
                  <button
                    onClick={() => downloadAttachment(viewingReceipt)}
                    className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download File</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {expenseToDelete && (
        <DeleteConfirmModal
          isOpen={true}
          title="Delete Expense Record?"
          message={`Are you sure you want to delete the expense "${expenseToDelete.title}" for ${formatCurrency(expenseToDelete.amount)}? This action cannot be undone.`}
          onConfirm={() => {
            onDeleteExpense(expenseToDelete.id);
            setExpenseToDelete(null);
          }}
          onCancel={() => setExpenseToDelete(null)}
        />
      )}
    </div>
  );
};
