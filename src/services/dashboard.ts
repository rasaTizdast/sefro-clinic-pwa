import { endpoints } from "../config/api";
import { apiClient } from "../lib/api-client";

export interface DashboardStats {
  customerCount: number;
  loyalCustomerCount: number;
  todaySales: number;
  todayVisits: number;
  newCustomers: number;
}

type RawDashboardStats = Record<string, unknown> & {
  customerCount?: number;
  loyalCustomerCount?: number;
  todaySales?: string | number;
  todayVisits?: number;
  newCustomers?: number;
};

const toDashboardStats = (raw: RawDashboardStats): DashboardStats => ({
  customerCount: raw.customerCount ?? 0,
  loyalCustomerCount: raw.loyalCustomerCount ?? 0,
  todaySales: Number(raw.todaySales ?? 0),
  todayVisits: raw.todayVisits ?? 0,
  newCustomers: raw.newCustomers ?? 0,
});

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const { data } = await apiClient.get(endpoints.dashboard.stats);
  return toDashboardStats(data as RawDashboardStats);
};
