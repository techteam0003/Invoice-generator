import React, { useState } from 'react';
import {
  X,
  CreditCard,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Calendar,
  DollarSign,
  FileText,
  Clock,
  Save
} from 'lucide-react';
import { Invoice, PaymentRecord } from '../types';
import { formatCurrency, formatDateToDisplay, getTodayDateString } from '../utils/formatters';

interface RecordPaymentModalProps {
  isOpen: boolean;
  invoice: Invoice | null;
  onClose: () => void;
  onRecordPayment: (invoiceId: string, payment: Omit<PaymentRecord, 'id' | 'recordedAt'>) => void;
  onUpdatePayment: (invoiceId: string, paymentId: string, updates: Partial<PaymentRecord>) => void;
  onDeletePayment: (invoiceId: string, paymentId: string) => void;
}

const PAYMENT_METHODS = [
  'Bank Transfer',
  'Interac / e-Transfer',
  'Cheque',
  'Cash',
  'Credit Card',
  'Debit Card',
  'Wire Transfer',
  'Other'
];

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  invoice,
  onClose,
  onRecordPayment,
  onUpdatePayment,
  onDeletePayment,
}) => {
  if (!isOpen || !invoice) return null;

  const grandTotal = invoice.grandTotal || 0;
  const payments = invoice.payments || [];
  const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const remainingBalance = Math.max(0, grandTotal - totalPaid);

  // Form State for new payment
  const [amount, setAmount] = useState<string>(remainingBalance > 0 ? remainingBalance.toFixed(2) : '');
  const [paymentDate, setPaymentDate] = useState<string>(getTodayDateString());
  const [method, setMethod] = useState<string>('Bank Transfer');
  const [reference, setReference] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  // Editing existing payment state
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [editDate, setEditDate] = useState<string>('');
  const [editMethod, setEditMethod] = useState<string>('Bank Transfer');
  const [editRef, setEditRef] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editError, setEditError] = useState<string | null>(null);

  const handleStartEdit = (p: PaymentRecord) => {
    setEditingPaymentId(p.id);
    setEditAmount(p.amount.toString());
    setEditDate(p.date || getTodayDateString());
    setEditMethod(p.method || 'Bank Transfer');
    setEditRef(p.reference || '');
    setEditNotes(p.notes || '');
    setEditError(null);
  };

  const handleCancelEdit = () => {
    setEditingPaymentId(null);
    setEditError(null);
  };

  const handleSaveEdit = (paymentId: string) => {
    const numAmount = parseFloat(editAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setEditError('Please enter a valid positive payment amount.');
      return;
    }
    if (!editDate) {
      setEditError('Please select a payment date.');
      return;
    }

    onUpdatePayment(invoice.id, paymentId, {
      amount: numAmount,
      date: editDate,
      method: editMethod,
      reference: editRef.trim() || undefined,
      notes: editNotes.trim() || undefined,
    });

    setEditingPaymentId(null);
    setEditError(null);
  };

  const handleSubmitNewPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError('Please enter a valid payment amount greater than $0.00');
      return;
    }

    if (!paymentDate) {
      setFormError('Please choose the date when payment was received.');
      return;
    }

    onRecordPayment(invoice.id, {
      amount: numAmount,
      date: paymentDate,
      method,
      reference: reference.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    // Reset form
    setReference('');
    setNotes('');
    setFormError(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Record & Update Payment
                <span className="text-xs font-mono font-normal text-slate-400">#{invoice.invoiceNumber}</span>
              </h2>
              <p className="text-xs text-slate-400">
                {invoice.vendor?.companyName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Summary Status Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-800/70 border border-slate-700/80 rounded-xl p-3">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Total Billed</span>
              <span className="text-lg font-bold font-mono text-white">{formatCurrency(grandTotal)}</span>
            </div>
            <div className="bg-emerald-950/40 border border-emerald-700/50 rounded-xl p-3">
              <span className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider block">Total Received</span>
              <span className="text-lg font-bold font-mono text-emerald-300">{formatCurrency(totalPaid)}</span>
            </div>
            <div className={`rounded-xl p-3 border ${
              remainingBalance <= 0.001 
                ? 'bg-emerald-900/30 border-emerald-600/40 text-emerald-300' 
                : 'bg-amber-950/40 border-amber-600/50 text-amber-300'
            }`}>
              <span className="text-[11px] font-medium uppercase tracking-wider block opacity-80">Remaining Balance</span>
              <span className="text-lg font-bold font-mono">
                {remainingBalance <= 0.001 ? '$0.00 (PAID)' : formatCurrency(remainingBalance)}
              </span>
            </div>
          </div>

          {/* Form to Add New Payment */}
          <div className="bg-slate-800/40 border border-slate-700/70 rounded-xl p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-emerald-400" />
              Add Payment Received
            </h3>

            {formError && (
              <div className="mb-3 p-2.5 bg-rose-500/15 border border-rose-500/30 rounded-lg text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitNewPayment} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Amount */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-slate-300">Amount Received ($)*</label>
                    {remainingBalance > 0 && (
                      <button
                        type="button"
                        onClick={() => setAmount(remainingBalance.toFixed(2))}
                        className="text-[10px] text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer"
                      >
                        Set Full Balance (${remainingBalance.toFixed(2)})
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 text-sm">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-7 pr-3 text-sm text-white font-mono placeholder:text-slate-500 focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Date */}
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Date Received*</label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-sm text-white focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Method */}
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Payment Method</label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-sm text-white focus:outline-hidden focus:border-emerald-500"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Reference / Cheque # */}
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Reference / Cheque # (Optional)</label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="e.g. Cheque #4928, Transfer Ref"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-sm text-white placeholder:text-slate-500 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Notes / Description (Optional)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. 50% deposit received via Interac"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-sm text-white placeholder:text-slate-500 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Payment Record
                </button>
              </div>
            </form>
          </div>

          {/* Payment History & Installments */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center justify-between">
              <span>Payment History & Installments ({payments.length})</span>
              <span className="text-[11px] font-normal text-slate-400">
                You can edit or remove any record below
              </span>
            </h3>

            {payments.length === 0 ? (
              <div className="text-center py-6 bg-slate-800/30 border border-dashed border-slate-700/80 rounded-xl text-slate-400 text-xs">
                No payments have been recorded for this invoice yet.
              </div>
            ) : (
              <div className="space-y-2">
                {payments.map((p, index) => {
                  const isEditing = editingPaymentId === p.id;

                  if (isEditing) {
                    return (
                      <div key={p.id} className="p-3.5 bg-slate-800 border border-indigo-500/50 rounded-xl space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-indigo-300">Editing Payment #{index + 1}</span>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="text-xs text-slate-400 hover:text-white"
                          >
                            Cancel
                          </button>
                        </div>

                        {editError && (
                          <div className="text-rose-400 text-xs">{editError}</div>
                        )}

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[11px] text-slate-400 block mb-1">Amount ($)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={editAmount}
                              onChange={(e) => setEditAmount(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 rounded-md py-1.5 px-2 text-xs text-white font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-slate-400 block mb-1">Date</label>
                            <input
                              type="date"
                              value={editDate}
                              onChange={(e) => setEditDate(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 rounded-md py-1.5 px-2 text-xs text-white"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[11px] text-slate-400 block mb-1">Method</label>
                            <select
                              value={editMethod}
                              onChange={(e) => setEditMethod(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 rounded-md py-1.5 px-2 text-xs text-white"
                            >
                              {PAYMENT_METHODS.map((m) => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-[11px] text-slate-400 block mb-1">Reference / Cheque #</label>
                            <input
                              type="text"
                              value={editRef}
                              onChange={(e) => setEditRef(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 rounded-md py-1.5 px-2 text-xs text-white"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs rounded transition cursor-pointer"
                          >
                            Discard
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(p.id)}
                            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded transition cursor-pointer flex items-center gap-1"
                          >
                            <Save className="w-3 h-3" />
                            Update Record
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={p.id}
                      className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl flex items-center justify-between hover:border-slate-600 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-bold text-xs">
                          #{index + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold font-mono text-emerald-400">
                              {formatCurrency(p.amount)}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-700 text-slate-300">
                              {p.method}
                            </span>
                            {p.reference && (
                              <span className="text-xs text-slate-400 font-mono">
                                (Ref: {p.reference})
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>Received on {formatDateToDisplay(p.date)}</span>
                            {p.notes && <span>• {p.notes}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleStartEdit(p)}
                          title="Edit Payment Record"
                          className="p-1.5 text-slate-400 hover:text-amber-300 hover:bg-slate-700 rounded-lg transition cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeletePayment(invoice.id, p.id)}
                          title="Delete Payment Record"
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-700 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-800/80 border-t border-slate-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold rounded-lg transition cursor-pointer"
          >
            Done / Close
          </button>
        </div>
      </div>
    </div>
  );
};
