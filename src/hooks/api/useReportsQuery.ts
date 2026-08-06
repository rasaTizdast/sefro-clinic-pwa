import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "../../lib/query-keys";
import * as reportsService from "../../services/reports";

export function useAllReports() {
  return useQuery({
    queryKey: queryKeys.reports.all,
    queryFn: reportsService.getAllReports,
  });
}

export function useFilteredReports(dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: queryKeys.reports.filtered(dateFrom, dateTo),
    queryFn: () => reportsService.getFilteredReports(dateFrom, dateTo),
    enabled: !!dateFrom || !!dateTo,
  });
}

export function useCustomerBreakdown(dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: queryKeys.reports.customers(dateFrom, dateTo),
    queryFn: () => reportsService.getCustomerBreakdown(dateFrom, dateTo),
  });
}

export function useVisitComparison() {
  return useQuery({
    queryKey: ["reports", "visit-comparison"] as const,
    queryFn: reportsService.getVisitComparison,
  });
}

export function useReferralRate(dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: queryKeys.reports.referral(dateFrom, dateTo),
    queryFn: () => reportsService.getReferralRate(dateFrom, dateTo),
  });
}

export function useVisitReports(dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ["reports", "visit-reports", dateFrom, dateTo] as const,
    queryFn: () => reportsService.getVisitReports(dateFrom, dateTo),
  });
}
