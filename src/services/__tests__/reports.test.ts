import { beforeEach, describe, expect, it, vi } from "vitest";

import * as apiClient from "../../lib/api-client";
import {
  getAllReports,
  getCustomerBreakdown,
  getFilteredReports,
  getReferralReports,
  getVisitReports,
} from "../reports";

vi.mock("../../lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

const mock = vi.mocked(apiClient.apiClient);

describe("reports service", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("getAllReports", () => {
    it("maps backend response to ReportsData", async () => {
      mock.get.mockResolvedValue({
        data: {
          totalCustomers: 50,
          totalSales: "10000000",
          totalVisits: "120",
          avgSatisfaction: "4.5",
          salesChart: { monthly: [{ period: "2026-01", total: "5000000" }] },
          customerStatus: { pending: "10", confirmed: "20", completed: "80", canceled: "10" },
          servicePopularity: [{ id: 1, name: "کوتاهی مو", usage: 50 }],
        },
      });

      const result = await getAllReports();
      expect(result.customerCount).toBe(50);
      expect(result.totalRevenue).toBe(10000000);
      expect(result.totalVisits).toBe(120);
      expect(result.avgSatisfaction).toBe(4.5);
      expect(result.monthlyRevenue).toEqual([{ month: "2026-01", revenue: 5000000 }]);
      expect(result.appointmentStats).toEqual([
        { name: "در انتظار", value: 10, color: "#f59e0b" },
        { name: "تأیید شده", value: 20, color: "#3b82f6" },
        { name: "انجام شده", value: 80, color: "#10b981" },
        { name: "لغو شده", value: 10, color: "#ef4444" },
      ]);
      expect(result.serviceCategoryStats).toEqual([{ name: "کوتاهی مو", value: 50 }]);
    });
  });

  describe("getFilteredReports", () => {
    it("sends dateFrom/dateTo params", async () => {
      mock.get.mockResolvedValue({
        data: { totalSales: 0, totalVisits: 0, salesChart: {}, servicePopularity: [] },
      });
      await getFilteredReports("2026-06-01", "2026-06-30");
      expect(mock.get).toHaveBeenCalledWith("/reports/", {
        params: { dateFrom: "2026-06-01", dateTo: "2026-06-30" },
      });
    });

    it("reads chart buckets from top level of the response", async () => {
      mock.get.mockResolvedValue({
        data: {
          totalSales: "12000000",
          totalVisits: "30",
          daily: [{ period: "1405-05-15", total: "5000000" }],
          monthly: [{ period: "1405-05", total: "7000000" }],
          quarterly: [{ period: "1405-Q2", total: "12000000" }],
          yearly: [{ period: "1405", total: "12000000" }],
          customerBreakdown: { total: 12 },
        },
      });
      const result = await getFilteredReports("1405-05-01", "1405-05-31");
      expect(result.totalRevenue).toBe(12000000);
      expect(result.totalVisits).toBe(30);
      expect(result.customerCount).toBe(12);
      expect(result.monthlyRevenue).toEqual([{ month: "1405-05", revenue: 7000000 }]);
      expect(result.salesChart.daily).toEqual([{ period: "1405-05-15", total: 5000000 }]);
      expect(result.salesChart.quarterly).toEqual([{ period: "1405-Q2", total: 12000000 }]);
      expect(result.salesChart.yearly).toEqual([{ period: "1405", total: 12000000 }]);
    });
  });

  describe("getVisitReports", () => {
    it("maps current/previous visit counts and change percent", async () => {
      mock.get.mockResolvedValue({
        data: {
          currentCount: 20,
          previousCount: 15,
          changePercent: 33.3,
        },
      });
      const result = await getVisitReports();
      expect(result).toEqual({
        currentCount: 20,
        previousCount: 15,
        changePercent: 33.3,
      });
    });

    it("handles null previous values", async () => {
      mock.get.mockResolvedValue({
        data: { currentCount: "10", previousCount: null, changePercent: null },
      });
      const result = await getVisitReports();
      expect(result).toEqual({ currentCount: 10, previousCount: null, changePercent: null });
    });

    it("sends dateFrom/dateTo params", async () => {
      mock.get.mockResolvedValue({
        data: { currentCount: 5, previousCount: 3, changePercent: 66.7 },
      });
      await getVisitReports("1405-05-01", "1405-05-31");
      expect(mock.get).toHaveBeenCalledWith("/reports/visits/", {
        params: { dateFrom: "1405-05-01", dateTo: "1405-05-31" },
      });
    });
  });

  describe("getCustomerBreakdown", () => {
    it("maps by_visit_status to named/colored stats", async () => {
      mock.get.mockResolvedValue({
        data: {
          byVisitStatus: { pending: 2, confirmed: 5, completed: 10, canceled: 1 },
          newCustomers: 3,
          loyalCustomers: 7,
          total: 20,
        },
      });
      const result = await getCustomerBreakdown();
      expect(result.byVisitStatus).toEqual([
        { name: "در انتظار", value: 2, color: "#f59e0b" },
        { name: "تأیید شده", value: 5, color: "#3b82f6" },
        { name: "انجام شده", value: 10, color: "#10b981" },
        { name: "لغو شده", value: 1, color: "#ef4444" },
      ]);
      expect(result.newCustomers).toBe(3);
      expect(result.loyalCustomers).toBe(7);
      expect(result.total).toBe(20);
    });

    it("sends dateFrom/dateTo params", async () => {
      mock.get.mockResolvedValue({
        data: {
          byVisitStatus: {},
          newCustomers: 0,
          loyalCustomers: 0,
          total: 0,
        },
      });
      await getCustomerBreakdown("1405-05-01", "1405-05-31");
      expect(mock.get).toHaveBeenCalledWith("/reports/customers/", {
        params: { dateFrom: "1405-05-01", dateTo: "1405-05-31" },
      });
    });
  });

  describe("getReferralReports", () => {
    it("extracts referral rate", async () => {
      mock.get.mockResolvedValue({
        data: { referralRate: 0.75, newCustomers: 10, returningCustomers: 30 },
      });
      const result = await getReferralReports();
      expect(result.referralRate).toBe(0.75);
    });

    it("sends dateFrom/dateTo params", async () => {
      mock.get.mockResolvedValue({ data: { referralRate: 0.5 } });
      await getReferralReports("1405-05-01", "1405-05-31");
      expect(mock.get).toHaveBeenCalledWith("/reports/referral/", {
        params: { dateFrom: "1405-05-01", dateTo: "1405-05-31" },
      });
    });
  });
});
