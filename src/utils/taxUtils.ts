import { InvoiceItem, TaxType } from '../types';

export interface ItemTaxBreakdown {
  taxRate: number;
  gstRate: number;
  gstAmount: number;
  qstRate: number;
  qstAmount: number;
  taxAmount: number;
}

export function roundCurrency(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100;
}

/**
 * Calculates the independent tax breakdown for a single invoice line item.
 */
export function calculateItemTaxBreakdown(
  item: Pick<InvoiceItem, 'amount' | 'taxRate' | 'gstRate' | 'gstAmount' | 'qstRate' | 'qstAmount' | 'taxAmount'>,
  taxType: TaxType,
  invoiceTaxRate: number
): ItemTaxBreakdown {
  const taxableAmount = Number(item.amount) || 0;

  if (taxType === 'QUEBEC') {
    const gstRate = item.gstRate !== undefined ? Number(item.gstRate) : 5.0;
    const qstRate = item.qstRate !== undefined ? Number(item.qstRate) : 9.975;
    const gstAmount =
      item.gstAmount !== undefined
        ? roundCurrency(item.gstAmount)
        : roundCurrency(taxableAmount * (gstRate / 100));
    const qstAmount =
      item.qstAmount !== undefined
        ? roundCurrency(item.qstAmount)
        : roundCurrency(taxableAmount * (qstRate / 100));
    const taxAmount =
      item.taxAmount !== undefined
        ? roundCurrency(item.taxAmount)
        : roundCurrency(gstAmount + qstAmount);

    return {
      taxRate: item.taxRate !== undefined ? Number(item.taxRate) : Number((gstRate + qstRate).toFixed(4)),
      gstRate,
      gstAmount,
      qstRate,
      qstAmount,
      taxAmount,
    };
  }

  const effectiveRate = item.taxRate !== undefined ? Number(item.taxRate) : Number(invoiceTaxRate) || 0;
  const taxAmount =
    item.taxAmount !== undefined
      ? roundCurrency(item.taxAmount)
      : roundCurrency(taxableAmount * (effectiveRate / 100));

  return {
    taxRate: effectiveRate,
    gstRate: 0,
    gstAmount: 0,
    qstRate: 0,
    qstAmount: 0,
    taxAmount,
  };
}
