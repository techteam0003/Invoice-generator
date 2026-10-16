import jsPDF from 'jspdf';
import { toJpeg, toPng } from 'html-to-image';

export async function downloadInvoicePDF(
  elementId: string,
  invoiceNumber: string,
  onProgress?: (status: string) => void
): Promise<boolean> {
  try {
    if (onProgress) onProgress('Preparing document...');
    const element = document.getElementById(elementId);
    if (!element) {
      console.error(`Element with id ${elementId} not found`);
      return false;
    }

    if (onProgress) onProgress('Rendering high-resolution PDF...');

    // Small delay to ensure all fonts, SVGs, and layouts are stabilized
    await new Promise((resolve) => setTimeout(resolve, 120));

    // Capture using html-to-image with CORS-safe options (avoiding attempts to read external cross-origin Google Font stylesheets)
    const renderOptions = {
      quality: 0.98,
      pixelRatio: 2.5,
      backgroundColor: '#ffffff',
      cacheBust: false,
      skipFonts: true,
      filter: (domNode: HTMLElement) => {
        // Skip hidden or non-printable elements if any
        return true;
      },
    };

    let imgData: string;
    try {
      imgData = await toJpeg(element, renderOptions);
    } catch (renderError) {
      // Fallback to toPng
      imgData = await toPng(element, renderOptions);
    }

    if (onProgress) onProgress('Compiling PDF file...');

    // Create A4 PDF (210 x 297 mm)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    const elementWidth = element.offsetWidth || 800;
    const elementHeight = element.offsetHeight || 1050;
    const imgWidth = pdfWidth;
    const imgHeight = (elementHeight * imgWidth) / elementWidth;

    let heightLeft = imgHeight;
    let position = 0;

    // First page
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pdfHeight;

    // If multi-page (using small tolerance threshold to prevent trailing blank page)
    while (heightLeft > 4) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;
    }

    const cleanNumber = invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Invoice_${cleanNumber || 'Draft'}.pdf`;

    pdf.save(filename);
    if (onProgress) onProgress('Complete!');
    return true;
  } catch (error) {
    console.error('Failed to generate PDF:', error);
    if (onProgress) onProgress('Failed to generate PDF.');
    return false;
  }
}

export function printInvoice(): void {
  window.print();
}

