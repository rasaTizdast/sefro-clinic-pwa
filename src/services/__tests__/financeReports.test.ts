import { beforeEach, describe, expect, it, vi } from "vitest";

import * as apiClient from "../../lib/api-client";
import {
  getFinanceDashboard,
  getFinancialSummary,
  getProfitByPackage,
  getProfitByService,
  getProfitByStaff,
  toFinancialSummary,
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

  it("keeps the welcome-pack cost the backend nets out of gross profit", async () => {
    mock.get.mockResolvedValue({
      data: {
        period: { start: "2026-09-01", end: "2026-09-30" },
        revenue: { usd: "100.00", toman: "10000000" },
        productCost: { usd: "20.00", toman: "2000000" },
        welcomePackCost: { usd: "4.13", toman: "413000" },
        grossProfit: { usd: "75.87", toman: "7587000" },
        expenses: { usd: "0.00", toman: "0" },
        netProfit: { usd: "75.87", toman: "7587000" },
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

    const summary = await getFinancialSummary({ period: "this_month" });

    expect(summary.welcomePackCost.usd).toBe("4.13");
    expect(summary.welcomePackCost.toman).toBe("413000");
  });

  it("defaults a missing welcome-pack block to zero money", () => {
    expect(toFinancialSummary({}).welcomePackCost).toEqual({ usd: "0.00", toman: "0" });
  });

  describe("staff compensation breakdown", () => {
    it("maps the per-role split exactly as the backend grouped it", () => {
      const summary = toFinancialSummary({
        staffCompensation: {
          cash: { usd: "20.00", toman: "2000000" },
          product: { usd: "10.00", toman: "1000000" },
          total: { usd: "30.00", toman: "3000000" },
          payoutCount: 6,
          byRole: {
            doctor: {
              role: "doctor",
              count: 3,
              cashUsd: "13.00",
              cashToman: "1300000",
              productUsd: "0.00",
              productToman: "0",
              totalUsd: "13.00",
              totalToman: "1300000",
            },
            laser: {
              role: "laser",
              count: 1,
              cashUsd: "2.00",
              cashToman: "1200000",
              productUsd: "10.00",
              productToman: "0",
              totalUsd: "12.00",
              totalToman: "1200000",
            },
          },
        },
      });

      expect(summary.staffCompensation.payoutCount).toBe(6);
      expect(summary.staffCompensation.total.toman).toBe("3000000");
      expect(Object.keys(summary.staffCompensation.byRole)).toEqual(["doctor", "laser"]);
      expect(summary.staffCompensation.byRole.doctor?.totalToman).toBe("1300000");
      expect(summary.staffCompensation.byRole.laser?.count).toBe(1);
      // a role the backend did not send stays absent rather than becoming a zero
      expect(summary.staffCompensation.byRole.facial).toBeUndefined();
    });

    it("defaults an absent staff block to zeroes with no roles", () => {
      const staff = toFinancialSummary({}).staffCompensation;
      expect(staff.total).toEqual({ usd: "0.00", toman: "0" });
      expect(staff.payoutCount).toBe(0);
      expect(staff.byRole).toEqual({});
    });
  });

  it("maps the below-the-line buckets and net profit the backend computed", () => {
    const summary = toFinancialSummary({
      operatingExpenses: { usd: "20.00", toman: "2000000", count: 4 },
      staffExpenseClaims: { usd: "5.00", toman: "500000", count: 2 },
      belowTheLineTotal: { usd: "55.00", toman: "5500000" },
      netProfit: { usd: "44.38", toman: "20739967" },
    });

    expect(summary.operatingExpenses).toEqual({ usd: "20.00", toman: "2000000", count: 4 });
    expect(summary.staffExpenseClaims).toEqual({ usd: "5.00", toman: "500000", count: 2 });
    expect(summary.belowTheLineTotal.toman).toBe("5500000");
    expect(summary.netProfit.toman).toBe("20739967");
  });

  it("treats the legacy `expenses` key as staff claims", () => {
    const summary = toFinancialSummary({ expenses: { usd: "5.00", toman: "500000" } });
    expect(summary.expenses.toman).toBe("500000");
    expect(summary.staffExpenseClaims.toman).toBe("500000");
  });

  it("keeps revenueBasis and costCoverage so the UI can warn on bad data", () => {
    const summary = toFinancialSummary({
      revenueBasis: "list_price",
      costCoverage: { zeroCostRows: 3, productsMissingCost: [11] },
    });
    expect(summary.revenueBasis).toBe("list_price");
    expect(summary.costCoverage.zeroCostRows).toBe(3);
    expect(summary.costCoverage.productsMissingCost).toEqual([11]);
  });

  it("defaults revenueBasis to the sale ledger and coverage to clean", () => {
    const summary = toFinancialSummary({});
    expect(summary.revenueBasis).toBe("sale_ledger");
    expect(summary.costCoverage).toEqual({ zeroCostRows: 0, productsMissingCost: [] });
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
