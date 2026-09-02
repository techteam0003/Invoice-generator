import React, { useState, useEffect } from 'react';
import { storage } from './services/storage';
import { Invoice, Vendor, TaxConfig, ActiveNavTab } from './types';
import { LoginView } from './components/LoginView';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { VendorManager } from './components/VendorManager';
import { CreateInvoiceView } from './components/CreateInvoiceView';
import { InvoiceListView } from './components/InvoiceListView';
import { SettingsView } from './components/SettingsView';
import { InvoicePreviewModal } from './components/InvoicePreviewModal';
import { downloadInvoicePDF } from './utils/pdfGenerator';
import {
  Menu,
  X,
  FilePlus2,
  Bell,
  Search,
  CheckCircle2,
  Building,
  Shield
} from 'lucide-react';

export default function App() {
  // 1. Auth State
  const [auth, setAuth] = useState<{ isAuthenticated: boolean; username: string }>(() =>
    storage.getAuthSession()
  );

  // 2. Navigation State
  const [activeTab, setActiveTab] = useState<ActiveNavTab>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // 3. Database State with Real-Time Firestore Synchronization
  const [invoices, setInvoices] = useState<Invoice[]>(() => storage.getInvoices());
  const [vendors, setVendors] = useState<Vendor[]>(() => storage.getVendors());
  const [taxConfig, setTaxConfig] = useState<TaxConfig>(() => storage.getTaxConfig());
  const [isDbConnected, setIsDbConnected] = useState(true);

  // 4. Modal & Preview States
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [selectedVendorForInvoice, setSelectedVendorForInvoice] = useState<Vendor | null>(null);
  const [globalToast, setGlobalToast] = useState<{ message: string; type?: 'success' | 'info' } | null>(null);

  // Real-time Firestore Subscriptions
  useEffect(() => {
    const unsubVendors = storage.subscribeVendors((updatedVendors) => {
      setVendors(updatedVendors);
    });
    const unsubInvoices = storage.subscribeInvoices((updatedInvoices) => {
      setInvoices(updatedInvoices);
    });
    const unsubTax = storage.subscribeTaxConfig((updatedTax) => {
      setTaxConfig(updatedTax);
    });

    return () => {
      unsubVendors();
      unsubInvoices();
      unsubTax();
    };
  }, []);

  // Sync state helpers
  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setGlobalToast({ message, type });
    setTimeout(() => setGlobalToast(null), 3500);
  };

  const handleLoginSuccess = (username: string) => {
    const session = { isAuthenticated: true, username };
    storage.setAuthSession(session, true);
    setAuth(session);
    showToast(`Welcome back, ${username}! Invoice Management active.`);
  };

  const handleLogout = () => {
    storage.setAuthSession({ isAuthenticated: false, username: '' }, false);
    setAuth({ isAuthenticated: false, username: '' });
    setActiveTab('dashboard');
  };

  // Vendor handlers
  const handleAddVendor = (vendorData: Omit<Vendor, 'id' | 'createdAt'>): Vendor => {
    const saved = storage.saveVendor(vendorData);
    setVendors(storage.getVendors());
    showToast(`Vendor ${saved.companyName} added & saved to Firestore.`);
    return saved;
  };

  const handleUpdateVendor = (id: string, updates: Partial<Omit<Vendor, 'id' | 'createdAt'>>) => {
    storage.updateVendor(id, updates);
    setVendors(storage.getVendors());
    showToast('Vendor details updated in Firestore.');
  };

  const handleDeleteVendor = (id: string) => {
    storage.deleteVendor(id);
    setVendors(storage.getVendors());
    showToast('Vendor removed.');
  };

  const handleCreateInvoiceForVendor = (vendor: Vendor) => {
    setSelectedVendorForInvoice(vendor);
    setActiveTab('create-invoice');
  };

  // Invoice handlers
  const handleSaveInvoice = (invoiceData: Omit<Invoice, 'id' | 'createdAt'>): Invoice | null => {
    const saved = storage.saveInvoice(invoiceData);
    setInvoices(storage.getInvoices());
    showToast(`Invoice ${saved.invoiceNumber} saved permanently to Firestore.`);
    return saved;
  };

  const handleMarkAsPaid = (invoiceId: string, paymentDate?: string) => {
    const updated = storage.updateInvoiceStatus(invoiceId, 'PAID', paymentDate);
    setInvoices(storage.getInvoices());
    if (previewInvoice && previewInvoice.id === invoiceId && updated) {
      setPreviewInvoice(updated);
    }
    showToast(`Invoice marked as PAID in database.`);
  };

  const handleMarkAsOpen = (invoiceId: string) => {
    const updated = storage.updateInvoiceStatus(invoiceId, 'OPEN');
    setInvoices(storage.getInvoices());
    if (previewInvoice && previewInvoice.id === invoiceId && updated) {
      setPreviewInvoice(updated);
    }
    showToast(`Invoice status updated to OPEN in database.`);
  };

  const handleDeleteInvoice = (invoiceId: string) => {
    storage.deleteInvoice(invoiceId);
    setInvoices(storage.getInvoices());
    if (previewInvoice?.id === invoiceId) {
      setPreviewInvoice(null);
    }
    showToast(`Invoice deleted from database.`);
  };

  const handleDownloadInvoice = (invoice: Invoice) => {
    // Open preview modal and trigger download or download directly
    setPreviewInvoice(invoice);
  };

  const handleInvoiceCreated = (invoice: Invoice) => {
    setPreviewInvoice(invoice);
    setActiveTab('all-invoices');
  };

  const handleSaveTaxConfig = (config: TaxConfig) => {
    storage.saveTaxConfig(config);
    setTaxConfig(config);
    showToast('Tax preferences saved to database.');
  };

  const handleResetData = async () => {
    await storage.resetAllData();
    setInvoices(storage.getInvoices());
    setVendors(storage.getVendors());
    setTaxConfig(storage.getTaxConfig());
    showToast('Database reset to master sample seed data.');
  };

  // Metrics
  const openCount = invoices.filter((i) => i.status === 'OPEN').length;
  const paidCount = invoices.filter((i) => i.status === 'PAID').length;

  // Unauthenticated screen
  if (!auth.isAuthenticated) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-screen bg-[#F8F9FA] text-slate-800 overflow-hidden font-sans">
      {/* Toast Notification */}
      {globalToast && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-fade-in text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{globalToast.message}</span>
        </div>
      )}

      {/* Desktop Sidebar (Left Panel) */}
      <div className="hidden md:flex">
        <Sidebar
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            if (tab !== 'create-invoice') setSelectedVendorForInvoice(null);
          }}
          openCount={openCount}
          paidCount={paidCount}
          vendorCount={vendors.length}
          totalInvoiceCount={invoices.length}
          onLogout={handleLogout}
          username={auth.username}
        />
      </div>

      {/* Mobile Drawer Sidebar */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <div className="relative w-64 bg-slate-900 z-10 flex flex-col h-full shadow-2xl">
            <Sidebar
              activeTab={activeTab}
              onTabChange={(tab) => {
                setActiveTab(tab);
                setIsMobileSidebarOpen(false);
                if (tab !== 'create-invoice') setSelectedVendorForInvoice(null);
              }}
              openCount={openCount}
              paidCount={paidCount}
              vendorCount={vendors.length}
              totalInvoiceCount={invoices.length}
              onLogout={handleLogout}
              username={auth.username}
            />
          </div>
        </div>
      )}

      {/* Main Content (Right Panel) */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top App Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between flex-shrink-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-2 text-slate-600 hover:text-slate-900 md:hidden rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-slate-800 tracking-tight">
                9572-1049 QUÉBEC INC.
              </span>
              <span className="hidden sm:inline-block text-[11px] text-slate-400">
                • BillFlow Master AR26
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-xs font-medium bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-full border border-emerald-200">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span>Firestore Connected</span>
            </div>

            <button
              id="top-create-invoice-quick-btn"
              onClick={() => {
                setSelectedVendorForInvoice(null);
                setActiveTab('create-invoice');
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold rounded-lg shadow-sm transition cursor-pointer"
            >
              <FilePlus2 className="w-3.5 h-3.5" />
              <span>+ Create Invoice</span>
            </button>

            <div className="flex items-center gap-2 pl-3 border-l border-slate-200 text-xs text-slate-600 font-medium">
              <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs border border-indigo-200">
                {auth.username}
              </span>
              <span className="hidden sm:inline font-semibold text-slate-800">{auth.username}</span>
            </div>
          </div>
        </header>

        {/* Scrollable Dashboard Views Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#F8F9FA]">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && (
              <DashboardView
                invoices={invoices}
                vendors={vendors}
                onNavigate={(tab) => {
                  setActiveTab(tab);
                  if (tab !== 'create-invoice') setSelectedVendorForInvoice(null);
                }}
                onViewInvoice={(inv) => setPreviewInvoice(inv)}
                onDownloadInvoice={(inv) => handleDownloadInvoice(inv)}
                onMarkAsPaid={handleMarkAsPaid}
                onDeleteInvoice={handleDeleteInvoice}
              />
            )}

            {activeTab === 'create-invoice' && (
              <CreateInvoiceView
                vendors={vendors}
                taxConfig={taxConfig}
                initialVendor={selectedVendorForInvoice}
                onSaveInvoice={handleSaveInvoice}
                onOpenVendorModal={() => setActiveTab('vendors')}
                isInvoiceNumberTaken={(num) => storage.isInvoiceNumberTaken(num)}
                onInvoiceCreated={handleInvoiceCreated}
              />
            )}

            {activeTab === 'vendors' && (
              <VendorManager
                vendors={vendors}
                onAddVendor={handleAddVendor}
                onUpdateVendor={handleUpdateVendor}
                onDeleteVendor={handleDeleteVendor}
                onCreateInvoiceForVendor={handleCreateInvoiceForVendor}
              />
            )}

            {activeTab === 'all-invoices' && (
              <InvoiceListView
                invoices={invoices}
                vendors={vendors}
                title="All Generated Invoices"
                subtitle="Complete history of all generated invoices stored permanently with live master PDF templates."
                statusFilterPreset="ALL"
                onViewInvoice={(inv) => setPreviewInvoice(inv)}
                onDownloadInvoice={(inv) => handleDownloadInvoice(inv)}
                onMarkAsPaid={handleMarkAsPaid}
                onMarkAsOpen={handleMarkAsOpen}
                onDeleteInvoice={handleDeleteInvoice}
                onCreateNewInvoice={() => {
                  setSelectedVendorForInvoice(null);
                  setActiveTab('create-invoice');
                }}
              />
            )}

            {activeTab === 'open-invoices' && (
              <InvoiceListView
                invoices={invoices}
                vendors={vendors}
                title="Open / Unpaid Invoices"
                subtitle="Invoices awaiting client payment. Mark as Paid when payment is received to close the invoice."
                statusFilterPreset="OPEN"
                onViewInvoice={(inv) => setPreviewInvoice(inv)}
                onDownloadInvoice={(inv) => handleDownloadInvoice(inv)}
                onMarkAsPaid={handleMarkAsPaid}
                onMarkAsOpen={handleMarkAsOpen}
                onDeleteInvoice={handleDeleteInvoice}
                onCreateNewInvoice={() => {
                  setSelectedVendorForInvoice(null);
                  setActiveTab('create-invoice');
                }}
              />
            )}

            {activeTab === 'paid-invoices' && (
              <InvoiceListView
                invoices={invoices}
                vendors={vendors}
                title="Paid / Completed Invoices"
                subtitle="Closed invoices with recorded payment completion dates and finalized receipts."
                statusFilterPreset="PAID"
                onViewInvoice={(inv) => setPreviewInvoice(inv)}
                onDownloadInvoice={(inv) => handleDownloadInvoice(inv)}
                onMarkAsPaid={handleMarkAsPaid}
                onMarkAsOpen={handleMarkAsOpen}
                onDeleteInvoice={handleDeleteInvoice}
                onCreateNewInvoice={() => {
                  setSelectedVendorForInvoice(null);
                  setActiveTab('create-invoice');
                }}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsView
                taxConfig={taxConfig}
                onSaveTaxConfig={handleSaveTaxConfig}
                onResetData={handleResetData}
              />
            )}
          </div>
        </main>
      </div>

      {/* Full Screen High-Fidelity Master Invoice Preview Modal */}
      {previewInvoice && (
        <InvoicePreviewModal
          invoice={previewInvoice}
          onClose={() => setPreviewInvoice(null)}
          onMarkAsPaid={handleMarkAsPaid}
          onMarkAsOpen={handleMarkAsOpen}
          onDeleteInvoice={handleDeleteInvoice}
        />
      )}
    </div>
  );
}
