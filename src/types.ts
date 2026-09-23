export interface Vendor {
  id: string;
  companyName: string;
  address: string;
  phone?: string;
  email?: string;
  createdAt: string;
}

export interface InvoiceItem {
  id: string;
  title: string;
  subDetails?: string;
  quantity: number;
  rate: number;
  amount: number;
}

export type TaxType = 'HST' | 'QUEBEC' | 'CUSTOM';

export interface TaxConfig {
  taxType: TaxType;
  hstRate: number; // default 13%
  gstRate: number; // default 5.0%
  qstRate: number; // default 9.975%
  customTaxRate: number;
  customTaxLabel: string;
}

export type InvoiceStatus = 'OPEN' | 'PARTIALLY_PAID' | 'PAID';

export interface PaymentRecord {
  id: string;
  amount: number;
  date: string;          // YYYY-MM-DD
  method: string;        // 'Bank Transfer' | 'Cheque' | 'Cash' | 'Credit Card' | 'Interac / e-Transfer' | 'Other'
  reference?: string;    // e.g. Cheque # or Transaction Reference
  notes?: string;
  recordedAt: string;    // ISO string
}

export interface InvoiceAttachment {
  id: string;
  name: string;
  size: number;
  type: string;          // mime type: image/png, image/jpeg, application/pdf, etc.
  dataUrl: string;       // base64 data url
  uploadedAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string; // Manually entered, e.g. "AR26-0812"
  invoiceDate: string;   // e.g. "2026-08-19" or "August 19, 2026"
  dueDate: string;       // e.g. "Net 7 days", "Net 15 days", "Net 30 days", "Due on Receipt"
  vendorId: string;
  vendor: {
    companyName: string;
    address: string;
    phone?: string;
    email?: string;
  };
  items: InvoiceItem[];
  subtotal: number;
  taxType: TaxType;
  taxRate: number;
  taxAmount: number;
  gstAmount?: number;
  qstAmount?: number;
  grandTotal: number;
  status: InvoiceStatus;
  paymentDate?: string;
  createdAt: string;
  notes?: string;

  // Partial Payments and Attachments
  payments?: PaymentRecord[];
  amountPaid?: number;
  balanceDue?: number;
  attachments?: InvoiceAttachment[];
}

export interface MasterCompanyInfo {
  name: string;
  address: string;
  email: string;
  neq: string;
  gstRegNo: string;
  qstRegNo: string;
  chequePayableTo: string;
  disclaimer: string;
}

export type ActiveNavTab =
  | 'dashboard'
  | 'vendors'
  | 'create-invoice'
  | 'all-invoices'
  | 'open-invoices'
  | 'paid-invoices'
  | 'settings';
