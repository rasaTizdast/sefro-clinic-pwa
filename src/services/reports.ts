import { endpoints } from "../config/api";
import { apiClient } from "../lib/api-client";

interface SalesChartEntry {
  period: string;
  total: number;
}

interface ReportsData {
  customerCount: number;
  totalRevenue: number;
  totalVisits: number;
  retentionRate: number | null;
  avgSatisfaction: number;
  monthlyRevenue: { month: string; revenue: number }[];
  appointmentStats: { name: string; value: number; color: string }[];
  monthlyVisits: { month: string; visits: number }[];
  serviceCategoryStats: { name: string; value: number }[];
  salesChart: {
    daily: SalesChartEntry[];
    weekly: SalesChartEntry[];
    monthly: SalesChartEntry[];
    quarterly: SalesChartEntry[];
    yearly: SalesChartEntry[];
  };
}

const toNumber = (value: unknown): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") {
    const normalized = Number(value);
    return Number.isNaN(normalized) ? 0 : normalized;
  }
  return 0;
};

type RawSalesChart = {
  daily?: { period: string; total: number }[];
  weekly?: { period: string; total: number }[];
  monthly?: { period: string; total: number }[];
  quarterly?: { period: string; total: number }[];
  yearly?: { period: string; total: number }[];
};

type RawAllReports = Record<string, unknown> &
  RawSalesChart & {
    totalCustomers?: number;
    totalSales?: number;
    totalVisits?: number;
    salesChart?: RawSalesChart;
    customerStatus?: Record<string, number>;
    servicePopularity?: { id: number; name: string; usage: number }[];
    avgSatisfaction?: number;
  };

type RawFilteredReports = Record<string, unknown> &
  RawSalesChart & {
    totalSales?: number;
    totalVisits?: number;
    servicePopularity?: { id: number; name: string; usage: number }[];
    avgSatisfaction?: number;
    customerBreakdown?: { total?: number };
  };

type RawVisitsReport = Record<string, unknown> & {
  currentCount?: number;
  previousCount?: number | null;
  changePercent?: number | null;
};

type RawReferralReport = Record<string, unknown> & {
  referralRate?: number;
  newCustomers?: number;
  returningCustomers?: number;
};

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  confirmed: "#3b82f6",
  completed: "#10b981",
  canceled: "#ef4444",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "در انتظار",
  confirmed: "تأیید شده",
  completed: "انجام شده",
  canceled: "لغو شده",
};

function toAppointmentStat(key: string, value: number) {
  return {
    name: STATUS_LABELS[key] ?? key,
    value,
    color: STATUS_COLORS[key] ?? "#94a3b8",
  };
}

function extractChart(raw: RawAllReports | RawFilteredReports) {
  const chart = (raw.salesChart ?? raw) as RawSalesChart;
  return {
    daily: (chart.daily ?? []).map((e) => ({ period: e.period, total: toNumber(e.total) })),
    weekly: (chart.weekly ?? []).map((e) => ({ period: e.period, total: toNumber(e.total) })),
    monthly: (chart.monthly ?? []).map((e) => ({ period: e.period, total: toNumber(e.total) })),
    quarterly: (chart.quarterly ?? []).map((e) => ({ period: e.period, total: toNumber(e.total) })),
    yearly: (chart.yearly ?? []).map((e) => ({ period: e.period, total: toNumber(e.total) })),
  };
}

function isAllReports(raw: RawAllReports | RawFilteredReports): raw is RawAllReports {
  return "totalCustomers" in raw;
}

function extractAppointmentStats(raw: RawAllReports | RawFilteredReports) {
  const customerStatus = isAllReports(raw) ? raw.customerStatus : undefined;
  if (!customerStatus) return [];

  return Object.entries(customerStatus).map(([key, value]) =>
    toAppointmentStat(key, toNumber(value))
  );
}

function toReportsData(raw: RawAllReports | RawFilteredReports): ReportsData {
  const chart = extractChart(raw);
  const monthlyRevenue = chart.monthly.map((m) => ({
    month: m.period,
    revenue: m.total,
  }));
  const appointmentStats = extractAppointmentStats(raw);
  const popularity = (raw.servicePopularity ?? []).slice(0, 10);
  const serviceCategoryStats = popularity.map((s) => ({
    name: s.name,
    value: s.usage,
  }));
  const customerCount = isAllReports(raw)
    ? (raw.totalCustomers ?? 0)
    : ((raw as RawFilteredReports).customerBreakdown?.total ?? 0);

  return {
    customerCount: toNumber(customerCount),
    totalRevenue: toNumber(raw.totalSales),
    totalVisits: toNumber(raw.totalVisits),
    retentionRate: null,
    avgSatisfaction: toNumber(raw.avgSatisfaction),
    monthlyRevenue,
    appointmentStats,
    monthlyVisits: [],
    serviceCategoryStats,
    salesChart: chart,
  };
}

export const getAllReports = async (): Promise<ReportsData> => {
  const { data } = await apiClient.get(endpoints.reports.all);
  return toReportsData(data as RawAllReports);
};

export const getFilteredReports = async (
  dateFrom?: string,
  dateTo?: string
): Promise<ReportsData> => {
  const { data } = await apiClient.get(endpoints.reports.filtered, {
    params: { dateFrom, dateTo },
  });
  return toReportsData(data as RawFilteredReports);
};

export const getCustomerBreakdown = async (
  dateFrom?: string,
  dateTo?: string
): Promise<{
  byVisitStatus: { name: string; value: number; color: string }[];
  newCustomers: number;
  loyalCustomers: number;
  total: number;
}> => {
  const { data } = await apiClient.get(endpoints.reports.customers, {
    params: { dateFrom, dateTo },
  });
  const raw = data as Record<string, unknown> & {
    byVisitStatus?: Record<string, number>;
    newCustomers?: number;
    loyalCustomers?: number;
    total?: number;
  };
  return {
    byVisitStatus: Object.entries(raw.byVisitStatus ?? {}).map(([key, value]) =>
      toAppointmentStat(key, toNumber(value))
    ),
    newCustomers: toNumber(raw.newCustomers),
    loyalCustomers: toNumber(raw.loyalCustomers),
    total: toNumber(raw.total),
  };
};

export const getVisitReports = async (
  dateFrom?: string,
  dateTo?: string
): Promise<{
  currentCount: number;
  previousCount: number | null;
  changePercent: number | null;
}> => {
  const { data } = await apiClient.get(endpoints.reports.visits, {
    params: { dateFrom, dateTo },
  });
  const raw = data as RawVisitsReport;
  return {
    currentCount: toNumber(raw.currentCount),
    previousCount: raw.previousCount == null ? null : toNumber(raw.previousCount),
    changePercent: raw.changePercent == null ? null : toNumber(raw.changePercent),
  };
};

export const getReferralReports = async (
  dateFrom?: string,
  dateTo?: string
): Promise<{ referralRate: number }> => {
  const { data } = await apiClient.get(endpoints.reports.referral, {
    params: { dateFrom, dateTo },
  });
  const raw = data as RawReferralReport;
  return {
    referralRate: raw.referralRate ?? 0,
  };
};

export const getVisitComparison = async () => {
  const { data } = await apiClient.get(endpoints.reports.visits);
  return data;
};

export const getReferralRate = async (dateFrom?: string, dateTo?: string) => {
  const { data } = await apiClient.get(endpoints.reports.referral, {
    params: { dateFrom, dateTo },
  });
  return data;
};
