import React, { useState } from 'react';
import {
  X,
  Download,
  Printer,
  CheckCircle2,
  Clock,
  Trash2,
  FileText,
  Share2,
  AlertCircle
} from 'lucide-react';
import { Invoice } from '../types';
import { MasterInvoiceSheet } from './MasterInvoiceSheet';
import { downloadInvoicePDF, printInvoice } from '../utils/pdfGenerator';
import { formatCurrency, formatDateToDisplay } from '../utils/formatters';
import { DeleteConfirmModal } from './DeleteConfirmModal';

interface InvoicePreviewModalProps {
  invoice: Invoice | null;
  onClose: () => void;
  onMarkAsPaid: (invoiceId: string, paymentDate?: string) => void;
  onMarkAsOpen: (invoiceId: string) => void;
  onDeleteInvoice?: (invoiceId: string) => void;
}

export const InvoicePreviewModal: React.FC<InvoicePreviewModalProps> = ({
  invoice,
  onClose,
  onMarkAsPaid,
  onMarkAsOpen,
  onDeleteInvoice,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!invoice) return null;

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    setDownloadStatus('Generating master PDF...');
    const success = await downloadInvoicePDF(
      'master-preview-invoice-sheet',
      invoice.invoiceNumber,
      (status) => setDownloadStatus(status)
    );
    setTimeout(() => {
      setIsDownloading(false);
      setDownloadStatus(null);
    }, 1200);
  };

  const isPaid = invoice.status === 'PAID';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-slate-900 rounded-2xl w-full max-w-4xl max-h-[95vh] flex flex-col shadow-2xl border border-slate-700 overflow-hidden print:border-none print:shadow-none print:max-h-none print:max-w-none">
        {/* Modal Top Bar */}
        <div className="px-6 py-4 bg-slate-800/90 border-b border-slate-700/80 flex items-center justify-between text-white print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white font-mono">{invoice.invoiceNumber}</h2>
                {isPaid ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    PAID
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    OPEN / UNPAID
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {invoice.vendor?.companyName} • {formatCurrency(invoice.grandTotal)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Status toggle */}
            {!isPaid ? (
              <button
                onClick={() => onMarkAsPaid(invoice.id)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Mark as Paid</span>
              </button>
            ) : (
              <button
                onClick={() => onMarkAsOpen(invoice.id)}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium rounded-lg transition flex items-center gap-1.5 cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Reopen Invoice</span>
              </button>
            )}

            {/* Print */}
            <button
              onClick={printInvoice}
              title="Print Document"
              className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
            </button>

            {/* Download PDF */}
            <button
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              id="modal-download-pdf-btn"
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-lg transition flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-60"
            >
              {isDownloading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>{downloadStatus || 'Exporting...'}</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download PDF</span>
                </>
              )}
            </button>

            {/* Delete Invoice */}
            {onDeleteInvoice && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                title="Delete Invoice"
                className="p-2 bg-slate-700 hover:bg-rose-600 text-slate-300 hover:text-white rounded-lg transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Invoice View Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-950/90 flex justify-center print:p-0 print:bg-white">
          <div className="w-full max-w-[820px] bg-white shadow-2xl rounded-sm print:shadow-none">
            <MasterInvoiceSheet
              invoice={invoice}
              elementId="master-preview-invoice-sheet"
              showStatusBadge={true}
            />
          </div>
        </div>
      </div>

      {/* Delete Confirmation Popup */}
      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        title="Delete Invoice"
        itemName={`Invoice #${invoice.invoiceNumber}`}
        itemSubtitle={`${invoice.vendor.companyName} • Total: ${formatCurrency(invoice.grandTotal)}`}
        message="Are you sure you want to permanently delete this invoice from your database? This action cannot be undone."
        confirmText="Yes, Delete Invoice"
        onConfirm={() => {
          setShowDeleteConfirm(false);
          if (onDeleteInvoice) onDeleteInvoice(invoice.id);
          onClose();
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
};
