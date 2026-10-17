import { attachmentStore } from '../services/attachmentStore';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatRawAmount(amount: number): string {
  return Number(amount || 0).toLocaleString('en-CA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatDateToDisplay(dateString: string): string {
  if (!dateString) return '';
  // If already formatted like "August 19, 2026", return as is
  if (dateString.includes(',') && !dateString.includes('-')) {
    return dateString;
  }
  
  try {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
  } catch {}
  return dateString;
}

export function getTodayDateString(): string {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export async function downloadAttachment(att: { id?: string; name: string; dataUrl?: string }, invoiceId?: string): Promise<void> {
  try {
    let dataUrl = att.dataUrl;
    if (!dataUrl && att.id) {
      dataUrl = (await attachmentStore.getAttachmentDataUrl(att.id, invoiceId)) || '';
    }
    if (!dataUrl) {
      console.warn('Cannot download attachment without dataUrl:', att.name);
      return;
    }
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = att.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Download failed:', error);
  }
}

export function downloadAllAttachments(attachments: Array<{ id?: string; name: string; dataUrl?: string }>, invoiceId?: string): void {
  attachments.forEach((att, idx) => {
    setTimeout(() => {
      downloadAttachment(att, invoiceId);
    }, idx * 250);
  });
}
