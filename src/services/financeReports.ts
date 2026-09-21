import { endpoints } from "../config/api";
import { apiClient } from "../lib/api-client";
import { jalaliToGregorianISO } from "../lib/date";
import type { FinanceDashboard, FinancialSummary, ProfitRow, ReportPeriod } from "../types/finance";

const USD = "0.00";
const TOMAN = "0";

export interface ReportQuery {
  period?: ReportPeriod;
  startDateJalali?: string;
  endDateJalali?: string;
  service?: number;
  package?: number;
  product?: number;
  personnel?: number;
  staff?: number;
  role?: string;
}

/**
 * Shared query builder for the finance report endpoints.
 * A named `period` wins; Jalali dates are converted to Gregorian
 * `start_date`/`end_date` only when no period is given.
 */
export function toReportParams(query: ReportQuery = {}): Record<string, string | number> {
  const params: Record<string, string | number> = {};
  if (query.period) {
    params.period = query.period;
  } else {
    if (query.startDateJalali) params.start_date = jalaliToGregorianISO(query.startDateJalali);
    if (query.endDateJalali) params.end_date = jalaliToGregorianISO(query.endDateJalali);
  }
  if (query.service !== undefined) params.service = query.service;
  if (query.package !== undefined) params.package = query.package;
  if (query.product !== undefined) params.product = query.product;
  if (query.personnel !== undefined) params.personnel = query.personnel;
  if (query.staff !== undefined) params.staff = query.staff;
  if (query.role) params.role = query.role;
  return params;
}

type RawFinancialSummary = Record<string, unknown> & {
  period?: { start: string; end: string };
  revenue?: { usd: string; toman: string };
  productCost?: { usd: string; toman: string };
  grossProfit?: { usd: string; toman: string };
  expenses?: { usd: string; toman: string };
  netProfit?: { usd: string; toman: string };
  paymentMethods?: { cash: string; card: string; wallet: string };
  counts?: {
    appointments: number;
    packagesSold: number;
    productsSoldQuantity: string;
    paidSales: number;
    averageTransactionValue: string;
  };
};

type RawProfitRow = Record<string, unknown> & {
  serviceId?: number;
  packageId?: number;
  staffId?: number;
  serviceName?: string;
  packageName?: string;
  staffName?: string;
  revenueUsd?: string;
  productCostUsd?: string;
  count?: number;
  visitCount?: number;
  profitUsd?: string;
  profitMarginPercent?: string;
  revenueToman?: string;
  productCostToman?: string;
  profitToman?: string;
};

type RawFinanceDashboard = Record<string, unknown> & {
  period?: { start: string; end: string };
  salesSummary?: FinanceDashboard["salesSummary"];
  operational?: FinanceDashboard["operational"];
};

const emptyMoney = { usd: USD, toman: TOMAN };

export const toFinancialSummary = (raw: RawFinancialSummary): FinancialSummary => ({
  period: raw.period ?? { start: "", end: "" },
  revenue: raw.revenue ?? { ...emptyMoney },
  productCost: raw.productCost ?? { ...emptyMoney },
  grossProfit: raw.grossProfit ?? { ...emptyMoney },
  expenses: raw.expenses ?? { ...emptyMoney },
  netProfit: raw.netProfit ?? { ...emptyMoney },
  paymentMethods: raw.paymentMethods ?? { cash: USD, card: USD, wallet: USD },
  counts: raw.counts ?? {
    appointments: 0,
    packagesSold: 0,
    productsSoldQuantity: "0.000",
    paidSales: 0,
    averageTransactionValue: USD,
  },
});

export const toProfitRow = (raw: RawProfitRow): ProfitRow => ({
  serviceId: raw.serviceId,
  packageId: raw.packageId,
  staffId: raw.staffId,
  serviceName: raw.serviceName,
  packageName: raw.packageName,
  staffName: raw.staffName,
  revenueUsd: raw.revenueUsd ?? USD,
  productCostUsd: raw.productCostUsd ?? USD,
  count: raw.count,
  visitCount: raw.visitCount,
  profitUsd: raw.profitUsd ?? USD,
  profitMarginPercent: raw.profitMarginPercent,
  revenueToman: raw.revenueToman,
  productCostToman: raw.productCostToman,
  profitToman: raw.profitToman,
});

export const toFinanceDashboard = (raw: RawFinanceDashboard): FinanceDashboard => ({
  period: raw.period ?? { start: "", end: "" },
  salesSummary: raw.salesSummary ?? {
    revenueUsd: USD,
    revenueToman: TOMAN,
    grossProfitUsd: USD,
    grossProfitToman: TOMAN,
    expensesUsd: USD,
    expensesToman: TOMAN,
    netProfitUsd: USD,
    netProfitToman: TOMAN,
    totalPayoutUsd: USD,
    totalPayoutToman: TOMAN,
    saleCount: 0,
    avgTicketUsd: USD,
    paymentMethods: { cash: USD, card: USD, wallet: USD },
  },
  operational: raw.operational ?? { visitsCompleted: 0, newCustomers: 0, staffPayoutCount: 0 },
});

const asArray = (data: unknown): RawProfitRow[] => (Array.isArray(data) ? data : []);

export async function getFinancialSummary(query: ReportQuery = {}): Promise<FinancialSummary> {
  const { data } = await apiClient.get(endpoints.finance.financialSummary, {
    params: toReportParams(query),
  });
  return toFinancialSummary(data as RawFinancialSummary);
}

export async function getProfitByService(query: ReportQuery = {}): Promise<ProfitRow[]> {
  const { data } = await apiClient.get(endpoints.finance.profitByService, {
    params: toReportParams(query),
  });
  return asArray(data).map(toProfitRow);
}

export async function getProfitByPackage(query: ReportQuery = {}): Promise<ProfitRow[]> {
  const { data } = await apiClient.get(endpoints.finance.profitByPackage, {
    params: toReportParams(query),
  });
  return asArray(data).map(toProfitRow);
}

export async function getProfitByStaff(query: ReportQuery = {}): Promise<ProfitRow[]> {
  const { data } = await apiClient.get(endpoints.finance.profitByStaff, {
    params: toReportParams(query),
  });
  return asArray(data).map(toProfitRow);
}

export async function getFinanceDashboard(query: ReportQuery = {}): Promise<FinanceDashboard> {
  const { data } = await apiClient.get(endpoints.finance.dashboard, {
    params: toReportParams(query),
  });
  return toFinanceDashboard(data as RawFinanceDashboard);
}
