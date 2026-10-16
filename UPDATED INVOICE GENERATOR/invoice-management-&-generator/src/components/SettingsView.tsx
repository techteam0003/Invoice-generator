import React, { useState } from 'react';
import {
  Settings,
  Percent,
  Building,
  Save,
  CheckCircle2,
  Database,
  RotateCcw,
  Download,
  Upload,
  Info,
  ShieldCheck,
  FileCheck
} from 'lucide-react';
import { TaxConfig, TaxType } from '../types';
import { MASTER_COMPANY_INFO } from '../constants/companyInfo';

interface SettingsViewProps {
  taxConfig: TaxConfig;
  onSaveTaxConfig: (config: TaxConfig) => void;
  onResetData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  taxConfig,
  onSaveTaxConfig,
  onResetData,
}) => {
  const [defaultTaxType, setDefaultTaxType] = useState<TaxType>(taxConfig.taxType);
  const [hstRate, setHstRate] = useState(taxConfig.hstRate || 13.0);
  const [gstRate, setGstRate] = useState(taxConfig.gstRate || 5.0);
  const [qstRate, setQstRate] = useState(taxConfig.qstRate || 9.975);
  const [customTaxRate, setCustomTaxRate] = useState(taxConfig.customTaxRate || 13.0);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveTax = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveTaxConfig({
      taxType: defaultTaxType,
      hstRate: Number(hstRate),
      gstRate: Number(gstRate),
      qstRate: Number(qstRate),
      customTaxRate: Number(customTaxRate),
      customTaxLabel: 'Tax',
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleExportData = () => {
    const data = {
      invoices: localStorage.getItem('bk_invoice_manager_invoices_v1'),
      vendors: localStorage.getItem('bk_invoice_manager_vendors_v1'),
      taxConfig: localStorage.getItem('bk_invoice_manager_tax_config_v1'),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `InvoiceManager_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-indigo-600" />
          Tax Settings & Master Template Information
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure default tax rates (HST / Quebec GST+QST), inspect fixed company information, and manage data.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>Tax configuration saved successfully. New invoices will use these settings.</span>
        </div>
      )}

      {/* Tax Configuration Card */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Percent className="w-4 h-4 text-indigo-600" />
            Tax Calculation Preferences
          </h2>
          <span className="text-[11px] text-slate-400 font-medium">Default: 13% HST</span>
        </div>

        <form onSubmit={handleSaveTax} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Default Tax Mode for New Invoices
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label
                className={`p-3.5 rounded-lg border flex flex-col justify-between cursor-pointer transition ${
                  defaultTaxType === 'HST'
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 ring-1 ring-indigo-600'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">HST (Standard)</span>
                  <input
                    type="radio"
                    name="taxType"
                    checked={defaultTaxType === 'HST'}
                    onChange={() => setDefaultTaxType('HST')}
                    className="text-indigo-600"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  Default 13.00% applied across all line items.
                </p>
              </label>

              <label
                className={`p-3.5 rounded-lg border flex flex-col justify-between cursor-pointer transition ${
                  defaultTaxType === 'QUEBEC'
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 ring-1 ring-indigo-600'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">Quebec (GST + QST)</span>
                  <input
                    type="radio"
                    name="taxType"
                    checked={defaultTaxType === 'QUEBEC'}
                    onChange={() => setDefaultTaxType('QUEBEC')}
                    className="text-indigo-600"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  5% GST + 9.975% QST = <strong>14.975%</strong> total.
                </p>
              </label>

              <label
                className={`p-3.5 rounded-lg border flex flex-col justify-between cursor-pointer transition ${
                  defaultTaxType === 'CUSTOM'
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 ring-1 ring-indigo-600'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">Custom Tax Rate</span>
                  <input
                    type="radio"
                    name="taxType"
                    checked={defaultTaxType === 'CUSTOM'}
                    onChange={() => setDefaultTaxType('CUSTOM')}
                    className="text-indigo-600"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  Specify an arbitrary tax percentage.
                </p>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                HST Percentage (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={hstRate}
                onChange={(e) => setHstRate(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Quebec Total Rate (%)
              </label>
              <div className="w-full px-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-mono font-bold">
                14.975% (5% GST + 9.975% QST)
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Custom Tax Rate (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={customTaxRate}
                onChange={(e) => setCustomTaxRate(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end">
            <button
              type="submit"
              id="save-tax-settings-btn"
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Tax Settings</span>
            </button>
          </div>
        </form>
      </div>

      {/* Fixed Master Company Info View (Read-Only Template Info) */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Building className="w-4 h-4 text-indigo-600" />
            Master Invoice Company Information (Fixed Template)
          </h2>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
            PROTECTED MASTER TEMPLATE
          </span>
        </div>

        <p className="text-xs text-slate-500">
          As required, the fixed company header, address, tax registration numbers, and vehicle sourcing disclaimer remain constant across all generated invoices.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
          <div>
            <span className="text-slate-400 font-semibold block text-[10px] uppercase">Company Legal Name:</span>
            <span className="font-bold text-slate-900">{MASTER_COMPANY_INFO.name}</span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold block text-[10px] uppercase">Official Address:</span>
            <span className="font-medium text-slate-900">{MASTER_COMPANY_INFO.address}</span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold block text-[10px] uppercase">Email Address:</span>
            <span className="font-medium text-slate-900">{MASTER_COMPANY_INFO.email}</span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold block text-[10px] uppercase">NEQ:</span>
            <span className="font-mono font-bold text-slate-900">{MASTER_COMPANY_INFO.neq}</span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold block text-[10px] uppercase">GST Registration Number:</span>
            <span className="font-mono font-bold text-slate-900">{MASTER_COMPANY_INFO.gstRegNo}</span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold block text-[10px] uppercase">QST Registration Number:</span>
            <span className="font-mono font-bold text-slate-900">{MASTER_COMPANY_INFO.qstRegNo}</span>
          </div>
        </div>

        <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1">
          <p className="font-bold flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-amber-700" />
            Payment Terms & Disclaimer:
          </p>
          <p className="text-[11px] text-amber-800">
            • <strong>Payable To:</strong> {MASTER_COMPANY_INFO.chequePayableTo}
          </p>
          <p className="text-[10.5px] text-amber-700 italic">
            • <strong>Disclaimer:</strong> {MASTER_COMPANY_INFO.disclaimer}
          </p>
        </div>
      </div>

      {/* Data Management & Backup */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-600" />
            Database & Cloud Firestore Synchronization
          </h2>
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            Cloud Firestore Active
          </span>
        </div>

        <p className="text-xs text-slate-600">
          All vendor profiles, generated invoices, line items, and tax configurations are permanently synchronized in real-time with Google Cloud Firestore database.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleExportData}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-indigo-600" />
            <span>Export Database Backup (.json)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (window.confirm('Reset all invoices and vendors in Firestore to original master sample seed data?')) {
                onResetData();
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg border border-rose-200 transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-rose-600" />
            <span>Reset Firestore to Sample Seed</span>
          </button>
        </div>
      </div>
    </div>
  );
};
