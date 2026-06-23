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

export function useCustomerBreakdown() {
  return useQuery({
    queryKey: queryKeys.reports.customers,
    queryFn: reportsService.getCustomerBreakdown,
  });
}

export function useVisitComparison() {
  return useQuery({
    queryKey: queryKeys.reports.visits,
    queryFn: reportsService.getVisitComparison,
  });
}

export function useReferralRate() {
  return useQuery({
    queryKey: queryKeys.reports.referral,
    queryFn: reportsService.getReferralRate,
  });
}
