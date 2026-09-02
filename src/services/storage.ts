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
import { Invoice, Vendor, TaxConfig } from '../types';
import { DEFAULT_TAX_CONFIG } from '../constants/companyInfo';

const COLLECTIONS = {
  VENDORS: 'vendors',
  INVOICES: 'invoices',
  SETTINGS: 'settings'
};

const STORAGE_KEYS = {
  INVOICES: 'bk_invoice_manager_invoices_v1',
  VENDORS: 'bk_invoice_manager_vendors_v1',
  TAX_CONFIG: 'bk_invoice_manager_tax_config_v1',
  AUTH: 'bk_invoice_manager_auth_v1',
};

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
  }
];

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
              const data = docSnap.data() as any;
              if (data) {
                list.push({
                  id: docSnap.id,
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
                  items: Array.isArray(data.items)
                    ? data.items.map((it: any) => ({
                        id: it.id || 'item-' + Math.random().toString(36).substring(2, 6),
                        title: it.title || '',
                        subDetails: it.subDetails || undefined,
                        quantity: Number(it.quantity) || 1,
                        rate: Number(it.rate) || 0,
                        amount: Number(it.amount) || 0,
                      }))
                    : [],
                  subtotal: Number(data.subtotal) || 0,
                  taxType: data.taxType || 'HST',
                  taxRate: Number(data.taxRate) || 13,
                  taxAmount: Number(data.taxAmount) || 0,
                  gstAmount: data.gstAmount !== undefined && data.gstAmount !== null ? Number(data.gstAmount) : undefined,
                  qstAmount: data.qstAmount !== undefined && data.qstAmount !== null ? Number(data.qstAmount) : undefined,
                  grandTotal: Number(data.grandTotal) || 0,
                  status: data.status === 'PAID' ? 'PAID' : 'OPEN',
                  paymentDate: data.paymentDate || undefined,
                  createdAt: data.createdAt || new Date().toISOString(),
                  notes: data.notes || undefined,
                });
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
        localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(SEED_INVOICES));
        return SEED_INVOICES;
      }
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : SEED_INVOICES;
    } catch {
      return SEED_INVOICES;
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

  // Synchronous convenience getters for instant initial render
  getVendors(): Vendor[] {
    return this.getVendorsLocal();
  },

  getInvoices(): Invoice[] {
    return this.getInvoicesLocal();
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
    const newInvoice: Invoice = {
      ...invoice,
      id: 'inv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      createdAt: new Date().toISOString(),
    };

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
    const updated = { ...invoices[index], ...updates };
    invoices[index] = updated;
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));

    updateDoc(doc(db, COLLECTIONS.INVOICES, id), cleanForFirestore(updates)).catch((error) => {
      console.error('Error updating invoice in Firestore:', error);
    });

    return updated;
  },

  updateInvoiceStatus(id: string, status: 'OPEN' | 'PAID', paymentDate?: string): Invoice | null {
    const invoices = this.getInvoicesLocal();
    const index = invoices.findIndex((i) => i.id === id);
    if (index === -1) return null;
    invoices[index].status = status;
    invoices[index].paymentDate = status === 'PAID' ? (paymentDate || new Date().toISOString().split('T')[0]) : undefined;
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));

    updateDoc(doc(db, COLLECTIONS.INVOICES, id), cleanForFirestore({
      status,
      paymentDate: invoices[index].paymentDate || null
    })).catch((error) => {
      console.error('Error updating invoice status in Firestore:', error);
    });

    return invoices[index];
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
    localStorage.setItem(STORAGE_KEYS.TAX_CONFIG, JSON.stringify(DEFAULT_TAX_CONFIG));

    try {
      for (const v of SEED_VENDORS) {
        await setDoc(doc(db, COLLECTIONS.VENDORS, v.id), cleanForFirestore(v));
      }
      for (const inv of SEED_INVOICES) {
        await setDoc(doc(db, COLLECTIONS.INVOICES, inv.id), cleanForFirestore(inv));
      }
      await setDoc(doc(db, COLLECTIONS.SETTINGS, 'tax_config'), cleanForFirestore(DEFAULT_TAX_CONFIG));
    } catch (e) {
      console.error('Error resetting Firestore data:', e);
    }
  }
};
