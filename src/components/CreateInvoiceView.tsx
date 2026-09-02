import React, { useState, useEffect, useMemo } from 'react';
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
  Layers
} from 'lucide-react';
import { Invoice, InvoiceItem, Vendor, TaxType, TaxConfig } from '../types';
import { MasterInvoiceSheet } from './MasterInvoiceSheet';
import { getTodayDateString, formatDateToDisplay, formatRawAmount, formatCurrency } from '../utils/formatters';

interface CreateInvoiceViewProps {
  vendors: Vendor[];
  taxConfig: TaxConfig;
  initialVendor?: Vendor | null;
  onSaveInvoice: (invoiceData: Omit<Invoice, 'id' | 'createdAt'>) => Invoice | null;
  onOpenVendorModal: () => void;
  isInvoiceNumberTaken: (num: string) => boolean;
  onInvoiceCreated: (invoice: Invoice) => void;
}

export const CreateInvoiceView: React.FC<CreateInvoiceViewProps> = ({
  vendors,
  taxConfig,
  initialVendor,
  onSaveInvoice,
  onOpenVendorModal,
  isInvoiceNumberTaken,
  onInvoiceCreated,
}) => {
  // 1. Manual Invoice Number & Meta
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(getTodayDateString());
  const [dueDate, setDueDate] = useState('Net 7 days');

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

  // Auto select initial vendor if provided
  useEffect(() => {
    if (initialVendor) {
      setSelectedVendorId(initialVendor.id);
    } else if (vendors.length > 0 && !selectedVendorId) {
      setSelectedVendorId(vendors[0].id);
    }
  }, [initialVendor, vendors, selectedVendorId]);

  // Auto-generate a sensible initial suggestion for manual invoice number (e.g. AR26-0813)
  useEffect(() => {
    if (!invoiceNumber) {
      const yearSuffix = new Date().getFullYear().toString().slice(-2);
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      setInvoiceNumber(`AR${yearSuffix}-${randomNum}`);
    }
  }, [invoiceNumber]);

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

  // Draft invoice for live preview
  const draftInvoice: Invoice = useMemo(() => {
    return {
      id: 'draft-preview',
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
      status: 'OPEN',
      createdAt: new Date().toISOString(),
      notes,
    };
  }, [
    invoiceNumber,
    invoiceDate,
    dueDate,
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
  ]);

  // Validation and Generation
  const handleGenerateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanNumber = invoiceNumber.trim();
    if (!cleanNumber) {
      setFormError('Please enter an Invoice Number.');
      return;
    }

    if (isInvoiceNumberTaken(cleanNumber)) {
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

    // Prepare clean invoice payload with default OPEN status
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
      items: items.map((item) => ({
        id: item.id,
        title: item.title.trim(),
        subDetails: item.subDetails?.trim() || undefined,
        quantity: Number(item.quantity),
        rate: Number(item.rate),
        amount: Math.round(Number(item.quantity) * Number(item.rate) * 100) / 100,
      })),
      subtotal,
      taxType,
      taxRate: effectiveTaxRate,
      taxAmount,
      gstAmount: taxType === 'QUEBEC' ? gstAmount : undefined,
      qstAmount: taxType === 'QUEBEC' ? qstAmount : undefined,
      grandTotal,
      status: 'OPEN', // Default OPEN status
      notes: notes.trim() || undefined,
    };

    const created = onSaveInvoice(invoiceData);
    if (created) {
      onInvoiceCreated(created);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FilePlus2 className="w-6 h-6 text-indigo-600" />
            Create & Generate Invoice
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Create an official invoice formatted to the 9572-1049 QUÉBEC INC. master reference template.
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
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-lg shadow-md shadow-indigo-600/25 transition flex items-center gap-2 cursor-pointer"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>Generate & Save Invoice</span>
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
                <span className="text-[11px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                  Status: <span className="font-bold text-amber-700">OPEN / UNPAID</span> (Default)
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
