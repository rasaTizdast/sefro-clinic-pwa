import { endpoints } from "../config/api";
import { apiClient } from "../lib/api-client";
import { toShamsiApiDay } from "../lib/date";
import type {
  FinanceDashboard,
  FinancialSummary,
  Money,
  MonthlyCloseAction,
  MonthlyCloseReport,
  ProfitRow,
  ReportPeriod,
  StaffCompensationByRole,
} from "../types/finance";

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
 * A named `period` wins; explicit ranges are sent as Jalali `start_date`/
 * `end_date` — the API rejects Gregorian dates with a 400.
 */
export function toReportParams(query: ReportQuery = {}): Record<string, string | number> {
  const params: Record<string, string | number> = {};
  if (query.period) {
    params.period = query.period;
  } else {
    const startDay = toShamsiApiDay(query.startDateJalali ?? null);
    const endDay = toShamsiApiDay(query.endDateJalali ?? null);
    if (startDay) params.start_date = startDay;
    if (endDay) params.end_date = endDay;
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
  revenueBasis?: string;
  productCost?: { usd: string; toman: string };
  welcomePackCost?: { usd: string; toman: string };
  grossProfit?: { usd: string; toman: string };
  expenses?: { usd: string; toman: string };
  staffCompensation?: {
    cash?: { usd: string; toman: string };
    product?: { usd: string; toman: string };
    total?: { usd: string; toman: string };
    payoutCount?: number;
    byRole?: Record<string, RawStaffRole>;
  };
  operatingExpenses?: { usd: string; toman: string; count?: number };
  staffExpenseClaims?: { usd: string; toman: string; count?: number };
  belowTheLineTotal?: { usd: string; toman: string };
  netProfit?: { usd: string; toman: string };
  clinicShare?: { usd: string; toman: string };
  costCoverage?: { zeroCostRows?: number; productsMissingCost?: number[] };
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
  revenueBasis?: string;
  operatorCompensationUsd?: string;
  operatorCompensationBasis?: string;
  welcomePackCostUsd?: string;
  recipeEstimateCostUsd?: string;
  clinicShareUsd?: string;
  welcomePackCostBasis?: string;
};

type RawFinanceDashboard = Record<string, unknown> & {
  period?: { start: string; end: string };
  salesSummary?: FinanceDashboard["salesSummary"];
  operational?: FinanceDashboard["operational"];
};

const emptyMoney = { usd: USD, toman: TOMAN };

const emptyStaffCompensation = {
  cash: { ...emptyMoney },
  product: { ...emptyMoney },
  total: { ...emptyMoney },
  payoutCount: 0,
  byRole: {} as Record<string, StaffCompensationByRole>,
};

type RawMoney = { usd?: string; toman?: string };

type RawStaffRole = Record<string, unknown> & {
  role?: string;
  count?: number;
  cashUsd?: string;
  cashToman?: string;
  productUsd?: string;
  productToman?: string;
  totalUsd?: string;
  totalToman?: string;
};

const toMoney = (raw: RawMoney | undefined): Money => ({
  usd: raw?.usd ?? USD,
  toman: raw?.toman ?? TOMAN,
});

const toStaffRole = (raw: RawStaffRole): StaffCompensationByRole => ({
  role: raw.role ?? "",
  count: raw.count ?? 0,
  cashUsd: raw.cashUsd ?? USD,
  cashToman: raw.cashToman ?? TOMAN,
  productUsd: raw.productUsd ?? USD,
  productToman: raw.productToman ?? TOMAN,
  totalUsd: raw.totalUsd ?? USD,
  totalToman: raw.totalToman ?? TOMAN,
});

export const toFinancialSummary = (raw: RawFinancialSummary): FinancialSummary => {
  const byRoleRaw = (raw.staffCompensation?.byRole ?? {}) as Record<string, RawStaffRole>;
  const byRole: Record<string, StaffCompensationByRole> = {};
  for (const [key, value] of Object.entries(byRoleRaw)) {
    if (!value) continue;
    byRole[key] = toStaffRole(value);
  }

  return {
    period: raw.period ?? { start: "", end: "" },
    revenue: toMoney(raw.revenue),
    revenueBasis: raw.revenueBasis ?? "sale_ledger",
    productCost: toMoney(raw.productCost),
    welcomePackCost: toMoney(raw.welcomePackCost),
    grossProfit: toMoney(raw.grossProfit),
    // `expenses` is the backend's long-standing alias for staff expense claims;
    // `staffExpenseClaims` is the explicit name for the same money.
    expenses: toMoney(raw.expenses ?? raw.staffExpenseClaims),
    staffCompensation: raw.staffCompensation
      ? {
          cash: toMoney(raw.staffCompensation.cash),
          product: toMoney(raw.staffCompensation.product),
          total: toMoney(raw.staffCompensation.total),
          payoutCount: raw.staffCompensation.payoutCount ?? 0,
          byRole,
        }
      : emptyStaffCompensation,
    operatingExpenses: {
      ...toMoney(raw.operatingExpenses),
      count: raw.operatingExpenses?.count ?? 0,
    },
    staffExpenseClaims: {
      ...toMoney(raw.staffExpenseClaims ?? raw.expenses),
      count: raw.staffExpenseClaims?.count ?? 0,
    },
    belowTheLineTotal: toMoney(raw.belowTheLineTotal),
    netProfit: toMoney(raw.netProfit),
    clinicShare: toMoney(raw.clinicShare),
    costCoverage: {
      zeroCostRows: raw.costCoverage?.zeroCostRows ?? 0,
      productsMissingCost: raw.costCoverage?.productsMissingCost ?? [],
    },
    paymentMethods: raw.paymentMethods ?? { cash: USD, card: USD, wallet: USD },
    counts: raw.counts ?? {
      appointments: 0,
      packagesSold: 0,
      productsSoldQuantity: "0.000",
      paidSales: 0,
      averageTransactionValue: USD,
    },
  };
};

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
  revenueBasis: raw.revenueBasis as ProfitRow["revenueBasis"],
  operatorCompensationUsd: raw.operatorCompensationUsd,
  operatorCompensationBasis: raw.operatorCompensationBasis,
  welcomePackCostUsd: raw.welcomePackCostUsd,
  recipeEstimateCostUsd: raw.recipeEstimateCostUsd,
  clinicShareUsd: raw.clinicShareUsd,
  welcomePackCostBasis: raw.welcomePackCostBasis,
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
    clinicShareUsd: USD,
    clinicShareToman: TOMAN,
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

export interface MonthlyCloseQuery {
  /** Shamsi year. Omitted → the backend's current Shamsi year. */
  year?: number;
  /** One month of that year instead of all twelve. */
  month?: number;
}

/**
 * The monthly-close report builds a full P&L per Shamsi month server-side
 * (`financials.build_report`), and the tab fans out into twelve parallel
 * single-month requests — Django serves them from one worker, so twelve in
 * flight can still each outlive the global 10 s axios timeout, which aborts
 * the XHR and shows the request as canceled in the browser. Same patient
 * budget as the welcome-pack endpoints.
 */
export const MONTHLY_CLOSE_TIMEOUT_MS = 30_000;

/**
 * A Shamsi year of monthly P&L, each month next to its operator pay.
 *
 * This endpoint carries its own calendar (`year`/`month`), not the shared
 * `period=`/`start_date` builder: `year` selects the Shamsi year and `month`
 * narrows it to one Shamsi month, both already in the Shamsi shapes the API
 * speaks everywhere else.
 */
export async function getMonthlyClose(query: MonthlyCloseQuery = {}): Promise<MonthlyCloseReport> {
  const params: { year?: number; month?: number } = {};
  if (query.year !== undefined) params.year = query.year;
  if (query.month !== undefined) params.month = query.month;
  const { data } = await apiClient.get(endpoints.finance.monthlyClose, {
    params,
    timeout: MONTHLY_CLOSE_TIMEOUT_MS,
  });
  return data as MonthlyCloseReport;
}

/** Freeze one past Shamsi month. Idempotent — re-closing returns the same row. */
export async function closeMonthlyMonth(payload: {
  year: number;
  month: number;
  note?: string;
}): Promise<MonthlyCloseAction> {
  const { data } = await apiClient.post(endpoints.finance.monthlyCloseClose, payload, {
    timeout: MONTHLY_CLOSE_TIMEOUT_MS,
  });
  return data as MonthlyCloseAction;
}

/** Un-freeze a closed month. The backend requires a written, audited reason. */
export async function reopenMonthlyMonth(payload: {
  year: number;
  month: number;
  reason: string;
}): Promise<MonthlyCloseAction> {
  const { data } = await apiClient.post(endpoints.finance.monthlyCloseReopen, payload, {
    timeout: MONTHLY_CLOSE_TIMEOUT_MS,
  });
  return data as MonthlyCloseAction;
}
