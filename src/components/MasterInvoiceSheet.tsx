import React from 'react';
import { Invoice } from '../types';
import { MASTER_COMPANY_INFO } from '../constants/companyInfo';
import { formatDateToDisplay, formatRawAmount } from '../utils/formatters';

interface MasterInvoiceSheetProps {
  invoice: Invoice;
  elementId?: string;
  showStatusBadge?: boolean;
}

export const MasterInvoiceSheet: React.FC<MasterInvoiceSheetProps> = ({
  invoice,
  elementId = 'master-invoice-pdf-root',
  showStatusBadge = false,
}) => {
  const isPaid = invoice.status === 'PAID';
  const taxLabel = () => {
    if (invoice.taxType === 'QUEBEC') {
      return `Quebec Tax (GST 5% + QST 9.975% = 14.975%):`;
    }
    if (invoice.taxType === 'CUSTOM') {
      return `Tax (${invoice.taxRate}%):`;
    }
    return `HST (${invoice.taxRate}%):`;
  };

  return (
    <div
      id={elementId}
      className="bg-white text-slate-900 font-sans mx-auto relative shadow-md print:shadow-none"
      style={{
        width: '100%',
        maxWidth: '800px',
        minHeight: '1050px',
        padding: '48px 52px',
        boxSizing: 'border-box',
        color: '#111827',
      }}
    >
      {/* Optional Status Stamp / Watermark */}
      {showStatusBadge && isPaid && (
        <div
          id="invoice-paid-stamp"
          className="absolute top-12 right-12 border-4 border-emerald-600/80 text-emerald-700/90 font-black text-2xl tracking-widest px-6 py-2 rounded uppercase transform rotate-[-12deg] pointer-events-none select-none"
          style={{ letterSpacing: '0.2em' }}
        >
          PAID
          {invoice.paymentDate && (
            <div className="text-[10px] font-semibold text-center mt-0.5 tracking-normal">
              {formatDateToDisplay(invoice.paymentDate)}
            </div>
          )}
        </div>
      )}

      {/* Top Header Section */}
      <div id="invoice-header-block" className="mb-6">
        <h1
          id="invoice-title"
          className="text-2xl font-bold tracking-tight text-slate-900 mb-2 uppercase"
          style={{ fontSize: '24px', letterSpacing: '0.05em' }}
        >
          INVOICE
        </h1>

        <div id="invoice-company-details" className="text-[13px] leading-[1.45] text-slate-900 font-medium">
          <p className="font-bold text-[14px] text-slate-900">{MASTER_COMPANY_INFO.name}</p>
          <p>{MASTER_COMPANY_INFO.address}</p>
          <p>
            Email: <span className="font-normal">{MASTER_COMPANY_INFO.email}</span>
          </p>
          <p>NEQ: {MASTER_COMPANY_INFO.neq}</p>
          <p>GST Reg No: {MASTER_COMPANY_INFO.gstRegNo}</p>
          <p>QST Reg No: {MASTER_COMPANY_INFO.qstRegNo}</p>
        </div>
      </div>

      {/* Divider Bar & Info Grid */}
      <div id="invoice-meta-grid" className="pt-4 border-t border-slate-300 grid grid-cols-2 gap-8 mb-6 text-[13px]">
        {/* Left Column: Billed To */}
        <div id="invoice-billed-to-section">
          <h2
            id="billed-to-heading"
            className="text-[13px] font-bold text-[#2B6CB0] uppercase tracking-wider mb-1.5"
          >
            BILLED TO:
          </h2>
          <div className="text-slate-900 leading-tight">
            <p className="font-bold text-[14px] text-slate-900 mb-1">
              {invoice.vendor?.companyName || 'N/A'}
            </p>
            <p className="text-slate-700 whitespace-pre-line text-[13px]">
              {invoice.vendor?.address || ''}
            </p>
            {invoice.vendor?.phone && (
              <p className="text-slate-700 mt-1">Tel: {invoice.vendor.phone}</p>
            )}
            {invoice.vendor?.email && (
              <p className="text-slate-700">Email: {invoice.vendor.email}</p>
            )}
          </div>
        </div>

        {/* Right Column: Invoice Details */}
        <div id="invoice-details-section" className="text-left">
          <h2
            id="invoice-details-heading"
            className="text-[13px] font-bold text-[#2B6CB0] uppercase tracking-wider mb-1.5"
          >
            INVOICE DETAILS:
          </h2>
          <div className="space-y-1 text-[13px] leading-snug">
            <p>
              <span className="text-slate-800">Invoice Number: </span>
              <span className="font-bold text-slate-950">{invoice.invoiceNumber}</span>
            </p>
            <p>
              <span className="text-slate-800">Invoice Date: </span>
              <span className="text-slate-950 font-medium">
                {formatDateToDisplay(invoice.invoiceDate)}
              </span>
            </p>
            <p>
              <span className="text-slate-800">Payment Due Date: </span>
              <span className="text-slate-950 font-medium">{invoice.dueDate || 'Net 7 days'}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Services Section Header */}
      <div id="services-header" className="mb-2">
        <h2 className="text-[13px] font-bold text-[#2B6CB0] uppercase tracking-wider">
          SERVICES PROVIDED
        </h2>
      </div>

      {/* Services Table matching Master Reference */}
      <div id="invoice-items-table-wrapper" className="mb-6 overflow-hidden border border-slate-200 rounded-none">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr style={{ backgroundColor: '#2B6CB0' }} className="text-white text-left font-semibold">
              <th className="py-2.5 px-4 font-semibold text-[13px] w-auto border-r border-[#3B82F6]/30">
                Description
              </th>
              <th className="py-2.5 px-3 font-semibold text-[13px] text-center w-16 border-r border-[#3B82F6]/30">
                Qty
              </th>
              <th className="py-2.5 px-4 font-semibold text-[13px] text-right w-28 border-r border-[#3B82F6]/30">
                Rate ($)
              </th>
              <th className="py-2.5 px-4 font-semibold text-[13px] text-right w-32">
                Amount ($)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {(invoice.items || []).map((item, index) => (
              <tr key={item.id || index} className="text-slate-900 align-top">
                <td className="py-3 px-4 border-r border-slate-200">
                  <div className="font-bold text-slate-900">
                    {index + 1}. {item.title || 'Vehicle Sourcing/Locating Service Fee'}
                  </div>
                  {item.subDetails && (
                    <div className="text-slate-600 text-[12px] mt-0.5 whitespace-pre-line font-normal">
                      {item.subDetails}
                    </div>
                  )}
                </td>
                <td className="py-3 px-3 text-center border-r border-slate-200 font-medium">
                  {item.quantity}
                </td>
                <td className="py-3 px-4 text-right border-r border-slate-200 font-medium font-mono text-[13px]">
                  {formatRawAmount(item.rate)}
                </td>
                <td className="py-3 px-4 text-right font-medium font-mono text-[13px]">
                  {formatRawAmount(item.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals Section */}
      <div id="invoice-totals-wrapper" className="pt-2 mb-8 flex justify-end">
        <div className="w-80 text-[13px] space-y-2">
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="font-bold text-slate-800">Subtotal:</span>
            <span className="font-bold font-mono text-slate-900">
              ${formatRawAmount(invoice.subtotal)}
            </span>
          </div>

          {/* Quebec Breakdown if selected */}
          {invoice.taxType === 'QUEBEC' ? (
            <>
              <div className="flex justify-between py-0.5 text-slate-700 text-[12px]">
                <span>GST (5%):</span>
                <span className="font-mono">
                  ${formatRawAmount(invoice.gstAmount || invoice.subtotal * 0.05)}
                </span>
              </div>
              <div className="flex justify-between py-0.5 text-slate-700 text-[12px]">
                <span>QST (9.975%):</span>
                <span className="font-mono">
                  ${formatRawAmount(invoice.qstAmount || invoice.subtotal * 0.09975)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="font-bold text-slate-800">Total Tax (14.975%):</span>
                <span className="font-bold font-mono text-slate-900">
                  ${formatRawAmount(invoice.taxAmount)}
                </span>
              </div>
            </>
          ) : (
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="font-bold text-slate-800">{taxLabel()}</span>
              <span className="font-bold font-mono text-slate-900">
                ${formatRawAmount(invoice.taxAmount)}
              </span>
            </div>
          )}

          {/* Grand Total Bar */}
          <div
            id="invoice-grand-total-row"
            className="flex justify-between items-center py-2.5 border-t-2 border-b-2 border-slate-900 mt-2"
          >
            <span className="text-[15px] font-bold text-slate-950">Total Due:</span>
            <span className="text-[17px] font-bold font-mono text-slate-950">
              ${formatRawAmount(invoice.grandTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* Cheques Payable Line */}
      <div id="invoice-cheque-line" className="mb-5">
        <p className="font-bold text-[#2B6CB0] text-[13px]">
          Cheques to be created in favor of {MASTER_COMPANY_INFO.chequePayableTo}
        </p>
      </div>

      {/* Bottom Disclaimer */}
      <div id="invoice-disclaimer-wrapper" className="pt-3 border-t border-slate-300">
        <p className="text-[10px] font-bold text-slate-700 tracking-wider mb-1 uppercase">
          VEHICLE SOURCING SERVICE DISCLAIMER:
        </p>
        <p className="text-[9.5px] leading-relaxed text-slate-500 italic text-justify">
          {MASTER_COMPANY_INFO.disclaimer}
        </p>
      </div>
    </div>
  );
};
