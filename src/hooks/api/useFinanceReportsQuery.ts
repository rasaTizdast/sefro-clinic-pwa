import { useQueries, useQuery } from "@tanstack/react-query";

import { queryKeys } from "../../lib/query-keys";
import type { ReportQuery } from "../../services/financeReports";
import * as financeReportsService from "../../services/financeReports";
import type { MonthlyCloseMonth } from "../../types/finance";

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

export interface MonthlyCloseMonthRow {
  /** Shamsi month 1–12 of the requested year. */
  month: number;
  /** Absent while that month is still loading or failed. */
  report?: MonthlyCloseMonth;
  isError: boolean;
}

/**
 * One request per Shamsi month, in parallel, instead of the year-wide report.
 *
 * The year endpoint builds a full P&L for every month server-side — the
 * slowest read in the app — while a single-month request carries one month's
 * build. Each row still comes back as its frozen snapshot when the month is
 * closed. Summary figures are summed from these rows on the client.
 */
export function useMonthlyCloseMonths(year: number) {
  const months = Array.from({ length: 12 }, (_, index) => index + 1);
  const results = useQueries({
    queries: months.map((month) => ({
      queryKey: queryKeys.finance.monthlyClose({ year, month }),
      queryFn: () => financeReportsService.getMonthlyClose({ year, month }),
    })),
  });

  return {
    rows: results.map(
      (result, index): MonthlyCloseMonthRow => ({
        month: months[index],
        report: result.data?.months?.[0],
        isError: result.isError,
      })
    ),
    // Skeleton only until the first month lands; then rows fill in as they come.
    isLoading: results.every((result) => result.isLoading),
    isError: results.some((result) => result.isError),
    refetchAll: () => Promise.all(results.map((result) => result.refetch())),
  };
}
