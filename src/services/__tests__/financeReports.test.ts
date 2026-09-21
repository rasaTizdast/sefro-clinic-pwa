import { beforeEach, describe, expect, it, vi } from "vitest";

import * as apiClient from "../../lib/api-client";
import {
  getFinanceDashboard,
  getFinancialSummary,
  getProfitByPackage,
  getProfitByService,
  getProfitByStaff,
  toReportParams,
} from "../financeReports";

vi.mock("../../lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mock = vi.mocked(apiClient.apiClient);

describe("toReportParams", () => {
  it("sends period when given (period wins over dates)", () => {
    expect(
      toReportParams({
        period: "today",
        startDateJalali: "1404/06/28",
        endDateJalali: "1404/06/28",
      })
    ).toEqual({ period: "today" });
  });

  it("converts Jalali dates to Gregorian start_date/end_date when no period", () => {
    const params = toReportParams({
      startDateJalali: "1404/06/28",
      endDateJalali: "1404/06/29",
    });
    expect(params.start_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(params.end_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(params.period).toBeUndefined();
  });

  it("passes through entity filters", () => {
    expect(toReportParams({ period: "this_month", service: 3, staff: 7 })).toEqual({
      period: "this_month",
      service: 3,
      staff: 7,
    });
  });
});

describe("financeReports service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("getFinancialSummary hits endpoint with ?period=today and maps the summary", async () => {
    mock.get.mockResolvedValue({
      data: {
        period: { start: "2026-09-20", end: "2026-09-20" },
        revenue: { usd: "100.00", toman: "10000000" },
        productCost: { usd: "20.00", toman: "2000000" },
        grossProfit: { usd: "80.00", toman: "8000000" },
        expenses: { usd: "0.00", toman: "0" },
        netProfit: { usd: "80.00", toman: "8000000" },
        paymentMethods: { cash: "60.00", card: "40.00", wallet: "0.00" },
        counts: {
          appointments: 5,
          packagesSold: 1,
          productsSoldQuantity: "2.000",
          paidSales: 4,
          averageTransactionValue: "25.00",
        },
      },
    });

    const summary = await getFinancialSummary({ period: "today" });

    expect(mock.get).toHaveBeenCalledWith("/finance/reports/financial-summary/", {
      params: { period: "today" },
    });
    expect(summary.revenue.usd).toBe("100.00");
    expect(summary.counts.paidSales).toBe(4);
  });

  it("getFinancialSummary sends Gregorian dates for a Jalali range", async () => {
    mock.get.mockResolvedValue({
      data: {
        period: { start: "2026-09-19", end: "2026-09-20" },
        revenue: { usd: "0.00", toman: "0" },
        productCost: { usd: "0.00", toman: "0" },
        grossProfit: { usd: "0.00", toman: "0" },
        expenses: { usd: "0.00", toman: "0" },
        netProfit: { usd: "0.00", toman: "0" },
        paymentMethods: { cash: "0.00", card: "0.00", wallet: "0.00" },
        counts: {
          appointments: 0,
          packagesSold: 0,
          productsSoldQuantity: "0.000",
          paidSales: 0,
          averageTransactionValue: "0.00",
        },
      },
    });

    await getFinancialSummary({ startDateJalali: "1404/06/28", endDateJalali: "1404/06/29" });

    expect(mock.get).toHaveBeenCalledWith(
      "/finance/reports/financial-summary/",
      expect.objectContaining({
        params: expect.objectContaining({ start_date: expect.any(String) }),
      })
    );
  });

  it("getProfitByService returns an array of ProfitRow", async () => {
    mock.get.mockResolvedValue({
      data: [
        {
          serviceId: 1,
          serviceName: "فیشال",
          revenueUsd: "50.00",
          productCostUsd: "10.00",
          profitUsd: "40.00",
          count: 3,
        },
      ],
    });

    const rows = await getProfitByService({ period: "this_month" });

    expect(mock.get).toHaveBeenCalledWith("/finance/reports/profit-by-service/", {
      params: { period: "this_month" },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].serviceName).toBe("فیشال");
    expect(rows[0].profitUsd).toBe("40.00");
  });

  it("getProfitByPackage / getProfitByStaff hit their endpoints", async () => {
    mock.get.mockResolvedValue({ data: [] });

    await getProfitByPackage({ period: "today" });
    expect(mock.get).toHaveBeenCalledWith("/finance/reports/profit-by-package/", {
      params: { period: "today" },
    });

    await getProfitByStaff({ period: "today" });
    expect(mock.get).toHaveBeenCalledWith("/finance/reports/profit-by-staff/", {
      params: { period: "today" },
    });
  });

  it("getFinanceDashboard maps the dashboard payload", async () => {
    mock.get.mockResolvedValue({
      data: {
        period: { start: "2026-09-20", end: "2026-09-20" },
        salesSummary: {
          revenueUsd: "100.00",
          revenueToman: "10000000",
          grossProfitUsd: "80.00",
          grossProfitToman: "8000000",
          expensesUsd: "0.00",
          expensesToman: "0",
          netProfitUsd: "80.00",
          netProfitToman: "8000000",
          totalPayoutUsd: "10.00",
          totalPayoutToman: "1000000",
          saleCount: 4,
          avgTicketUsd: "25.00",
          paymentMethods: { cash: "60.00", card: "40.00", wallet: "0.00" },
        },
        operational: { visitsCompleted: 5, newCustomers: 2, staffPayoutCount: 3 },
      },
    });

    const dashboard = await getFinanceDashboard({ period: "today" });

    expect(mock.get).toHaveBeenCalledWith("/finance/reports/dashboard/", {
      params: { period: "today" },
    });
    expect(dashboard.salesSummary.saleCount).toBe(4);
    expect(dashboard.operational.visitsCompleted).toBe(5);
  });
});
