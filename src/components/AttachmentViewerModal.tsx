import React, { useState, useRef } from 'react';
import {
  X,
  Paperclip,
  FileText,
  Image as ImageIcon,
  Download,
  Trash2,
  UploadCloud,
  Eye,
  AlertCircle,
  Plus
} from 'lucide-react';
import { Invoice, InvoiceAttachment } from '../types';

interface AttachmentViewerModalProps {
  isOpen: boolean;
  invoice: Invoice | null;
  onClose: () => void;
  onAddAttachment: (invoiceId: string, attachment: Omit<InvoiceAttachment, 'id' | 'uploadedAt'>) => void;
  onAddAttachments?: (invoiceId: string, attachments: Array<Omit<InvoiceAttachment, 'id' | 'uploadedAt'>>) => void;
  onRemoveAttachment: (invoiceId: string, attachmentId: string) => void;
}

export const AttachmentViewerModal: React.FC<AttachmentViewerModalProps> = ({
  isOpen,
  invoice,
  onClose,
  onAddAttachment,
  onAddAttachments,
  onRemoveAttachment,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedAttachment, setSelectedAttachment] = useState<InvoiceAttachment | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  if (!isOpen || !invoice) return null;

  const attachments = invoice.attachments || [];

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;

    setUploadError(null);

    const oversizedFiles: string[] = [];
    const validFiles: File[] = files.filter((f: File) => {
      if (f.size > 1.5 * 1024 * 1024) {
        oversizedFiles.push(f.name);
        return false;
      }
      return true;
    });

    if (oversizedFiles.length > 0) {
      setUploadError(`Skipped ${oversizedFiles.length} file(s) exceeding 1.5MB: ${oversizedFiles.join(', ')}`);
    }

    if (validFiles.length === 0) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);

    try {
      const readPromises = validFiles.map((file: File) => {
        return new Promise<Omit<InvoiceAttachment, 'id' | 'uploadedAt'>>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            if (dataUrl) {
              resolve({
                name: file.name,
                size: file.size,
                type: file.type || 'application/octet-stream',
                dataUrl,
              });
            } else {
              reject(new Error(`Failed to read ${file.name}`));
            }
          };
          reader.onerror = () => reject(new Error(`Error reading ${file.name}`));
          reader.readAsDataURL(file);
        });
      });

      const loadedAttachments = await Promise.all(readPromises);

      if (onAddAttachments) {
        onAddAttachments(invoice.id, loadedAttachments);
      } else {
        loadedAttachments.forEach((att) => {
          onAddAttachment(invoice.id, att);
        });
      }
    } catch {
      setUploadError('Failed to process one or more files. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownload = (att: InvoiceAttachment) => {
    const link = document.createElement('a');
    link.href = att.dataUrl;
    link.download = att.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAll = () => {
    attachments.forEach((att, idx) => {
      setTimeout(() => {
        handleDownload(att);
      }, idx * 250);
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Top Header */}
        <div className="px-6 py-4 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Paperclip className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Invoice Attachments & Documents
                <span className="text-xs font-mono font-normal text-slate-400">#{invoice.invoiceNumber}</span>
              </h2>
              <p className="text-xs text-slate-400">
                Receipts, POs, bank transfer slips, or signed delivery notes
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

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Upload Area */}
          <div className="bg-slate-800/40 border-2 border-dashed border-slate-700 hover:border-indigo-500/60 rounded-xl p-6 text-center transition">
            <input
              type="file"
              multiple
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*,.pdf"
              className="hidden"
              id="modal-attachment-upload-input"
            />
            <label
              htmlFor="modal-attachment-upload-input"
              className="cursor-pointer flex flex-col items-center justify-center space-y-2"
            >
              <div className="w-12 h-12 rounded-full bg-indigo-600/15 text-indigo-400 flex items-center justify-center">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div>
                <span className="text-sm font-semibold text-white hover:underline">
                  Click to upload documents or images (Select one or multiple)
                </span>
                <p className="text-xs text-slate-400 mt-0.5">
                  Supports all image formats (PNG, JPG, WEBP, GIF, SVG) or PDF documents (up to 1.5MB each)
                </p>
              </div>
            </label>

            {isUploading && (
              <div className="mt-3 text-xs text-indigo-300 animate-pulse">
                Processing and saving attachment(s) to database...
              </div>
            )}

            {uploadError && (
              <div className="mt-3 p-2 bg-rose-500/15 border border-rose-500/30 rounded-lg text-rose-300 text-xs flex items-center justify-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}
          </div>

          {/* Attachments List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <span>Attached Documents</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 text-[11px] font-mono">
                  {attachments.length}
                </span>
              </h3>
              {attachments.length > 1 && (
                <button
                  type="button"
                  onClick={handleDownloadAll}
                  className="px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-300 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download All ({attachments.length})</span>
                </button>
              )}
            </div>

            {attachments.length === 0 ? (
              <div className="text-center py-8 bg-slate-800/30 border border-dashed border-slate-700/80 rounded-xl text-slate-400 text-xs">
                No attachments uploaded yet for this invoice.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {attachments.map((att) => {
                  const isImage = att.type.startsWith('image/');
                  const isPDF = att.type === 'application/pdf' || att.name.toLowerCase().endsWith('.pdf');

                  return (
                    <div
                      key={att.id}
                      className="bg-slate-800/70 border border-slate-700 rounded-xl p-3 flex flex-col justify-between hover:border-slate-600 transition"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                          isPDF 
                            ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' 
                            : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                        }`}>
                          {isPDF ? <FileText className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-xs font-semibold text-white truncate" title={att.name}>
                            {att.name}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {formatFileSize(att.size)} • {isPDF ? 'PDF Document' : 'Image File'}
                          </p>
                        </div>
                      </div>

                      {/* Image Thumbnail preview if image */}
                      {isImage && (
                        <div
                          onClick={() => setSelectedAttachment(att)}
                          className="w-full h-24 rounded-lg bg-slate-950 overflow-hidden mb-3 border border-slate-700/60 cursor-pointer group relative"
                        >
                          <img
                            src={att.dataUrl}
                            alt={att.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                          />
                          <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-medium gap-1">
                            <Eye className="w-3.5 h-3.5" />
                            <span>Preview</span>
                          </div>
                        </div>
                      )}

                      {/* PDF Preview preview button */}
                      {isPDF && (
                        <div
                          onClick={() => setSelectedAttachment(att)}
                          className="w-full h-16 rounded-lg bg-slate-900 border border-slate-700/80 mb-3 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer group"
                        >
                          <div className="flex items-center gap-1.5 text-xs">
                            <Eye className="w-4 h-4 text-rose-400" />
                            <span>View PDF Document</span>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-700/60 text-xs">
                        <button
                          type="button"
                          onClick={() => handleDownload(att)}
                          className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onRemoveAttachment(invoice.id, att.id)}
                          className="text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
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
            Close
          </button>
        </div>
      </div>

      {/* Full Preview Lightbox */}
      {selectedAttachment && (
        <div className="fixed inset-0 z-60 bg-slate-950/95 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-4xl flex items-center justify-between text-white pb-3 border-b border-slate-800 mb-4">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm truncate max-w-md">{selectedAttachment.name}</span>
              <span className="text-xs text-slate-400 font-mono">({formatFileSize(selectedAttachment.size)})</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDownload(selectedAttachment)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
              <button
                onClick={() => setSelectedAttachment(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 w-full max-w-4xl max-h-[80vh] flex items-center justify-center overflow-auto">
            {selectedAttachment.type.startsWith('image/') ? (
              <img
                src={selectedAttachment.dataUrl}
                alt={selectedAttachment.name}
                className="max-h-[80vh] max-w-full object-contain rounded-lg shadow-2xl"
              />
            ) : (
              <iframe
                src={selectedAttachment.dataUrl}
                title={selectedAttachment.name}
                className="w-full h-full min-h-[70vh] rounded-lg bg-white border-0 shadow-2xl"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
