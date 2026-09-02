import { MasterCompanyInfo } from '../types';

export const MASTER_COMPANY_INFO: MasterCompanyInfo = {
  name: "9572-1049 QUEBEC INC",
  address: "112-19 Rue De L'église Sud, Lacolle QC J0J 1J0",
  email: "Admin@artgroupca.com",
  neq: "1182367905",
  gstRegNo: "798239240 RT 0001",
  qstRegNo: "1234032361 TQ 0001",
  chequePayableTo: "9572-1049 QUEBEC INC.",
  disclaimer: "9572-1049 QUÉBEC INC. provides vehicle sourcing and market locating services only. The fee invoiced is solely for locating and presenting a potential vehicle and is separate from the vehicle purchase price. 9572-1049 QUÉBEC INC. does not buy, sell, own, take title to, transfer, or receive purchase funds for any vehicle. All vehicle purchases, negotiations, payments, ownership transfers, and related transactions are handled directly between the purchasing dealer and the seller. The purchasing dealer is responsible for its own due diligence."
};

export const DEFAULT_TAX_CONFIG = {
  taxType: 'HST' as const,
  hstRate: 13.0,
  gstRate: 5.0,
  qstRate: 9.975,
  customTaxRate: 13.0,
  customTaxLabel: 'Tax'
};
