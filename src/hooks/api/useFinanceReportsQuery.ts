import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "../../lib/query-keys";
import type { ReportQuery } from "../../services/financeReports";
import * as financeReportsService from "../../services/financeReports";

export function useFinancialSummary(query: ReportQuery = {}) {
  return useQuery({
    queryKey: queryKeys.finance.financialSummary({ ...query }),
    queryFn: () => financeReportsService.getFinancialSummary(query),
  });
}

export function useProfitByService(query: ReportQuery = {}) {
  return useQuery({
    queryKey: queryKeys.finance.profitByService({ ...query }),
    queryFn: () => financeReportsService.getProfitByService(query),
  });
}

export function useProfitByPackage(query: ReportQuery = {}) {
  return useQuery({
    queryKey: queryKeys.finance.profitByPackage({ ...query }),
    queryFn: () => financeReportsService.getProfitByPackage(query),
  });
}

export function useProfitByStaff(query: ReportQuery = {}) {
  return useQuery({
    queryKey: queryKeys.finance.profitByStaff({ ...query }),
    queryFn: () => financeReportsService.getProfitByStaff(query),
  });
}

export function useFinanceDashboard(query: ReportQuery = {}) {
  return useQuery({
    queryKey: queryKeys.finance.dashboard({ ...query }),
    queryFn: () => financeReportsService.getFinanceDashboard(query),
  });
}
