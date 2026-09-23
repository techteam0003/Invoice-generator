import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FilePlus2,
  Building,
  Plus,
  Trash2,
  Calculator,
  Eye,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Percent,
  Sparkles,
  Car,
  ChevronRight,
  Layers,
  Edit3,
  Save,
  XCircle,
  Clock,
  CreditCard,
  Paperclip,
  UploadCloud,
  FileText,
  Download,
  Image as ImageIcon
} from 'lucide-react';
import { Invoice, InvoiceItem, InvoiceStatus, Vendor, TaxType, TaxConfig, PaymentRecord, InvoiceAttachment } from '../types';
import { MasterInvoiceSheet } from './MasterInvoiceSheet';
import { getTodayDateString, formatDateToDisplay, formatRawAmount, formatCurrency } from '../utils/formatters';

interface CreateInvoiceViewProps {
  vendors: Vendor[];
  taxConfig: TaxConfig;
  initialVendor?: Vendor | null;
  editingInvoice?: Invoice | null;
  onSaveInvoice: (invoiceData: Omit<Invoice, 'id' | 'createdAt'>) => Invoice | null;
  onUpdateInvoice?: (id: string, invoiceData: Partial<Invoice>) => Invoice | null;
  onCancelEdit?: () => void;
  onOpenVendorModal: () => void;
  isInvoiceNumberTaken: (num: string, excludeId?: string) => boolean;
  onInvoiceCreated: (invoice: Invoice) => void;
  onInvoiceUpdated?: (invoice: Invoice) => void;
}

export const CreateInvoiceView: React.FC<CreateInvoiceViewProps> = ({
  vendors,
  taxConfig,
  initialVendor,
  editingInvoice,
  onSaveInvoice,
  onUpdateInvoice,
  onCancelEdit,
  onOpenVendorModal,
  isInvoiceNumberTaken,
  onInvoiceCreated,
  onInvoiceUpdated,
}) => {
  // 1. Manual Invoice Number & Meta
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(getTodayDateString());
  const [dueDate, setDueDate] = useState('Net 7 days');

  // Status & Payment Management
  const [invoiceStatus, setInvoiceStatus] = useState<InvoiceStatus>('OPEN');
  const [paymentDate, setPaymentDate] = useState<string>(getTodayDateString());
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Bank Transfer');
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [paymentsList, setPaymentsList] = useState<PaymentRecord[]>([]);

  // Attachments (Images & PDFs)
  const [attachments, setAttachments] = useState<InvoiceAttachment[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const attachmentFileInputRef = useRef<HTMLInputElement>(null);

  // 2. Vendor Selection & Bill To
  const [selectedVendorId, setSelectedVendorId] = useState<string>('');
  
  // 3. Tax Settings for this invoice
  const [taxType, setTaxType] = useState<TaxType>(taxConfig.taxType || 'HST');
  const [customTaxRate, setCustomTaxRate] = useState<number>(taxConfig.hstRate || 13.0);

  // 4. Line Items
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: 'item_' + Date.now(),
      title: 'Vehicle Sourcing/Locating Service Fee',
      subDetails: '2024 Subaru Crosstrek — VIN: 393477',
      quantity: 1,
      rate: 400.00,
      amount: 400.00,
    }
  ]);

  // Notes
  const [notes, setNotes] = useState('');

  // UI state
  const [activeViewMode, setActiveViewMode] = useState<'editor' | 'preview' | 'split'>('editor');
  const [formError, setFormError] = useState<string | null>(null);

  // Populate or reset form fields when editingInvoice or defaults change
  useEffect(() => {
    if (editingInvoice) {
      setInvoiceNumber(editingInvoice.invoiceNumber || '');
      setInvoiceDate(editingInvoice.invoiceDate || getTodayDateString());
      setDueDate(editingInvoice.dueDate || 'Net 7 days');
      setInvoiceStatus(editingInvoice.status || 'OPEN');
      setPaymentDate(editingInvoice.paymentDate || getTodayDateString());
      
      const existingPayments = editingInvoice.payments || [];
      setPaymentsList(existingPayments);
      if (editingInvoice.amountPaid !== undefined) {
        setAmountPaid(editingInvoice.amountPaid.toString());
      } else if (existingPayments.length > 0) {
        const sum = existingPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
        setAmountPaid(sum.toString());
      } else {
        setAmountPaid(editingInvoice.status === 'PAID' ? editingInvoice.grandTotal.toString() : '');
      }

      if (existingPayments.length > 0) {
        const latest = existingPayments[existingPayments.length - 1];
        setPaymentMethod(latest.method || 'Bank Transfer');
        setPaymentReference(latest.reference || '');
        setPaymentNotes(latest.notes || '');
      }

      setAttachments(editingInvoice.attachments || []);
      setSelectedVendorId(editingInvoice.vendorId || '');
      setTaxType(editingInvoice.taxType || 'HST');
      setCustomTaxRate(editingInvoice.taxRate || 13.0);
      setItems(
        editingInvoice.items && editingInvoice.items.length > 0
          ? editingInvoice.items.map((it) => ({ ...it }))
          : [
              {
                id: 'item_' + Date.now(),
                title: 'Vehicle Sourcing/Locating Service Fee',
                subDetails: '',
                quantity: 1,
                rate: 400.0,
                amount: 400.0,
              },
            ]
      );
      setNotes(editingInvoice.notes || '');
      setFormError(null);
    } else {
      if (initialVendor) {
        setSelectedVendorId(initialVendor.id);
      } else if (vendors.length > 0 && !selectedVendorId) {
        setSelectedVendorId(vendors[0].id);
      }
      setInvoiceStatus('OPEN');
      setPaymentDate(getTodayDateString());
      setAmountPaid('');
      setPaymentMethod('Bank Transfer');
      setPaymentReference('');
      setPaymentNotes('');
      setPaymentsList([]);
      setAttachments([]);
      if (!invoiceNumber) {
        const yearSuffix = new Date().getFullYear().toString().slice(-2);
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        setInvoiceNumber(`AR${yearSuffix}-${randomNum}`);
      }
    }
  }, [editingInvoice]);

  // Handle vendor auto-selection for new invoices
  useEffect(() => {
    if (!editingInvoice) {
      if (initialVendor) {
        setSelectedVendorId(initialVendor.id);
      } else if (vendors.length > 0 && !selectedVendorId) {
        setSelectedVendorId(vendors[0].id);
      }
    }
  }, [initialVendor, vendors, selectedVendorId, editingInvoice]);

  // Auto-generate a sensible initial suggestion for manual invoice number for new invoices
  useEffect(() => {
    if (!editingInvoice && !invoiceNumber) {
      const yearSuffix = new Date().getFullYear().toString().slice(-2);
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      setInvoiceNumber(`AR${yearSuffix}-${randomNum}`);
    }
  }, [invoiceNumber, editingInvoice]);

  // Current selected vendor object
  const selectedVendor = useMemo(() => {
    return vendors.find((v) => v.id === selectedVendorId) || null;
  }, [vendors, selectedVendorId]);

  // Item management
  const handleAddItem = (presetVehicle?: { model: string; vin: string }) => {
    const newItem: InvoiceItem = {
      id: 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
      title: 'Vehicle Sourcing/Locating Service Fee',
      subDetails: presetVehicle ? `${presetVehicle.model} — VIN: ${presetVehicle.vin}` : '',
      quantity: 1,
      rate: 400.00,
      amount: 400.00,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      setFormError('An invoice must have at least one service item.');
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setFormError(null);
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'rate') {
          const qty = field === 'quantity' ? Number(value) : item.quantity;
          const r = field === 'rate' ? Number(value) : item.rate;
          updated.amount = Math.round((qty * r) * 100) / 100;
        }
        return updated;
      })
    );
  };

  // Calculations
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.amount || 0), 0);
  }, [items]);

  const { effectiveTaxRate, taxAmount, gstAmount, qstAmount, grandTotal } = useMemo(() => {
    let rate = 13.0;
    let gst = 0;
    let qst = 0;
    let tax = 0;

    if (taxType === 'QUEBEC') {
      rate = 14.975;
      gst = Math.round(subtotal * 0.05 * 100) / 100;
      qst = Math.round(subtotal * 0.09975 * 100) / 100;
      tax = Math.round((gst + qst) * 100) / 100;
    } else if (taxType === 'CUSTOM') {
      rate = Number(customTaxRate) || 0;
      tax = Math.round((subtotal * (rate / 100)) * 100) / 100;
    } else {
      // Default HST (13%)
      rate = 13.0;
      tax = Math.round((subtotal * (rate / 100)) * 100) / 100;
    }

    const total = Math.round((subtotal + tax) * 100) / 100;

    return {
      effectiveTaxRate: rate,
      taxAmount: tax,
      gstAmount: gst,
      qstAmount: qst,
      grandTotal: total,
    };
  }, [subtotal, taxType, customTaxRate]);

  // File Upload Handlers for Attachments (Supports multiple files at once)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;

    const oversizedFiles: string[] = [];
    const validFiles: File[] = files.filter((file: File) => {
      if (file.size > 1.5 * 1024 * 1024) {
        oversizedFiles.push(file.name);
        return false;
      }
      return true;
    });

    if (oversizedFiles.length > 0) {
      setAttachmentError(`Skipped ${oversizedFiles.length} file(s) exceeding 1.5MB limit: ${oversizedFiles.join(', ')}`);
    } else {
      setAttachmentError(null);
    }

    if (validFiles.length === 0) {
      if (attachmentFileInputRef.current) attachmentFileInputRef.current.value = '';
      return;
    }

    const readPromises = validFiles.map((file: File) => {
      return new Promise<InvoiceAttachment>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          resolve({
            id: 'att_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
            name: file.name,
            size: file.size,
            type: file.type || 'application/octet-stream',
            dataUrl,
            uploadedAt: new Date().toISOString(),
          });
        };
        reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readPromises)
      .then((newAttachments) => {
        setAttachments((prev) => [...prev, ...newAttachments]);
        if (attachmentFileInputRef.current) attachmentFileInputRef.current.value = '';
      })
      .catch(() => {
        setAttachmentError('Failed to process one or more files. Please try again.');
        if (attachmentFileInputRef.current) attachmentFileInputRef.current.value = '';
      });
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // Payment Calculation based on status
  const { computedPaid, computedBalance, resolvedPayments } = useMemo(() => {
    if (invoiceStatus === 'OPEN') {
      return { computedPaid: 0, computedBalance: grandTotal, resolvedPayments: [] };
    }
    if (invoiceStatus === 'PAID') {
      const baseList: PaymentRecord[] = paymentsList.length > 0 ? paymentsList : [
        {
          id: 'pmt_' + Date.now(),
          amount: grandTotal,
          date: paymentDate || invoiceDate,
          method: paymentMethod || 'Bank Transfer',
          reference: paymentReference.trim() || undefined,
          notes: paymentNotes.trim() || undefined,
          recordedAt: new Date().toISOString(),
        }
      ];
      return { computedPaid: grandTotal, computedBalance: 0, resolvedPayments: baseList };
    }

    // PARTIALLY_PAID
    const numPaid = parseFloat(amountPaid) || 0;
    const clampedPaid = Math.min(grandTotal, Math.max(0, numPaid));
    const balance = Math.max(0, grandTotal - clampedPaid);

    let list: PaymentRecord[] = paymentsList;
    if (list.length === 0 || (list.length === 1 && numPaid > 0)) {
      list = [
        {
          id: list[0]?.id || ('pmt_' + Date.now()),
          amount: clampedPaid,
          date: paymentDate || invoiceDate,
          method: paymentMethod || 'Bank Transfer',
          reference: paymentReference.trim() || undefined,
          notes: paymentNotes.trim() || undefined,
          recordedAt: list[0]?.recordedAt || new Date().toISOString(),
        }
      ];
    }

    return { computedPaid: clampedPaid, computedBalance: balance, resolvedPayments: list };
  }, [
    invoiceStatus,
    amountPaid,
    grandTotal,
    paymentDate,
    paymentMethod,
    paymentReference,
    paymentNotes,
    paymentsList,
    invoiceDate
  ]);

  // Draft invoice for live preview
  const draftInvoice: Invoice = useMemo(() => {
    return {
      id: editingInvoice ? editingInvoice.id : 'draft-preview',
      invoiceNumber: invoiceNumber.trim() || 'AR26-DRAFT',
      invoiceDate: invoiceDate,
      dueDate: dueDate,
      vendorId: selectedVendorId,
      vendor: {
        companyName: selectedVendor?.companyName || 'SELECTED VENDOR NAME',
        address: selectedVendor?.address || 'Vendor Address Details',
        phone: selectedVendor?.phone,
        email: selectedVendor?.email,
      },
      items,
      subtotal,
      taxType,
      taxRate: effectiveTaxRate,
      taxAmount,
      gstAmount: taxType === 'QUEBEC' ? gstAmount : undefined,
      qstAmount: taxType === 'QUEBEC' ? qstAmount : undefined,
      grandTotal,
      status: invoiceStatus,
      paymentDate: invoiceStatus !== 'OPEN' ? (paymentDate || invoiceDate) : undefined,
      createdAt: editingInvoice ? editingInvoice.createdAt : new Date().toISOString(),
      notes,
      payments: resolvedPayments,
      amountPaid: computedPaid,
      balanceDue: computedBalance,
      attachments,
    };
  }, [
    editingInvoice,
    invoiceNumber,
    invoiceDate,
    dueDate,
    invoiceStatus,
    paymentDate,
    selectedVendorId,
    selectedVendor,
    items,
    subtotal,
    taxType,
    effectiveTaxRate,
    taxAmount,
    gstAmount,
    qstAmount,
    grandTotal,
    notes,
    resolvedPayments,
    computedPaid,
    computedBalance,
    attachments,
  ]);

  // Validation and Generation / Updating
  const handleGenerateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanNumber = invoiceNumber.trim();
    if (!cleanNumber) {
      setFormError('Please enter an Invoice Number.');
      return;
    }

    if (isInvoiceNumberTaken(cleanNumber, editingInvoice?.id)) {
      setFormError(`Invoice Number "${cleanNumber}" is already in use. Please enter a unique invoice number.`);
      return;
    }

    if (!selectedVendor) {
      setFormError('Please select a vendor or add a new vendor in the Bill To section.');
      return;
    }

    if (items.length === 0) {
      setFormError('Please add at least one service item to the invoice.');
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.title.trim()) {
        setFormError(`Service item #${i + 1} requires a description title.`);
        return;
      }
      if (item.quantity <= 0) {
        setFormError(`Service item #${i + 1} must have a quantity greater than 0.`);
        return;
      }
      if (item.rate < 0) {
        setFormError(`Service item #${i + 1} rate cannot be negative.`);
        return;
      }
    }

    if (invoiceStatus === 'PARTIALLY_PAID') {
      const numPaid = parseFloat(amountPaid);
      if (isNaN(numPaid) || numPaid <= 0) {
        setFormError('For a partially paid invoice, please enter the partial amount received (greater than $0.00).');
        return;
      }
      if (numPaid >= grandTotal) {
        setFormError('Partial payment amount cannot equal or exceed the grand total. Choose "PAID IN FULL" instead.');
        return;
      }
    }

    // Prepare clean invoice payload
    const processedItems = items.map((item) => ({
      id: item.id,
      title: item.title.trim(),
      subDetails: item.subDetails?.trim() || undefined,
      quantity: Number(item.quantity),
      rate: Number(item.rate),
      amount: Math.round(Number(item.quantity) * Number(item.rate) * 100) / 100,
    }));

    if (editingInvoice && onUpdateInvoice) {
      const updatedData: Partial<Invoice> = {
        invoiceNumber: cleanNumber,
        invoiceDate: invoiceDate,
        dueDate: dueDate,
        vendorId: selectedVendor.id,
        vendor: {
          companyName: selectedVendor.companyName,
          address: selectedVendor.address,
          phone: selectedVendor.phone,
          email: selectedVendor.email,
        },
        items: processedItems,
        subtotal,
        taxType,
        taxRate: effectiveTaxRate,
        taxAmount,
        gstAmount: taxType === 'QUEBEC' ? gstAmount : undefined,
        qstAmount: taxType === 'QUEBEC' ? qstAmount : undefined,
        grandTotal,
        status: invoiceStatus,
        paymentDate: invoiceStatus !== 'OPEN' ? (paymentDate || invoiceDate) : undefined,
        notes: notes.trim() || undefined,
        payments: resolvedPayments,
        amountPaid: computedPaid,
        balanceDue: computedBalance,
        attachments,
      };

      const updated = onUpdateInvoice(editingInvoice.id, updatedData);
      if (updated && onInvoiceUpdated) {
        onInvoiceUpdated(updated);
      }
    } else {
      const invoiceData: Omit<Invoice, 'id' | 'createdAt'> = {
        invoiceNumber: cleanNumber,
        invoiceDate: invoiceDate,
        dueDate: dueDate,
        vendorId: selectedVendor.id,
        vendor: {
          companyName: selectedVendor.companyName,
          address: selectedVendor.address,
          phone: selectedVendor.phone,
          email: selectedVendor.email,
        },
        items: processedItems,
        subtotal,
        taxType,
        taxRate: effectiveTaxRate,
        taxAmount,
        gstAmount: taxType === 'QUEBEC' ? gstAmount : undefined,
        qstAmount: taxType === 'QUEBEC' ? qstAmount : undefined,
        grandTotal,
        status: invoiceStatus,
        paymentDate: invoiceStatus !== 'OPEN' ? (paymentDate || invoiceDate) : undefined,
        notes: notes.trim() || undefined,
        payments: resolvedPayments,
        amountPaid: computedPaid,
        balanceDue: computedBalance,
        attachments,
      };

      const created = onSaveInvoice(invoiceData);
      if (created) {
        onInvoiceCreated(created);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2">
            {editingInvoice ? (
              <Edit3 className="w-6 h-6 text-amber-600" />
            ) : (
              <FilePlus2 className="w-6 h-6 text-indigo-600" />
            )}
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              {editingInvoice ? `Edit Invoice: ${editingInvoice.invoiceNumber}` : 'Create & Generate Invoice'}
            </h1>
            {editingInvoice && (
              <span className="px-2.5 py-0.5 text-[11px] font-bold bg-amber-100 text-amber-800 rounded-full border border-amber-200">
                Editing
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {editingInvoice
              ? 'Update details, items, or taxes for this invoice. Changes are saved to Firestore.'
              : 'Create an official invoice formatted to the 9572-1049 QUÉBEC INC. master reference template.'}
          </p>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center bg-slate-200/80 p-1 rounded-lg text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveViewMode('editor')}
            className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
              activeViewMode === 'editor'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Editor Form
          </button>
          <button
            type="button"
            onClick={() => setActiveViewMode('split')}
            className={`hidden lg:block px-3 py-1.5 rounded-md transition cursor-pointer ${
              activeViewMode === 'split'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Split View
          </button>
          <button
            type="button"
            onClick={() => setActiveViewMode('preview')}
            className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
              activeViewMode === 'preview'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Live PDF Preview
          </button>
        </div>
      </div>

      {/* Editing Mode Banner */}
      {editingInvoice && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 text-xs shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <span>
              You are modifying <strong>Invoice #{editingInvoice.invoiceNumber}</strong> (Billed to {editingInvoice.vendor?.companyName || 'Vendor'}).
            </span>
          </div>
          {onCancelEdit && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="self-start sm:self-auto px-3 py-1 bg-white hover:bg-amber-100/80 border border-amber-300 text-amber-900 rounded-lg font-semibold text-xs transition cursor-pointer flex items-center gap-1.5"
            >
              <XCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>Cancel Editing</span>
            </button>
          )}
        </div>
      )}

      {formError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3 animate-shake">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          <span className="font-semibold">{formError}</span>
        </div>
      )}

      {/* Main Container */}
      <div className={`grid gap-6 ${activeViewMode === 'split' ? 'lg:grid-cols-12' : 'grid-cols-1'}`}>
        {/* LEFT COLUMN: FORM */}
        {(activeViewMode === 'editor' || activeViewMode === 'split') && (
          <div className={activeViewMode === 'split' ? 'lg:col-span-6' : 'w-full'}>
            <form onSubmit={handleGenerateInvoice} className="space-y-6">
              {/* Card 1: Invoice Meta Details */}
              <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px]">
                      1
                    </span>
                    Invoice Details
                  </h3>
                  <span className="text-[11px] text-slate-400">Fixed Company Header applied</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Manual Invoice Number */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Invoice Number <span className="text-rose-600">*</span>
                    </label>
                    <input
                      id="invoice-number-input"
                      type="text"
                      required
                      placeholder="e.g. AR26-0812"
                      value={invoiceNumber}
                      onChange={(e) => {
                        setFormError(null);
                        setInvoiceNumber(e.target.value.toUpperCase());
                      }}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 uppercase"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Manually entered (must be unique)
                    </span>
                  </div>

                  {/* Invoice Date */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Invoice Date <span className="text-rose-600">*</span>
                    </label>
                    <input
                      id="invoice-date-input"
                      type="date"
                      required
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Formatted: {formatDateToDisplay(invoiceDate)}
                    </span>
                  </div>

                  {/* Payment Due Terms */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Payment Due Date
                    </label>
                    <select
                      id="payment-due-date-select"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="Net 7 days">Net 7 days</option>
                      <option value="Net 15 days">Net 15 days</option>
                      <option value="Net 30 days">Net 30 days</option>
                      <option value="Due on Receipt">Due on Receipt</option>
                      <option value="Net 60 days">Net 60 days</option>
                    </select>
                  </div>
                </div>

                {/* Payment Status & Payment Tracking Selector */}
                <div className="pt-3 border-t border-slate-100">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Payment Status
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setInvoiceStatus('OPEN');
                            setAmountPaid('');
                          }}
                          className={`py-2 px-3 rounded-lg text-xs font-bold transition border cursor-pointer flex items-center justify-center gap-1.5 ${
                            invoiceStatus === 'OPEN'
                              ? 'bg-amber-50 text-amber-800 border-amber-300 ring-2 ring-amber-400/30'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>OPEN / UNPAID</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setInvoiceStatus('PARTIALLY_PAID');
                            if (!amountPaid || parseFloat(amountPaid) <= 0) {
                              setAmountPaid((grandTotal * 0.5).toFixed(2));
                            }
                            if (!paymentDate) {
                              setPaymentDate(getTodayDateString());
                            }
                          }}
                          className={`py-2 px-3 rounded-lg text-xs font-bold transition border cursor-pointer flex items-center justify-center gap-1.5 ${
                            invoiceStatus === 'PARTIALLY_PAID'
                              ? 'bg-blue-50 text-blue-800 border-blue-300 ring-2 ring-blue-400/30'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                          <span>PARTIALLY PAID</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setInvoiceStatus('PAID');
                            setAmountPaid(grandTotal.toFixed(2));
                            if (!paymentDate) {
                              setPaymentDate(getTodayDateString());
                            }
                          }}
                          className={`py-2 px-3 rounded-lg text-xs font-bold transition border cursor-pointer flex items-center justify-center gap-1.5 ${
                            invoiceStatus === 'PAID'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-2 ring-emerald-400/30'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>PAID IN FULL</span>
                        </button>
                      </div>
                    </div>

                    {/* Partial or Full Payment Fields */}
                    {invoiceStatus !== 'OPEN' && (
                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Amount Paid / Received */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-xs font-bold text-slate-700">
                                {invoiceStatus === 'PARTIALLY_PAID' ? 'Partial Amount Received ($)*' : 'Total Amount Paid ($)*'}
                              </label>
                              {invoiceStatus === 'PARTIALLY_PAID' && (
                                <span className="text-[10px] text-slate-500">
                                  Total Billed: ${formatRawAmount(grandTotal)}
                                </span>
                              )}
                            </div>
                            <div className="relative">
                              <span className="absolute left-3 top-2 text-slate-400 text-xs">$</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                max={grandTotal}
                                disabled={invoiceStatus === 'PAID'}
                                value={invoiceStatus === 'PAID' ? grandTotal.toFixed(2) : amountPaid}
                                onChange={(e) => setAmountPaid(e.target.value)}
                                placeholder="0.00"
                                className="w-full pl-6 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>
                            {invoiceStatus === 'PARTIALLY_PAID' && (
                              <div className="mt-1 flex items-center justify-between text-[11px]">
                                <span className="text-slate-500">Remaining Balance:</span>
                                <span className="font-mono font-bold text-amber-700">
                                  ${formatRawAmount(computedBalance)}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Payment Date */}
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Payment Date Received*
                            </label>
                            <input
                              type="date"
                              value={paymentDate}
                              onChange={(e) => setPaymentDate(e.target.value)}
                              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Payment Method */}
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Payment Method
                            </label>
                            <select
                              value={paymentMethod}
                              onChange={(e) => setPaymentMethod(e.target.value)}
                              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                              <option value="Bank Transfer">Bank Transfer</option>
                              <option value="Interac / e-Transfer">Interac / e-Transfer</option>
                              <option value="Cheque">Cheque</option>
                              <option value="Cash">Cash</option>
                              <option value="Credit Card">Credit Card</option>
                              <option value="Debit Card">Debit Card</option>
                              <option value="Wire Transfer">Wire Transfer</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>

                          {/* Reference / Cheque # */}
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Reference / Cheque # (Optional)
                            </label>
                            <input
                              type="text"
                              value={paymentReference}
                              onChange={(e) => setPaymentReference(e.target.value)}
                              placeholder="e.g. Cheque #558, e-Transfer confirmation"
                              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Card 2: Bill To / Vendor Selection */}
              <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px]">
                      2
                    </span>
                    Billed To (Vendor / Client)
                  </h3>
                  <button
                    type="button"
                    onClick={onOpenVendorModal}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add New Vendor</span>
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Select Vendor <span className="text-rose-600">*</span>
                  </label>
                  <select
                    id="vendor-select-dropdown"
                    required
                    value={selectedVendorId}
                    onChange={(e) => {
                      setFormError(null);
                      setSelectedVendorId(e.target.value);
                    }}
                    className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="">-- Choose a Saved Vendor --</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.companyName} — {v.address}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Auto-populated Bill To details box */}
                {selectedVendor ? (
                  <div className="p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-lg text-xs space-y-1">
                    <p className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider">
                      Auto-Populated on Invoice:
                    </p>
                    <p className="font-bold text-slate-900 text-sm">
                      {selectedVendor.companyName}
                    </p>
                    <p className="text-slate-700">{selectedVendor.address}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-600 text-[11px] pt-1">
                      {selectedVendor.phone && <span>Tel: {selectedVendor.phone}</span>}
                      {selectedVendor.email && <span>Email: {selectedVendor.email}</span>}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-xs text-slate-400 text-center">
                    Select a vendor above to auto-populate Bill To information.
                  </div>
                )}
              </div>

              {/* Card 3: Services & Line Items */}
              <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px]">
                      3
                    </span>
                    Services Provided / Line Items
                  </h3>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddItem()}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Row</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleAddItem({
                          model: '2024 Honda CR-V',
                          vin: Math.floor(100000 + Math.random() * 900000).toString(),
                        })
                      }
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg transition flex items-center gap-1 cursor-pointer"
                    >
                      <Car className="w-3.5 h-3.5" />
                      <span>+ Vehicle Preset</span>
                    </button>
                  </div>
                </div>

                {/* Items List */}
                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px]">
                            {index + 1}
                          </span>
                          Service Line #{index + 1}
                        </span>
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-rose-500 hover:text-rose-700 p-1 hover:bg-rose-50 rounded transition cursor-pointer"
                            title="Remove row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                        {/* Title & Description */}
                        <div className="sm:col-span-6 space-y-1.5">
                          <input
                            type="text"
                            placeholder="Service Title (e.g. Vehicle Sourcing/Locating Service Fee)"
                            value={item.title}
                            onChange={(e) => handleUpdateItem(item.id, 'title', e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          <input
                            type="text"
                            placeholder="Vehicle & VIN (e.g. 2024 Subaru Crosstrek — VIN: 393477)"
                            value={item.subDetails || ''}
                            onChange={(e) => handleUpdateItem(item.id, 'subDetails', e.target.value)}
                            className="w-full px-2.5 py-1.5 text-[11px] bg-white border border-slate-300 rounded text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>

                        {/* Quantity */}
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                            Qty
                          </label>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={item.quantity}
                            onChange={(e) =>
                              handleUpdateItem(item.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))
                            }
                            className="w-full px-2.5 py-1.5 text-xs text-center bg-white border border-slate-300 rounded font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>

                        {/* Rate ($) */}
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                            Rate ($)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.rate}
                            onChange={(e) =>
                              handleUpdateItem(item.id, 'rate', Math.max(0, parseFloat(e.target.value) || 0))
                            }
                            className="w-full px-2.5 py-1.5 text-xs text-right bg-white border border-slate-300 rounded font-mono font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>

                        {/* Amount ($) Auto Calculated */}
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold text-slate-500 mb-0.5 text-right">
                            Amount ($)
                          </label>
                          <div className="w-full px-2.5 py-1.5 text-xs text-right bg-slate-100 border border-slate-200 rounded font-mono font-bold text-slate-900">
                            ${formatRawAmount(item.amount)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 4: Tax Calculation & Summary */}
              <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px]">
                      4
                    </span>
                    Tax & Totals Calculation
                  </h3>
                  <span className="text-[11px] text-slate-400">Live Auto-Calculations</span>
                </div>

                {/* Tax Mode Selector */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Applicable Tax Mode
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* HST 13% */}
                    <button
                      type="button"
                      onClick={() => setTaxType('HST')}
                      className={`p-3 rounded-lg border text-left transition cursor-pointer ${
                        taxType === 'HST'
                          ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 ring-1 ring-indigo-600'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="font-bold text-xs">HST (13%)</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Ontario Standard</div>
                    </button>

                    {/* Quebec 14.975% */}
                    <button
                      type="button"
                      onClick={() => setTaxType('QUEBEC')}
                      className={`p-3 rounded-lg border text-left transition cursor-pointer ${
                        taxType === 'QUEBEC'
                          ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 ring-1 ring-indigo-600'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="font-bold text-xs">Quebec (14.975%)</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">GST 5% + QST 9.975%</div>
                    </button>

                    {/* Custom Tax */}
                    <button
                      type="button"
                      onClick={() => setTaxType('CUSTOM')}
                      className={`p-3 rounded-lg border text-left transition cursor-pointer ${
                        taxType === 'CUSTOM'
                          ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 ring-1 ring-indigo-600'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="font-bold text-xs">Custom Tax %</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Adjustable rate</div>
                    </button>
                  </div>

                  {taxType === 'CUSTOM' && (
                    <div className="mt-2 flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
                        Tax Percentage (%):
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={customTaxRate}
                        onChange={(e) => setCustomTaxRate(parseFloat(e.target.value) || 0)}
                        className="w-24 px-2 py-1 text-xs bg-white border border-slate-300 rounded font-mono font-bold"
                      />
                      <span className="text-[11px] text-slate-500">Updates totals automatically</span>
                    </div>
                  )}
                </div>

                {/* Totals Summary */}
                <div className="p-4 bg-slate-900 text-white rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>Subtotal:</span>
                    <span className="font-mono font-semibold">${formatRawAmount(subtotal)}</span>
                  </div>

                  {taxType === 'QUEBEC' ? (
                    <>
                      <div className="flex justify-between text-slate-400 text-[11px]">
                        <span>• GST (5.000%):</span>
                        <span className="font-mono">${formatRawAmount(gstAmount)}</span>
                      </div>
                      <div className="flex justify-between text-slate-400 text-[11px]">
                        <span>• QST (9.975%):</span>
                        <span className="font-mono">${formatRawAmount(qstAmount)}</span>
                      </div>
                      <div className="flex justify-between text-slate-300 pt-1 border-t border-slate-800">
                        <span>Total Quebec Tax (14.975%):</span>
                        <span className="font-mono font-semibold">${formatRawAmount(taxAmount)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-slate-300">
                      <span>Tax ({effectiveTaxRate}%):</span>
                      <span className="font-mono font-semibold">${formatRawAmount(taxAmount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2 border-t-2 border-indigo-500 text-sm font-bold text-white">
                    <span>Grand Total Due:</span>
                    <span className="text-base font-mono text-emerald-400">
                      ${formatRawAmount(grandTotal)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 5: Attachments (Images & PDFs) & Notes */}
              <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px]">
                      5
                    </span>
                    Attachments & Supporting Documents
                  </h3>
                  <span className="text-[11px] text-slate-400">PDFs, Receipts, Images</span>
                </div>

                {/* Upload area */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 border border-dashed border-slate-300 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                        <Paperclip className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">Upload Attachments (Images or PDFs)</p>
                        <p className="text-[11px] text-slate-500">Supports PNG, JPG, JPEG, WEBP, and PDF files (select one or multiple files, up to 1.5MB each)</p>
                      </div>
                    </div>
                    <div>
                      <input
                        ref={attachmentFileInputRef}
                        type="file"
                        multiple
                        accept="image/*,application/pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="invoice-file-upload-input"
                      />
                      <label
                        htmlFor="invoice-file-upload-input"
                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition flex items-center gap-2 cursor-pointer shadow-xs inline-flex"
                      >
                        <UploadCloud className="w-4 h-4" />
                        <span>Upload Files</span>
                      </label>
                    </div>
                  </div>

                  {attachmentError && (
                    <p className="text-xs font-medium text-rose-600 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{attachmentError}</span>
                    </p>
                  )}

                  {/* Attached files list */}
                  {attachments.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      {attachments.map((att) => {
                        const isPdf = att.type?.includes('pdf') || att.name.toLowerCase().endsWith('.pdf');
                        const isImage = att.type?.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(att.name);
                        const sizeKb = Math.round(att.size / 1024);

                        return (
                          <div
                            key={att.id}
                            className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg shadow-2xs hover:border-slate-300 transition"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden border border-slate-200">
                                {isImage && att.dataUrl ? (
                                  <img src={att.dataUrl} alt={att.name} className="w-full h-full object-cover" />
                                ) : isPdf ? (
                                  <FileText className="w-5 h-5 text-rose-600" />
                                ) : (
                                  <Paperclip className="w-5 h-5 text-slate-500" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-900 truncate" title={att.name}>
                                  {att.name}
                                </p>
                                <p className="text-[10px] text-slate-500">
                                  {sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`} • {isPdf ? 'PDF' : isImage ? 'Image' : 'File'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {att.dataUrl && (
                                <a
                                  href={att.dataUrl}
                                  download={att.name}
                                  title="Download attachment"
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemoveAttachment(att.id)}
                                title="Remove attachment"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Notes */}
                  <div className="pt-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Invoice Notes / Special Remarks (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Please send payment via Interac e-Transfer or direct deposit to our bank account."
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveViewMode('preview')}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Eye className="w-4 h-4 text-indigo-600" />
                  <span>Preview Full Invoice</span>
                </button>

                <button
                  type="submit"
                  id="generate-invoice-btn"
                  className={`px-6 py-2.5 text-white text-xs font-bold rounded-lg shadow-md transition flex items-center gap-2 cursor-pointer ${
                    editingInvoice
                      ? 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 shadow-amber-600/25'
                      : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 shadow-indigo-600/25'
                  }`}
                >
                  {editingInvoice ? (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save & Update Database</span>
                    </>
                  ) : (
                    <>
                      <FileCheck className="w-4 h-4" />
                      <span>Generate & Save Invoice</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* RIGHT COLUMN / FULL PREVIEW: LIVE MASTER INVOICE SHEET */}
        {(activeViewMode === 'preview' || activeViewMode === 'split') && (
          <div className={activeViewMode === 'split' ? 'lg:col-span-6' : 'w-full'}>
            <div className="bg-slate-100 p-4 rounded-2xl border border-slate-300">
              <div className="flex items-center justify-between mb-3 px-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-indigo-600" />
                  Master Template Live Preview
                </span>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded border font-bold ${
                    invoiceStatus === 'PAID'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}
                >
                  Status: {invoiceStatus === 'PAID' ? 'PAID' : 'OPEN / UNPAID'}
                </span>
              </div>

              {/* Master invoice container */}
              <div className="overflow-x-auto shadow-lg rounded-lg">
                <MasterInvoiceSheet invoice={draftInvoice} showStatusBadge={true} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
