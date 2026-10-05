import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  Unsubscribe
} from 'firebase/firestore';
import { db } from './firebase';
import {
  Invoice,
  Vendor,
  TaxConfig,
  PaymentRecord,
  InvoiceAttachment,
  InvoiceStatus,
  Expense,
  ExpenseCategory,
  ExpenseAttachment
} from '../types';
import { DEFAULT_TAX_CONFIG } from '../constants/companyInfo';

const COLLECTIONS = {
  VENDORS: 'vendors',
  INVOICES: 'invoices',
  SETTINGS: 'settings',
  EXPENSES: 'expenses',
  EXPENSE_CATEGORIES: 'expense_categories'
};

const STORAGE_KEYS = {
  INVOICES: 'bk_invoice_manager_invoices_v1',
  VENDORS: 'bk_invoice_manager_vendors_v1',
  TAX_CONFIG: 'bk_invoice_manager_tax_config_v1',
  AUTH: 'bk_invoice_manager_auth_v1',
  EXPENSES: 'bk_invoice_manager_expenses_v1',
  EXPENSE_CATEGORIES: 'bk_invoice_manager_expense_categories_v1'
};

/**
 * Normalizes an invoice object ensuring all fields like payments, attachments, amountPaid, and balanceDue exist.
 */
export function normalizeInvoice(data: any, id: string): Invoice {
  const items = Array.isArray(data.items)
    ? data.items.map((it: any) => ({
        id: it.id || 'item-' + Math.random().toString(36).substring(2, 6),
        title: it.title || '',
        subDetails: it.subDetails || undefined,
        quantity: Number(it.quantity) || 1,
        rate: Number(it.rate) || 0,
        amount: Number(it.amount) || 0,
      }))
    : [];

  const subtotal = Number(data.subtotal) || 0;
  const taxRate = Number(data.taxRate) || 13;
  const taxAmount = Number(data.taxAmount) || 0;
  const grandTotal = Number(data.grandTotal) || (subtotal + taxAmount);

  const payments: PaymentRecord[] = Array.isArray(data.payments)
    ? data.payments.map((p: any) => ({
        id: p.id || 'pmt_' + Math.random().toString(36).substring(2, 6),
        amount: Number(p.amount) || 0,
        date: p.date || '',
        method: p.method || 'Bank Transfer',
        reference: p.reference || undefined,
        notes: p.notes || undefined,
        recordedAt: p.recordedAt || new Date().toISOString(),
      }))
    : [];

  const calculatedPaid = payments.reduce((acc: number, p: any) => acc + (p.amount || 0), 0);
  const amountPaid = data.amountPaid !== undefined && !isNaN(Number(data.amountPaid))
    ? Number(data.amountPaid)
    : (payments.length > 0 ? calculatedPaid : (data.status === 'PAID' ? grandTotal : 0));
  const balanceDue = data.balanceDue !== undefined && !isNaN(Number(data.balanceDue))
    ? Number(data.balanceDue)
    : Math.max(0, grandTotal - amountPaid);

  let status: InvoiceStatus = data.status || 'OPEN';
  if (amountPaid >= grandTotal - 0.001 && grandTotal > 0) {
    status = 'PAID';
  } else if (amountPaid > 0) {
    status = 'PARTIALLY_PAID';
  } else if (data.status === 'PAID') {
    status = 'PAID';
  } else {
    status = 'OPEN';
  }

  const attachments: InvoiceAttachment[] = Array.isArray(data.attachments)
    ? data.attachments.map((att: any) => ({
        id: att.id || 'att_' + Math.random().toString(36).substring(2, 6),
        name: att.name || 'attachment',
        size: Number(att.size) || 0,
        type: att.type || 'application/octet-stream',
        dataUrl: att.dataUrl || '',
        uploadedAt: att.uploadedAt || new Date().toISOString(),
      }))
    : [];

  return {
    id,
    invoiceNumber: data.invoiceNumber || 'INV-UNKNOWN',
    invoiceDate: data.invoiceDate || '',
    dueDate: data.dueDate || 'Net 7 days',
    vendorId: data.vendorId || '',
    vendor: {
      companyName: data.vendor?.companyName || '',
      address: data.vendor?.address || '',
      phone: data.vendor?.phone || undefined,
      email: data.vendor?.email || undefined,
    },
    items,
    subtotal,
    taxType: data.taxType || 'HST',
    taxRate,
    taxAmount,
    gstAmount: data.gstAmount !== undefined && data.gstAmount !== null ? Number(data.gstAmount) : undefined,
    qstAmount: data.qstAmount !== undefined && data.qstAmount !== null ? Number(data.qstAmount) : undefined,
    grandTotal,
    status,
    paymentDate: data.paymentDate || undefined,
    createdAt: data.createdAt || new Date().toISOString(),
    notes: data.notes || undefined,
    payments,
    amountPaid,
    balanceDue,
    attachments,
  };
}

/**
 * Deeply cleans an object so that no `undefined` values are passed to Firestore setDoc/updateDoc
 */
export function cleanForFirestore<T>(obj: T): any {
  if (obj === undefined || obj === null) {
    return null;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => cleanForFirestore(item));
  }
  if (typeof obj === 'object') {
    const clean: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj as Record<string, any>)) {
      if (v !== undefined) {
        clean[k] = cleanForFirestore(v);
      }
    }
    return clean;
  }
  return obj;
}

const SEED_VENDORS: Vendor[] = [
  {
    id: 'vendor-1',
    companyName: 'WINDSOR MITSUBISHI LTD',
    address: '1622 Sylvestre Dr, Tecumseh, ON N9K 0B9',
    phone: '(519) 735-4422',
    email: 'info@windsormitsubishi.com',
    createdAt: '2026-08-15T10:00:00Z',
  },
  {
    id: 'vendor-2',
    companyName: 'MONTREAL AUTO PRESTIGE INC',
    address: '4500 Boul Métropolitain E, Saint-Léonard, QC H1S 1K6',
    phone: '(514) 321-9988',
    email: 'contact@prestigeautoqc.com',
    createdAt: '2026-08-18T14:30:00Z',
  },
  {
    id: 'vendor-3',
    companyName: 'TORONTO MOTORS GROUP',
    address: '777 Dundas St W, Toronto, ON M6J 1V2',
    phone: '(416) 555-0199',
    email: 'accounting@torontomotors.ca',
    createdAt: '2026-08-20T09:15:00Z',
  }
];

const SEED_INVOICES: Invoice[] = [
  {
    id: 'inv-seed-1',
    invoiceNumber: 'AR26-0812',
    invoiceDate: 'August 19, 2026',
    dueDate: 'Net 7 days',
    vendorId: 'vendor-1',
    vendor: {
      companyName: 'WINDSOR MITSUBISHI LTD',
      address: '1622 Sylvestre Dr, Tecumseh, ON N9K 0B9',
      phone: '(519) 735-4422',
      email: 'info@windsormitsubishi.com',
    },
    items: [
      {
        id: 'item-1',
        title: 'Vehicle Sourcing/Locating Service Fee',
        subDetails: '2024 Subaru Crosstrek — VIN: 393477',
        quantity: 1,
        rate: 400.00,
        amount: 400.00,
      },
      {
        id: 'item-2',
        title: 'Vehicle Sourcing/Locating Service Fee',
        subDetails: '2024 Mazda CX-5 — VIN: 359332',
        quantity: 1,
        rate: 400.00,
        amount: 400.00,
      },
      {
        id: 'item-3',
        title: 'Vehicle Sourcing/Locating Service Fee',
        subDetails: '2023 Mitsubishi RVR — VIN: 602641',
        quantity: 1,
        rate: 400.00,
        amount: 400.00,
      },
      {
        id: 'item-4',
        title: 'Vehicle Sourcing/Locating Service Fee',
        subDetails: '2022 Mitsubishi RVR — VIN: 603423',
        quantity: 1,
        rate: 400.00,
        amount: 400.00,
      },
      {
        id: 'item-5',
        title: 'Vehicle Sourcing/Locating Service Fee',
        subDetails: '2022 Mitsubishi RVR — VIN: 603867',
        quantity: 1,
        rate: 400.00,
        amount: 400.00,
      }
    ],
    subtotal: 2000.00,
    taxType: 'HST',
    taxRate: 13.0,
    taxAmount: 260.00,
    grandTotal: 2260.00,
    status: 'OPEN',
    createdAt: '2026-08-19T10:00:00Z',
    notes: 'Sample master reference invoice for vehicle locating'
  },
  {
    id: 'inv-seed-2',
    invoiceNumber: 'AR26-0905',
    invoiceDate: 'September 5, 2026',
    dueDate: 'Net 15 days',
    vendorId: 'vendor-1',
    vendor: {
      companyName: 'WINDSOR MITSUBISHI LTD',
      address: '1622 Sylvestre Dr, Tecumseh, ON N9K 0B9',
      phone: '(519) 735-4422',
      email: 'info@windsormitsubishi.com',
    },
    items: [
      {
        id: 'item-2-1',
        title: 'Wholesale Dealer Locating & Acquisition',
        subDetails: '2023 Honda CR-V Touring — VIN: 849201',
        quantity: 2,
        rate: 600.00,
        amount: 1200.00,
      },
      {
        id: 'item-2-2',
        title: 'Logistics Coordination & Pre-Delivery Inspection Dispatch',
        subDetails: '2x Units Windsor to London Regional Hub',
        quantity: 2,
        rate: 400.00,
        amount: 800.00,
      },
      {
        id: 'item-2-3',
        title: 'Vehicle Sourcing/Locating Service Fee',
        subDetails: '2024 Toyota RAV4 Hybrid — VIN: 194823',
        quantity: 2,
        rate: 600.00,
        amount: 1200.00,
      }
    ],
    subtotal: 3200.00,
    taxType: 'HST',
    taxRate: 13.0,
    taxAmount: 416.00,
    grandTotal: 3616.00,
    status: 'PAID',
    paymentDate: '2026-09-12',
    amountPaid: 3616.00,
    balanceDue: 0.00,
    payments: [
      {
        id: 'pay-seed-1',
        amount: 3616.00,
        date: '2026-09-12',
        method: 'Bank Transfer',
        reference: 'EFT-883920-WIN',
        notes: 'Full payment received via Electronic Funds Transfer',
        recordedAt: '2026-09-12T14:30:00Z'
      }
    ],
    createdAt: '2026-09-05T09:00:00Z',
    notes: 'Payment confirmed in full via Direct Deposit EFT.'
  },
  {
    id: 'inv-seed-3',
    invoiceNumber: 'AR26-0918',
    invoiceDate: 'September 18, 2026',
    dueDate: 'Net 30 days',
    vendorId: 'vendor-2',
    vendor: {
      companyName: 'MONTREAL AUTO PRESTIGE INC',
      address: '4500 Boul Métropolitain E, Saint-Léonard, QC H1S 1K6',
      phone: '(514) 321-9988',
      email: 'contact@prestigeautoqc.com',
    },
    items: [
      {
        id: 'item-3-1',
        title: 'Fleet Acquisition & Commercial Brokering Services',
        subDetails: '5x Luxury Sedan Units — Dealer Consignment Lot',
        quantity: 5,
        rate: 1200.00,
        amount: 6000.00,
      },
      {
        id: 'item-3-2',
        title: 'Specialty Transport & Inter-Provincial Certification',
        subDetails: 'Quebec Safety Compliance & SAAQ Transit Validation',
        quantity: 4,
        rate: 1000.00,
        amount: 4000.00,
      }
    ],
    subtotal: 10000.00,
    taxType: 'QUEBEC',
    taxRate: 14.975,
    taxAmount: 1497.50,
    gstAmount: 500.00,
    qstAmount: 997.50,
    grandTotal: 11497.50,
    status: 'PARTIALLY_PAID',
    paymentDate: '2026-09-24',
    amountPaid: 6000.00,
    balanceDue: 5497.50,
    payments: [
      {
        id: 'pay-seed-2',
        amount: 6000.00,
        date: '2026-09-24',
        method: 'Cheque',
        reference: 'CHQ #4492',
        notes: 'First installment payment cleared',
        recordedAt: '2026-09-24T16:00:00Z'
      }
    ],
    createdAt: '2026-09-18T11:20:00Z',
    notes: 'Quebec dual tax applied: GST 5% ($500.00) + QST 9.975% ($997.50). Partial payment received.'
  },
  {
    id: 'inv-seed-4',
    invoiceNumber: 'AR26-0928',
    invoiceDate: 'September 28, 2026',
    dueDate: 'Net 7 days',
    vendorId: 'vendor-3',
    vendor: {
      companyName: 'TORONTO MOTORS GROUP',
      address: '777 Dundas St W, Toronto, ON M6J 1V2',
      phone: '(416) 555-0199',
      email: 'accounting@torontomotors.ca',
    },
    items: [
      {
        id: 'item-4-1',
        title: 'Auction Representation & Bid Execution',
        subDetails: '2025 Lexus RX 350 AWD — Manheim Toronto Lot #442',
        quantity: 2,
        rate: 800.00,
        amount: 1600.00,
      }
    ],
    subtotal: 1600.00,
    taxType: 'HST',
    taxRate: 13.0,
    taxAmount: 208.00,
    grandTotal: 1808.00,
    status: 'OPEN',
    amountPaid: 0,
    balanceDue: 1808.00,
    createdAt: '2026-09-28T15:45:00Z',
    notes: 'Invoice sent to accounts payable department.'
  }
];

export const DEFAULT_EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { id: 'cat-1', name: 'Vehicle Inspection & Certifications', color: '#3B82F6', isDefault: true, createdAt: '2026-08-01T00:00:00Z' },
  { id: 'cat-2', name: 'Towing & Logistics / Transport', color: '#6366F1', isDefault: true, createdAt: '2026-08-01T00:00:00Z' },
  { id: 'cat-3', name: 'Fuel & Travel Expenses', color: '#F59E0B', isDefault: true, createdAt: '2026-08-01T00:00:00Z' },
  { id: 'cat-4', name: 'Repairs & Detailing', color: '#EC4899', isDefault: true, createdAt: '2026-08-01T00:00:00Z' },
  { id: 'cat-5', name: 'Licensing, SAAQ & Registration', color: '#10B981', isDefault: true, createdAt: '2026-08-01T00:00:00Z' },
  { id: 'cat-6', name: 'Office, Tools & Administrative', color: '#8B5CF6', isDefault: true, createdAt: '2026-08-01T00:00:00Z' },
  { id: 'cat-7', name: 'Software & Online Subscriptions', color: '#06B6D4', isDefault: true, createdAt: '2026-08-01T00:00:00Z' },
  { id: 'cat-8', name: 'Legal & Professional Accounting', color: '#14B8A6', isDefault: true, createdAt: '2026-08-01T00:00:00Z' },
  { id: 'cat-9', name: 'Advertising & Marketing', color: '#F97316', isDefault: true, createdAt: '2026-08-01T00:00:00Z' },
  { id: 'cat-10', name: 'Miscellaneous & Other', color: '#64748B', isDefault: true, createdAt: '2026-08-01T00:00:00Z' }
];

export const SEED_EXPENSES: Expense[] = [];

export function normalizeExpense(data: any, id: string): Expense {
  const attachments: ExpenseAttachment[] = Array.isArray(data.attachments)
    ? data.attachments.map((att: any) => ({
        id: att.id || 'exp_att_' + Math.random().toString(36).substring(2, 6),
        name: att.name || 'receipt',
        size: Number(att.size) || 0,
        type: att.type || 'application/octet-stream',
        dataUrl: att.dataUrl || '',
        uploadedAt: att.uploadedAt || new Date().toISOString(),
      }))
    : [];

  return {
    id,
    title: data.title || 'Untitled Expense',
    amount: Number(data.amount) || 0,
    category: data.category || 'Miscellaneous & Other',
    categoryId: data.categoryId || undefined,
    date: data.date || new Date().toISOString().split('T')[0],
    paymentMethod: data.paymentMethod || 'Credit Card',
    payee: data.payee || undefined,
    reference: data.reference || undefined,
    notes: data.notes || undefined,
    taxAmount: data.taxAmount !== undefined && data.taxAmount !== null ? Number(data.taxAmount) : undefined,
    taxDeductible: data.taxDeductible !== undefined ? Boolean(data.taxDeductible) : true,
    attachments,
    createdAt: data.createdAt || new Date().toISOString(),
  };
}

export const storage = {
  // Real-time Firestore Subscriptions
  subscribeVendors(callback: (vendors: Vendor[]) => void): Unsubscribe {
    try {
      const q = query(collection(db, COLLECTIONS.VENDORS));
      return onSnapshot(
        q,
        (snapshot) => {
          if (snapshot.empty) {
            // Seed initial data to Firestore
            this.seedInitialFirestoreData();
            const local = this.getVendorsLocal();
            callback(local);
          } else {
            const list: Vendor[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data() as any;
              if (data) {
                list.push({
                  id: docSnap.id,
                  companyName: data.companyName || '',
                  address: data.address || '',
                  phone: data.phone || undefined,
                  email: data.email || undefined,
                  createdAt: data.createdAt || new Date().toISOString(),
                });
              }
            });
            list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            localStorage.setItem(STORAGE_KEYS.VENDORS, JSON.stringify(list));
            callback(list);
          }
        },
        (error) => {
          console.warn('Firestore vendor subscription error, using local cache:', error);
          callback(this.getVendorsLocal());
        }
      );
    } catch (err) {
      console.warn('Error establishing Firestore vendor listener:', err);
      callback(this.getVendorsLocal());
      return () => {};
    }
  },

  subscribeInvoices(callback: (invoices: Invoice[]) => void): Unsubscribe {
    try {
      const q = query(collection(db, COLLECTIONS.INVOICES));
      return onSnapshot(
        q,
        (snapshot) => {
          if (snapshot.empty) {
            this.seedInitialFirestoreData();
            const local = this.getInvoicesLocal();
            callback(local);
          } else {
            const list: Invoice[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data();
              if (data) {
                list.push(normalizeInvoice(data, docSnap.id));
              }
            });
            list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(list));
            callback(list);
          }
        },
        (error) => {
          console.warn('Firestore invoice subscription error, using local cache:', error);
          callback(this.getInvoicesLocal());
        }
      );
    } catch (err) {
      console.warn('Error establishing Firestore invoice listener:', err);
      callback(this.getInvoicesLocal());
      return () => {};
    }
  },

  subscribeTaxConfig(callback: (config: TaxConfig) => void): Unsubscribe {
    try {
      const docRef = doc(db, COLLECTIONS.SETTINGS, 'tax_config');
      return onSnapshot(
        docRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const cfg = snapshot.data() as TaxConfig;
            localStorage.setItem(STORAGE_KEYS.TAX_CONFIG, JSON.stringify(cfg));
            callback(cfg);
          } else {
            const local = this.getTaxConfigLocal();
            setDoc(docRef, cleanForFirestore(local)).catch(() => {});
            callback(local);
          }
        },
        (error) => {
          console.warn('Firestore settings subscription error, using local config:', error);
          callback(this.getTaxConfigLocal());
        }
      );
    } catch (err) {
      callback(this.getTaxConfigLocal());
      return () => {};
    }
  },

  subscribeExpenses(callback: (expenses: Expense[]) => void): Unsubscribe {
    try {
      const q = query(collection(db, COLLECTIONS.EXPENSES));
      return onSnapshot(
        q,
        (snapshot) => {
          if (snapshot.empty) {
            const local = this.getExpensesLocal();
            callback(local);
          } else {
            const list: Expense[] = [];
            snapshot.forEach((docSnap) => {
              if (docSnap.id.startsWith('exp-seed-')) {
                // Delete legacy dummy seed expense from Firestore
                deleteDoc(doc(db, COLLECTIONS.EXPENSES, docSnap.id)).catch(() => {});
                return;
              }
              const data = docSnap.data();
              if (data) {
                list.push(normalizeExpense(data, docSnap.id));
              }
            });
            list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(list));
            callback(list);
          }
        },
        (error) => {
          console.warn('Firestore expense subscription error, using local cache:', error);
          callback(this.getExpensesLocal());
        }
      );
    } catch (err) {
      console.warn('Error establishing Firestore expense listener:', err);
      callback(this.getExpensesLocal());
      return () => {};
    }
  },

  subscribeCategories(callback: (categories: ExpenseCategory[]) => void): Unsubscribe {
    try {
      const q = query(collection(db, COLLECTIONS.EXPENSE_CATEGORIES));
      return onSnapshot(
        q,
        (snapshot) => {
          if (snapshot.empty) {
            const local = this.getCategoriesLocal();
            callback(local);
          } else {
            const list: ExpenseCategory[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data() as any;
              if (data) {
                list.push({
                  id: docSnap.id,
                  name: data.name || '',
                  color: data.color || '#3B82F6',
                  isDefault: Boolean(data.isDefault),
                  createdAt: data.createdAt || new Date().toISOString()
                });
              }
            });
            list.sort((a, b) => a.name.localeCompare(b.name));
            localStorage.setItem(STORAGE_KEYS.EXPENSE_CATEGORIES, JSON.stringify(list));
            callback(list);
          }
        },
        (error) => {
          console.warn('Firestore category subscription error, using local cache:', error);
          callback(this.getCategoriesLocal());
        }
      );
    } catch (err) {
      console.warn('Error establishing Firestore category listener:', err);
      callback(this.getCategoriesLocal());
      return () => {};
    }
  },

  async seedInitialFirestoreData(): Promise<void> {
    try {
      const vendorSnap = await getDocs(collection(db, COLLECTIONS.VENDORS));
      if (vendorSnap.empty) {
        const localVendors = this.getVendorsLocal();
        for (const v of localVendors) {
          await setDoc(doc(db, COLLECTIONS.VENDORS, v.id), cleanForFirestore(v));
        }
      }

      const invoiceSnap = await getDocs(collection(db, COLLECTIONS.INVOICES));
      if (invoiceSnap.empty) {
        const localInvoices = this.getInvoicesLocal();
        for (const inv of localInvoices) {
          await setDoc(doc(db, COLLECTIONS.INVOICES, inv.id), cleanForFirestore(inv));
        }
      }

      // Clean up any remaining dummy seed expenses from Firestore
      const dummyIds = ['exp-seed-1', 'exp-seed-2', 'exp-seed-3'];
      for (const dId of dummyIds) {
        deleteDoc(doc(db, COLLECTIONS.EXPENSES, dId)).catch(() => {});
      }

      const catSnap = await getDocs(collection(db, COLLECTIONS.EXPENSE_CATEGORIES));
      if (catSnap.empty) {
        const localCats = this.getCategoriesLocal();
        for (const cat of localCats) {
          await setDoc(doc(db, COLLECTIONS.EXPENSE_CATEGORIES, cat.id), cleanForFirestore(cat));
        }
      }

      const taxDocRef = doc(db, COLLECTIONS.SETTINGS, 'tax_config');
      const taxDoc = await getDocs(collection(db, COLLECTIONS.SETTINGS));
      if (taxDoc.empty) {
        await setDoc(taxDocRef, cleanForFirestore(this.getTaxConfigLocal()));
      }
    } catch (e) {
      console.warn('Could not seed initial Firestore data:', e);
    }
  },

  // Local fallback getters
  getVendorsLocal(): Vendor[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.VENDORS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.VENDORS, JSON.stringify(SEED_VENDORS));
        return SEED_VENDORS;
      }
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : SEED_VENDORS;
    } catch {
      return SEED_VENDORS;
    }
  },

  getInvoicesLocal(): Invoice[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.INVOICES);
      if (!data) {
        const seeded = SEED_INVOICES.map((inv) => normalizeInvoice(inv, inv.id));
        localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(seeded));
        return seeded;
      }
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) return SEED_INVOICES.map((inv) => normalizeInvoice(inv, inv.id));
      const existingIds = new Set(parsed.map((item: any) => item?.id));
      const merged = [...parsed];
      for (const seedInv of SEED_INVOICES) {
        if (!existingIds.has(seedInv.id)) {
          merged.push(seedInv);
        }
      }
      const normalized = merged.map((item) => normalizeInvoice(item, item.id || 'inv_' + Math.random().toString(36).substring(2, 6)));
      localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(normalized));
      return normalized;
    } catch {
      return SEED_INVOICES.map((inv) => normalizeInvoice(inv, inv.id));
    }
  },

  getTaxConfigLocal(): TaxConfig {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TAX_CONFIG);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.TAX_CONFIG, JSON.stringify(DEFAULT_TAX_CONFIG));
        return DEFAULT_TAX_CONFIG;
      }
      return JSON.parse(data);
    } catch {
      return DEFAULT_TAX_CONFIG;
    }
  },

  getExpensesLocal(): Expense[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.EXPENSES);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify([]));
        return [];
      }
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) {
        localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify([]));
        return [];
      }
      // Thoroughly remove any dummy/seed expenses added in previous sessions
      const clean = parsed
        .filter((item: any) => {
          if (!item) return false;
          const id = String(item.id || '');
          if (id.startsWith('exp-seed-') || id.startsWith('dummy-')) return false;
          const title = String(item.title || '').toLowerCase();
          const payee = String(item.payee || '').toLowerCase();
          if (
            title.includes('tow truck') ||
            title.includes('oil change') ||
            title.includes('routine service') ||
            title.includes('accounting & audit') ||
            title.includes('seed') ||
            payee.includes('caa') ||
            payee.includes('saaq') ||
            payee.includes('petro')
          ) {
            return false;
          }
          return true;
        })
        .map((item: any) => normalizeExpense(item, item.id || 'exp_' + Math.random().toString(36).substring(2, 6)));
      localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(clean));
      return clean;
    } catch {
      return [];
    }
  },

  getCategoriesLocal(): ExpenseCategory[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.EXPENSE_CATEGORIES);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.EXPENSE_CATEGORIES, JSON.stringify(DEFAULT_EXPENSE_CATEGORIES));
        return DEFAULT_EXPENSE_CATEGORIES;
      }
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : DEFAULT_EXPENSE_CATEGORIES;
    } catch {
      return DEFAULT_EXPENSE_CATEGORIES;
    }
  },

  // Synchronous convenience getters for instant initial render
  getVendors(): Vendor[] {
    return this.getVendorsLocal();
  },

  getInvoices(): Invoice[] {
    return this.getInvoicesLocal();
  },

  getInvoiceById(id: string): Invoice | null {
    return this.getInvoicesLocal().find((inv) => inv.id === id) || null;
  },

  getExpenses(): Expense[] {
    return this.getExpensesLocal();
  },

  getExpenseById(id: string): Expense | null {
    return this.getExpensesLocal().find((exp) => exp.id === id) || null;
  },

  getCategories(): ExpenseCategory[] {
    return this.getCategoriesLocal();
  },

  getTaxConfig(): TaxConfig {
    return this.getTaxConfigLocal();
  },

  // Vendor CRUD operations (Persists to Firestore + Local Cache)
  saveVendor(vendor: Omit<Vendor, 'id' | 'createdAt'>): Vendor {
    const newVendor: Vendor = {
      ...vendor,
      id: 'vendor_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      createdAt: new Date().toISOString(),
    };

    // Update local cache synchronously
    const vendors = this.getVendorsLocal();
    vendors.push(newVendor);
    localStorage.setItem(STORAGE_KEYS.VENDORS, JSON.stringify(vendors));

    // Persist to Firestore with sanitized payload (stripping undefined values)
    setDoc(doc(db, COLLECTIONS.VENDORS, newVendor.id), cleanForFirestore(newVendor)).catch((error) => {
      console.error('Error saving vendor to Firestore:', error);
    });

    return newVendor;
  },

  updateVendor(id: string, updates: Partial<Omit<Vendor, 'id' | 'createdAt'>>): Vendor | null {
    const vendors = this.getVendorsLocal();
    const index = vendors.findIndex((v) => v.id === id);
    if (index === -1) return null;
    const updated = { ...vendors[index], ...updates };
    vendors[index] = updated;
    localStorage.setItem(STORAGE_KEYS.VENDORS, JSON.stringify(vendors));

    updateDoc(doc(db, COLLECTIONS.VENDORS, id), cleanForFirestore(updates)).catch((error) => {
      console.error('Error updating vendor in Firestore:', error);
    });

    return updated;
  },

  deleteVendor(id: string): boolean {
    const vendors = this.getVendorsLocal();
    const filtered = vendors.filter((v) => v.id !== id);
    if (filtered.length === vendors.length) return false;
    localStorage.setItem(STORAGE_KEYS.VENDORS, JSON.stringify(filtered));

    deleteDoc(doc(db, COLLECTIONS.VENDORS, id)).catch((error) => {
      console.error('Error deleting vendor from Firestore:', error);
    });

    return true;
  },

  // Invoice CRUD operations (Persists to Firestore + Local Cache)
  saveInvoice(invoice: Omit<Invoice, 'id' | 'createdAt'>): Invoice {
    const rawId = 'inv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const newInvoice = normalizeInvoice({
      ...invoice,
      createdAt: new Date().toISOString()
    }, rawId);

    // Update local cache synchronously
    const invoices = this.getInvoicesLocal();
    invoices.unshift(newInvoice);
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));

    // Persist to Firestore with sanitized payload (stripping undefined values)
    setDoc(doc(db, COLLECTIONS.INVOICES, newInvoice.id), cleanForFirestore(newInvoice)).catch((error) => {
      console.error('Error saving invoice to Firestore:', error);
    });

    return newInvoice;
  },

  updateInvoice(id: string, updates: Partial<Invoice>): Invoice | null {
    const invoices = this.getInvoicesLocal();
    const index = invoices.findIndex((i) => i.id === id);
    if (index === -1) return null;
    
    const merged = { ...invoices[index], ...updates };
    const updated = normalizeInvoice(merged, id);
    invoices[index] = updated;
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));

    setDoc(doc(db, COLLECTIONS.INVOICES, id), cleanForFirestore(updated), { merge: true }).catch((error) => {
      console.error('Error updating invoice in Firestore:', error);
    });

    return updated;
  },

  updateInvoiceStatus(id: string, status: InvoiceStatus, paymentDate?: string): Invoice | null {
    const invoices = this.getInvoicesLocal();
    const index = invoices.findIndex((i) => i.id === id);
    if (index === -1) return null;

    const inv = invoices[index];
    let amountPaid = inv.amountPaid || 0;
    let balanceDue = inv.balanceDue !== undefined ? inv.balanceDue : Math.max(0, inv.grandTotal - amountPaid);
    let pDate = paymentDate || inv.paymentDate;

    if (status === 'PAID') {
      amountPaid = inv.grandTotal;
      balanceDue = 0;
      pDate = pDate || new Date().toISOString().split('T')[0];
    } else if (status === 'OPEN') {
      amountPaid = 0;
      balanceDue = inv.grandTotal;
      pDate = undefined;
    }

    const updated: Invoice = {
      ...inv,
      status,
      amountPaid,
      balanceDue,
      paymentDate: pDate,
    };

    invoices[index] = updated;
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));

    updateDoc(doc(db, COLLECTIONS.INVOICES, id), cleanForFirestore({
      status,
      amountPaid,
      balanceDue,
      paymentDate: pDate || null
    })).catch((error) => {
      console.error('Error updating invoice status in Firestore:', error);
    });

    return updated;
  },

  recordPayment(invoiceId: string, paymentData: Omit<PaymentRecord, 'id' | 'recordedAt'>): Invoice | null {
    const invoices = this.getInvoicesLocal();
    const index = invoices.findIndex((i) => i.id === invoiceId);
    if (index === -1) return null;

    const invoice = invoices[index];
    const newPayment: PaymentRecord = {
      ...paymentData,
      id: 'pmt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      recordedAt: new Date().toISOString()
    };

    const existingPayments = invoice.payments || [];
    const updatedPayments = [...existingPayments, newPayment];
    const amountPaid = updatedPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    const balanceDue = Math.max(0, invoice.grandTotal - amountPaid);

    let newStatus: InvoiceStatus = 'OPEN';
    if (amountPaid >= invoice.grandTotal - 0.001 && invoice.grandTotal > 0) {
      newStatus = 'PAID';
    } else if (amountPaid > 0) {
      newStatus = 'PARTIALLY_PAID';
    }

    const updatedInvoice: Invoice = {
      ...invoice,
      payments: updatedPayments,
      amountPaid,
      balanceDue,
      status: newStatus,
      paymentDate: newStatus === 'PAID'
        ? (newPayment.date || invoice.paymentDate || new Date().toISOString().split('T')[0])
        : (amountPaid > 0 ? (newPayment.date || invoice.paymentDate) : undefined)
    };

    invoices[index] = updatedInvoice;
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));

    setDoc(doc(db, COLLECTIONS.INVOICES, invoiceId), cleanForFirestore(updatedInvoice), { merge: true }).catch((error) => {
      console.error('Error recording payment to Firestore:', error);
    });

    return updatedInvoice;
  },

  updatePayment(invoiceId: string, paymentId: string, updates: Partial<PaymentRecord>): Invoice | null {
    const invoices = this.getInvoicesLocal();
    const index = invoices.findIndex((i) => i.id === invoiceId);
    if (index === -1) return null;

    const invoice = invoices[index];
    const existingPayments = invoice.payments || [];
    const pIndex = existingPayments.findIndex((p) => p.id === paymentId);
    if (pIndex === -1) return null;

    const updatedPayments = [...existingPayments];
    updatedPayments[pIndex] = { ...updatedPayments[pIndex], ...updates };

    const amountPaid = updatedPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    const balanceDue = Math.max(0, invoice.grandTotal - amountPaid);

    let newStatus: InvoiceStatus = 'OPEN';
    if (amountPaid >= invoice.grandTotal - 0.001 && invoice.grandTotal > 0) {
      newStatus = 'PAID';
    } else if (amountPaid > 0) {
      newStatus = 'PARTIALLY_PAID';
    }

    const updatedInvoice: Invoice = {
      ...invoice,
      payments: updatedPayments,
      amountPaid,
      balanceDue,
      status: newStatus,
      paymentDate: newStatus === 'PAID'
        ? (updatedPayments[updatedPayments.length - 1]?.date || invoice.paymentDate || new Date().toISOString().split('T')[0])
        : (amountPaid > 0 ? (updatedPayments[updatedPayments.length - 1]?.date || invoice.paymentDate) : undefined)
    };

    invoices[index] = updatedInvoice;
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));

    setDoc(doc(db, COLLECTIONS.INVOICES, invoiceId), cleanForFirestore(updatedInvoice), { merge: true }).catch((error) => {
      console.error('Error updating payment in Firestore:', error);
    });

    return updatedInvoice;
  },

  deletePayment(invoiceId: string, paymentId: string): Invoice | null {
    const invoices = this.getInvoicesLocal();
    const index = invoices.findIndex((i) => i.id === invoiceId);
    if (index === -1) return null;

    const invoice = invoices[index];
    const existingPayments = invoice.payments || [];
    const updatedPayments = existingPayments.filter((p) => p.id !== paymentId);

    const amountPaid = updatedPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    const balanceDue = Math.max(0, invoice.grandTotal - amountPaid);

    let newStatus: InvoiceStatus = 'OPEN';
    if (amountPaid >= invoice.grandTotal - 0.001 && invoice.grandTotal > 0) {
      newStatus = 'PAID';
    } else if (amountPaid > 0) {
      newStatus = 'PARTIALLY_PAID';
    }

    const updatedInvoice: Invoice = {
      ...invoice,
      payments: updatedPayments,
      amountPaid,
      balanceDue,
      status: newStatus,
      paymentDate: newStatus === 'PAID' ? invoice.paymentDate : (amountPaid > 0 ? invoice.paymentDate : undefined)
    };

    invoices[index] = updatedInvoice;
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));

    setDoc(doc(db, COLLECTIONS.INVOICES, invoiceId), cleanForFirestore(updatedInvoice), { merge: true }).catch((error) => {
      console.error('Error deleting payment from Firestore:', error);
    });

    return updatedInvoice;
  },

  addAttachment(invoiceId: string, attachment: Omit<InvoiceAttachment, 'id' | 'uploadedAt'>): Invoice | null {
    const invoices = this.getInvoicesLocal();
    const index = invoices.findIndex((i) => i.id === invoiceId);
    if (index === -1) return null;

    const invoice = invoices[index];
    const newAttachment: InvoiceAttachment = {
      ...attachment,
      id: 'att_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      uploadedAt: new Date().toISOString(),
    };

    const existingAttachments = invoice.attachments || [];
    const updatedAttachments = [...existingAttachments, newAttachment];

    const updatedInvoice: Invoice = {
      ...invoice,
      attachments: updatedAttachments
    };

    invoices[index] = updatedInvoice;
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));

    setDoc(doc(db, COLLECTIONS.INVOICES, invoiceId), cleanForFirestore(updatedInvoice), { merge: true }).catch((error) => {
      console.error('Error saving attachment to Firestore:', error);
    });

    return updatedInvoice;
  },

  addAttachments(invoiceId: string, attachments: Array<Omit<InvoiceAttachment, 'id' | 'uploadedAt'>>): Invoice | null {
    if (!attachments || attachments.length === 0) return null;
    const invoices = this.getInvoicesLocal();
    const index = invoices.findIndex((i) => i.id === invoiceId);
    if (index === -1) return null;

    const invoice = invoices[index];
    const newAttachments: InvoiceAttachment[] = attachments.map((att, idx) => ({
      ...att,
      id: 'att_' + Date.now() + '_' + idx + '_' + Math.random().toString(36).substring(2, 7),
      uploadedAt: new Date().toISOString(),
    }));

    const existingAttachments = invoice.attachments || [];
    const updatedAttachments = [...existingAttachments, ...newAttachments];

    const updatedInvoice: Invoice = {
      ...invoice,
      attachments: updatedAttachments
    };

    invoices[index] = updatedInvoice;
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));

    setDoc(doc(db, COLLECTIONS.INVOICES, invoiceId), cleanForFirestore(updatedInvoice), { merge: true }).catch((error) => {
      console.error('Error saving attachments to Firestore:', error);
    });

    return updatedInvoice;
  },

  removeAttachment(invoiceId: string, attachmentId: string): Invoice | null {
    const invoices = this.getInvoicesLocal();
    const index = invoices.findIndex((i) => i.id === invoiceId);
    if (index === -1) return null;

    const invoice = invoices[index];
    const existingAttachments = invoice.attachments || [];
    const updatedAttachments = existingAttachments.filter((a) => a.id !== attachmentId);

    const updatedInvoice: Invoice = {
      ...invoice,
      attachments: updatedAttachments
    };

    invoices[index] = updatedInvoice;
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));

    setDoc(doc(db, COLLECTIONS.INVOICES, invoiceId), cleanForFirestore(updatedInvoice), { merge: true }).catch((error) => {
      console.error('Error removing attachment from Firestore:', error);
    });

    return updatedInvoice;
  },

  deleteInvoice(id: string): boolean {
    const invoices = this.getInvoicesLocal();
    const filtered = invoices.filter((i) => i.id !== id);
    if (filtered.length === invoices.length) return false;
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(filtered));

    deleteDoc(doc(db, COLLECTIONS.INVOICES, id)).catch((error) => {
      console.error('Error deleting invoice from Firestore:', error);
    });

    return true;
  },

  isInvoiceNumberTaken(invoiceNumber: string, excludeId?: string): boolean {
    const normalized = invoiceNumber.trim().toUpperCase();
    const invoices = this.getInvoicesLocal();
    return invoices.some((inv) => inv.invoiceNumber.trim().toUpperCase() === normalized && inv.id !== excludeId);
  },

  saveTaxConfig(config: TaxConfig): void {
    localStorage.setItem(STORAGE_KEYS.TAX_CONFIG, JSON.stringify(config));
    setDoc(doc(db, COLLECTIONS.SETTINGS, 'tax_config'), cleanForFirestore(config)).catch((error) => {
      console.error('Error saving tax config to Firestore:', error);
    });
  },

  // Expense CRUD operations (Persists to Firestore + Local Cache)
  saveExpense(expenseData: Omit<Expense, 'id' | 'createdAt'>): Expense {
    const rawId = 'exp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const newExpense = normalizeExpense({
      ...expenseData,
      createdAt: new Date().toISOString()
    }, rawId);

    const expenses = this.getExpensesLocal();
    expenses.unshift(newExpense);
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));

    setDoc(doc(db, COLLECTIONS.EXPENSES, newExpense.id), cleanForFirestore(newExpense)).catch((error) => {
      console.error('Error saving expense to Firestore:', error);
    });

    return newExpense;
  },

  updateExpense(id: string, updates: Partial<Expense>): Expense | null {
    const expenses = this.getExpensesLocal();
    const index = expenses.findIndex((e) => e.id === id);
    if (index === -1) return null;

    const merged = { ...expenses[index], ...updates };
    const updated = normalizeExpense(merged, id);
    expenses[index] = updated;
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));

    setDoc(doc(db, COLLECTIONS.EXPENSES, id), cleanForFirestore(updated), { merge: true }).catch((error) => {
      console.error('Error updating expense in Firestore:', error);
    });

    return updated;
  },

  deleteExpense(id: string): boolean {
    const expenses = this.getExpensesLocal();
    const filtered = expenses.filter((e) => e.id !== id);
    if (filtered.length === expenses.length) return false;
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(filtered));

    deleteDoc(doc(db, COLLECTIONS.EXPENSES, id)).catch((error) => {
      console.error('Error deleting expense from Firestore:', error);
    });

    return true;
  },

  // Category CRUD operations
  saveCategory(name: string, color?: string): ExpenseCategory {
    const trimmed = name.trim();
    const categories = this.getCategoriesLocal();
    const existing = categories.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing;

    const newCat: ExpenseCategory = {
      id: 'cat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: trimmed,
      color: color || '#6366F1',
      isDefault: false,
      createdAt: new Date().toISOString()
    };

    categories.push(newCat);
    localStorage.setItem(STORAGE_KEYS.EXPENSE_CATEGORIES, JSON.stringify(categories));

    setDoc(doc(db, COLLECTIONS.EXPENSE_CATEGORIES, newCat.id), cleanForFirestore(newCat)).catch((error) => {
      console.error('Error saving category to Firestore:', error);
    });

    return newCat;
  },

  deleteCategory(id: string): boolean {
    const categories = this.getCategoriesLocal();
    const filtered = categories.filter((c) => c.id !== id);
    if (filtered.length === categories.length) return false;
    localStorage.setItem(STORAGE_KEYS.EXPENSE_CATEGORIES, JSON.stringify(filtered));

    deleteDoc(doc(db, COLLECTIONS.EXPENSE_CATEGORIES, id)).catch((error) => {
      console.error('Error deleting category from Firestore:', error);
    });

    return true;
  },

  getAuthSession(): { isAuthenticated: boolean; username: string } {
    try {
      const data = sessionStorage.getItem(STORAGE_KEYS.AUTH) || localStorage.getItem(STORAGE_KEYS.AUTH);
      if (data) {
        return JSON.parse(data);
      }
    } catch {}
    return { isAuthenticated: false, username: '' };
  },

  setAuthSession(session: { isAuthenticated: boolean; username: string }, remember: boolean = true): void {
    if (session.isAuthenticated) {
      if (remember) {
        localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(session));
      } else {
        sessionStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(session));
      }
    } else {
      localStorage.removeItem(STORAGE_KEYS.AUTH);
      sessionStorage.removeItem(STORAGE_KEYS.AUTH);
    }
  },

  async resetAllData(): Promise<void> {
    localStorage.setItem(STORAGE_KEYS.VENDORS, JSON.stringify(SEED_VENDORS));
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(SEED_INVOICES));
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.EXPENSE_CATEGORIES, JSON.stringify(DEFAULT_EXPENSE_CATEGORIES));
    localStorage.setItem(STORAGE_KEYS.TAX_CONFIG, JSON.stringify(DEFAULT_TAX_CONFIG));

    try {
      for (const v of SEED_VENDORS) {
        await setDoc(doc(db, COLLECTIONS.VENDORS, v.id), cleanForFirestore(v));
      }
      for (const inv of SEED_INVOICES) {
        await setDoc(doc(db, COLLECTIONS.INVOICES, inv.id), cleanForFirestore(inv));
      }
      const dummyIds = ['exp-seed-1', 'exp-seed-2', 'exp-seed-3'];
      for (const dId of dummyIds) {
        await deleteDoc(doc(db, COLLECTIONS.EXPENSES, dId)).catch(() => {});
      }
      for (const cat of DEFAULT_EXPENSE_CATEGORIES) {
        await setDoc(doc(db, COLLECTIONS.EXPENSE_CATEGORIES, cat.id), cleanForFirestore(cat));
      }
      await setDoc(doc(db, COLLECTIONS.SETTINGS, 'tax_config'), cleanForFirestore(DEFAULT_TAX_CONFIG));
    } catch (e) {
      console.error('Error resetting Firestore data:', e);
    }
  }
};

// Immediate cleanup of any legacy dummy expenses from local storage and Firestore
try {
  const storedExpenses = localStorage.getItem(STORAGE_KEYS.EXPENSES);
  if (storedExpenses) {
    const parsed = JSON.parse(storedExpenses);
    if (Array.isArray(parsed)) {
      const filtered = parsed.filter((e: any) => {
        if (!e) return false;
        const id = String(e.id || '');
        if (id.startsWith('exp-seed-') || id.startsWith('dummy-')) return false;
        const title = String(e.title || '').toLowerCase();
        const payee = String(e.payee || '').toLowerCase();
        if (
          title.includes('tow truck') ||
          title.includes('oil change') ||
          title.includes('routine service') ||
          title.includes('accounting & audit') ||
          title.includes('seed') ||
          payee.includes('caa') ||
          payee.includes('saaq') ||
          payee.includes('petro')
        ) {
          return false;
        }
        return true;
      });
      localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(filtered));
    }
  }
  ['exp-seed-1', 'exp-seed-2', 'exp-seed-3'].forEach((dId) => {
    deleteDoc(doc(db, COLLECTIONS.EXPENSES, dId)).catch(() => {});
  });
} catch (e) {
  // ignore
}
