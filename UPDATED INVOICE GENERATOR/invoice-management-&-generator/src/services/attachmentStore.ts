/**
 * Attachment Store Service
 * Handles multi-tier storage for invoice and expense attachments:
 * 1. In-memory cache for synchronous instant access
 * 2. IndexedDB for persistent large client-side storage (bypassing the 5MB localStorage limit)
 * 3. Firestore subcollections with automatic chunking (bypassing Firestore 1MB single-document limit)
 */
import { InvoiceAttachment } from '../types';
import { db } from './firebase';
import { collection, doc, getDoc, setDoc, deleteDoc, getDocs } from 'firebase/firestore';

const DB_NAME = 'bk_invoice_attachments_db';
const DB_VERSION = 1;
const STORE_NAME = 'attachments';
const CHUNK_SIZE = 450000; // 450 KB per chunk to stay well under Firestore 1MB doc limit

// In-memory cache for ultra-fast synchronous lookups
const memoryCache = new Map<string, string>();

let idbPromise: Promise<IDBDatabase> | null = null;

function getIDB(): Promise<IDBDatabase> {
  if (idbPromise) return idbPromise;
  idbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e: any) => {
      const dbInstance = e.target.result as IDBDatabase;
      if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
        dbInstance.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return idbPromise;
}

/**
 * Splits a base64 dataUrl into chunks of safe size for Firestore storage.
 */
export function splitDataUrl(dataUrl: string, chunkSize = CHUNK_SIZE): string[] {
  if (!dataUrl) return [];
  const chunks: string[] = [];
  let index = 0;
  while (index < dataUrl.length) {
    chunks.push(dataUrl.substring(index, index + chunkSize));
    index += chunkSize;
  }
  return chunks;
}

/**
 * Optimizes an image file if it exceeds target dimensions to save bandwidth and storage.
 */
export async function optimizeImageFile(file: File, maxDimension = 1800, quality = 0.85): Promise<string> {
  if (!file.type.startsWith('image/') || file.type.includes('svg')) {
    return readFileAsDataUrl(file);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const rawDataUrl = e.target?.result as string;
      if (!rawDataUrl) {
        reject(new Error('Failed to read image'));
        return;
      }

      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width <= maxDimension && height <= maxDimension && file.size < 600 * 1024) {
          // File is already reasonably sized, keep as-is
          resolve(rawDataUrl);
          return;
        }

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(rawDataUrl);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Use JPEG for photographic formats to get great compression, or PNG if transparent
        const outputFormat = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const compressedDataUrl = canvas.toDataURL(outputFormat, quality);
        resolve(compressedDataUrl);
      };
      img.onerror = () => resolve(rawDataUrl);
      img.src = rawDataUrl;
    };
    reader.onerror = () => reject(new Error(`Failed to read file ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) resolve(result);
      else reject(new Error(`Empty file ${file.name}`));
    };
    reader.onerror = () => reject(new Error(`Error reading file ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export const attachmentStore = {
  /**
   * Caches dataUrl synchronously in memory
   */
  setMemoryCache(id: string, dataUrl: string): void {
    if (id && dataUrl) {
      memoryCache.set(id, dataUrl);
    }
  },

  getMemoryCache(id: string): string | null {
    return memoryCache.get(id) || null;
  },

  /**
   * Saves an attachment to IndexedDB for persistent offline availability
   */
  async saveToIndexedDB(att: InvoiceAttachment, invoiceId?: string): Promise<void> {
    if (!att.id || !att.dataUrl) return;
    this.setMemoryCache(att.id, att.dataUrl);

    try {
      const dbInstance = await getIDB();
      await new Promise<void>((resolve, reject) => {
        const tx = dbInstance.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put({
          id: att.id,
          invoiceId: invoiceId || '',
          name: att.name,
          size: att.size,
          type: att.type,
          dataUrl: att.dataUrl,
          uploadedAt: att.uploadedAt || new Date().toISOString(),
        });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) {
      console.warn('[attachmentStore] IndexedDB save warning:', e);
    }
  },

  /**
   * Retrieves dataUrl from memory cache, IndexedDB, or Firestore
   */
  async getAttachmentDataUrl(attId: string, invoiceId?: string): Promise<string | null> {
    if (!attId) return null;

    // 1. Check memory cache
    const cached = memoryCache.get(attId);
    if (cached) return cached;

    // 2. Check IndexedDB
    try {
      const dbInstance = await getIDB();
      const fromIDB = await new Promise<any>((resolve) => {
        const tx = dbInstance.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(attId);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      });

      if (fromIDB && fromIDB.dataUrl) {
        this.setMemoryCache(attId, fromIDB.dataUrl);
        return fromIDB.dataUrl;
      }
    } catch {
      // ignore
    }

    // 3. Fallback to Firestore subcollection if invoiceId provided
    if (invoiceId && db) {
      try {
        const attDocRef = doc(db, 'invoices', invoiceId, 'attachments', attId);
        const snap = await getDoc(attDocRef);
        if (snap.exists()) {
          const data = snap.data();
          let fullDataUrl = '';
          if (Array.isArray(data.chunks) && data.chunks.length > 0) {
            fullDataUrl = data.chunks.join('');
          } else if (data.dataUrl) {
            fullDataUrl = data.dataUrl;
          }

          if (fullDataUrl) {
            this.setMemoryCache(attId, fullDataUrl);
            this.saveToIndexedDB({
              id: attId,
              name: data.name || 'attachment',
              size: data.size || 0,
              type: data.type || 'application/octet-stream',
              dataUrl: fullDataUrl,
              uploadedAt: data.uploadedAt || new Date().toISOString(),
            }, invoiceId);
            return fullDataUrl;
          }
        }
      } catch (err) {
        console.warn('[attachmentStore] Firestore attachment fetch warning:', err);
      }
    }

    return null;
  },

  /**
   * Persists attachments into Firestore subcollection invoices/{invoiceId}/attachments/{attId}
   * Uses chunking if dataUrl exceeds single-chunk limit.
   */
  async persistAttachmentsToFirestore(invoiceId: string, attachments: InvoiceAttachment[]): Promise<void> {
    if (!invoiceId || !attachments || attachments.length === 0 || !db) return;

    for (const att of attachments) {
      // Ensure local caches are primed
      if (att.dataUrl) {
        this.setMemoryCache(att.id, att.dataUrl);
        await this.saveToIndexedDB(att, invoiceId);
      }

      const dataUrl = att.dataUrl || this.getMemoryCache(att.id);
      if (!dataUrl) continue;

      try {
        const chunks = splitDataUrl(dataUrl, CHUNK_SIZE);
        const attDocRef = doc(db, 'invoices', invoiceId, 'attachments', att.id);

        const payload: any = {
          id: att.id,
          name: att.name,
          size: att.size,
          type: att.type,
          uploadedAt: att.uploadedAt || new Date().toISOString(),
          invoiceId,
          chunkCount: chunks.length,
        };

        if (chunks.length <= 1) {
          payload.dataUrl = dataUrl;
          payload.chunks = chunks;
        } else {
          payload.chunks = chunks;
          payload.dataUrl = ''; // omit monolithic field to keep doc under 1MB
        }

        await setDoc(attDocRef, payload, { merge: true });
      } catch (err) {
        console.error(`[attachmentStore] Error persisting attachment ${att.id} to Firestore:`, err);
      }
    }
  },

  /**
   * Deletes an attachment from IndexedDB and Firestore subcollection
   */
  async deleteAttachment(invoiceId: string, attId: string): Promise<void> {
    memoryCache.delete(attId);

    try {
      const dbInstance = await getIDB();
      const tx = dbInstance.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(attId);
    } catch {
      // ignore
    }

    if (invoiceId && db) {
      try {
        await deleteDoc(doc(db, 'invoices', invoiceId, 'attachments', attId));
      } catch {
        // ignore
      }
    }
  },

  /**
   * Prepares attachments for embedding in the main invoice document.
   * If an attachment is small (< 75KB), it keeps dataUrl inline for instant offline preview;
   * otherwise, dataUrl is omitted from the main invoice document so it never exceeds 1MB.
   */
  sanitizeForInvoiceDoc(attachments: InvoiceAttachment[]): InvoiceAttachment[] {
    return attachments.map((att) => {
      const dataUrl = att.dataUrl || this.getMemoryCache(att.id) || '';
      return {
        id: att.id,
        name: att.name,
        size: att.size,
        type: att.type,
        uploadedAt: att.uploadedAt,
        // Inline small attachments (<75KB dataUrl string length) for instant access;
        // large files are fetched on demand from IndexedDB / Firestore subcollection
        dataUrl: dataUrl.length < 75000 ? dataUrl : '',
      };
    });
  }
};
