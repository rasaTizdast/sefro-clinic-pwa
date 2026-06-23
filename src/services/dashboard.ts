import { endpoints } from "../config/api";
import { apiClient } from "../lib/api-client";

export interface DashboardStats {
  customerCount: number;
  loyalCustomerCount: number;
  todaySales: number;
  todayVisits: number;
  newCustomers: number;
}

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const { data } = await apiClient.get(endpoints.dashboard.stats);
  return data as unknown as DashboardStats;
};
