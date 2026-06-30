import { beforeEach, describe, expect, it, vi } from "vitest";

import * as apiClient from "../../lib/api-client";
import { getAllReports, getFilteredReports, getReferralReports, getVisitReports } from "../reports";

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
          totalSales: 10000000,
          totalVisits: 120,
          avgSatisfaction: 4.5,
          salesChart: { monthly: [{ period: "2026-01", total: 5000000 }] },
          customerStatus: { pending: 10, confirmed: 20, completed: 80, canceled: 10 },
          servicePopularity: [{ id: 1, name: "کوتاهی مو", usage: 50 }],
        },
      });

      const result = await getAllReports();
      expect(result.customerCount).toBe(50);
      expect(result.totalRevenue).toBe(10000000);
      expect(result.totalVisits).toBe(120);
      expect(result.avgSatisfaction).toBe(4.5);
      expect(result.monthlyRevenue).toEqual([{ month: "2026-01", revenue: 5000000 }]);
      expect(result.appointmentStats).toHaveLength(4);
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
  });

  describe("getVisitReports", () => {
    it("maps monthly visit data", async () => {
      mock.get.mockResolvedValue({ data: { monthly: [{ period: "2026-01", count: 15 }] } });
      const result = await getVisitReports();
      expect(result).toEqual([{ month: "2026-01", visits: 15 }]);
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
  });
});
