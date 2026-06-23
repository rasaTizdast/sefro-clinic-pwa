import { endpoints } from "../config/api";
import { apiClient } from "../lib/api-client";

interface ReportsData {
  customerCount: number;
  totalRevenue: number;
  retentionRate: number | null;
  monthlyRevenue: { month: string; revenue: number }[];
  appointmentStats: { name: string; value: number; color: string }[];
  monthlyVisits: { month: string; visits: number }[];
  serviceCategoryStats: { name: string; value: number }[];
}

type RawAllReports = Record<string, unknown> & {
  totalCustomers?: number;
  totalSales?: number;
  totalVisits?: number;
  salesChart?: { monthly?: { period: string; total: number }[] };
  customerStatus?: Record<string, number>;
  servicePopularity?: { id: number; name: string; usage: number }[];
  avgSatisfaction?: number;
};

type RawFilteredReports = Record<string, unknown> & {
  totalSales?: number;
  totalVisits?: number;
  monthly?: { period: string; total: number }[];
  servicePopularity?: { id: number; name: string; usage: number }[];
  avgSatisfaction?: number;
  customerBreakdown?: { total?: number };
};

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  confirmed: "#3b82f6",
  completed: "#10b981",
  canceled: "#ef4444",
};

function toReportsData(raw: RawAllReports | RawFilteredReports, isAll: boolean): ReportsData {
  const monthlyRaw = isAll
    ? (raw as RawAllReports).salesChart?.monthly
    : (raw as RawFilteredReports).monthly;

  const monthlyRevenue = (monthlyRaw ?? []).map((m) => ({
    month: m.period,
    revenue: m.total,
  }));

  const customerStatus = isAll ? (raw as RawAllReports).customerStatus : undefined;

  const appointmentStats = customerStatus
    ? Object.entries(customerStatus).map(([key, value]) => ({
        name:
          key === "pending"
            ? "در انتظار"
            : key === "confirmed"
              ? "تأیید شده"
              : key === "completed"
                ? "انجام شده"
                : key === "canceled"
                  ? "لغو شده"
                  : key,
        value,
        color: STATUS_COLORS[key] ?? "#94a3b8",
      }))
    : [];

  const popularity = (raw.servicePopularity ?? []).slice(0, 10);
  const serviceCategoryStats = popularity.map((s) => ({
    name: s.name,
    value: s.usage,
  }));

  const customerCount = isAll
    ? ((raw as RawAllReports).totalCustomers ?? 0)
    : ((raw as RawFilteredReports).customerBreakdown?.total ?? 0);

  return {
    customerCount,
    totalRevenue: raw.totalSales ?? 0,
    retentionRate: null,
    monthlyRevenue,
    appointmentStats,
    monthlyVisits: [],
    serviceCategoryStats,
  };
}

export const getAllReports = async (): Promise<ReportsData> => {
  const { data } = await apiClient.get(endpoints.reports.all);
  return toReportsData(data as RawAllReports, true);
};

export const getFilteredReports = async (
  dateFrom?: string,
  dateTo?: string
): Promise<ReportsData> => {
  const { data } = await apiClient.get(endpoints.reports.filtered, {
    params: { dateFrom, dateTo },
  });
  return toReportsData(data as RawFilteredReports, false);
};

export const getCustomerBreakdown = async () => {
  const { data } = await apiClient.get(endpoints.reports.customers);
  return data;
};

export const getVisitComparison = async () => {
  const { data } = await apiClient.get(endpoints.reports.visits);
  return data;
};

export const getReferralRate = async () => {
  const { data } = await apiClient.get(endpoints.reports.referral);
  return data;
};
