import { beforeEach, describe, expect, it, vi } from "vitest";

import * as apiClient from "../../lib/api-client";
import {
  listCompensationRules,
  listPayouts,
  listPayoutSummary,
  toCompensationRule,
  toStaffPayout,
  toStaffPayoutSummary,
  upsertCompensationRule,
} from "../payouts";

vi.mock("../../lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mock = vi.mocked(apiClient.apiClient);

/** Wire shape — already camelCased by the api-client response interceptor. Money stays a string. */
const rawPayout = {
  id: 31,
  staff: 7,
  staffName: "دکتر رضایی",
  visit: 12,
  service: 4,
  serviceName: "لیزر موهای زائد",
  role: "doctor",
  revenueUsd: "100.00",
  revenueToman: "10000000",
  productCostUsd: "20.00",
  productCostToman: "2000000",
  profitUsd: "80.00",
  profitToman: "8000000",
  payoutCashUsd: "32.00",
  payoutCashToman: "3200000",
  payoutProduct: null,
  productName: null,
  payoutProductQty: "0.00",
  payoutProductValueUsd: "0.00",
  payoutProductValueToman: "0",
  totalPayoutUsd: "32.00",
  totalPayoutToman: "3200000",
  exchangeRate: "100000.00",
  status: "pending",
  payoutMode: "cash",
  notes: "",
  approvedBy: null,
  approvedAt: null,
  paidAt: null,
  createdAt: "2026-09-20T08:00:00Z",
};

const rawRule = {
  id: 3,
  role: "doctor",
  payoutType: "cash",
  calculationType: "percent_profit",
  percentProfit: "30.00",
  fixedAmountUsd: null,
  fixedAmountToman: null,
  transportUsd: "1.00",
  transportToman: "100000",
  product: null,
  productQty: "0.00",
  isActive: true,
};

describe("toStaffPayout", () => {
  it("maps every field and keeps money as strings", () => {
    const payout = toStaffPayout(rawPayout as never);

    expect(payout).toEqual({
      ...rawPayout,
      role: "doctor",
      status: "pending",
      payoutMode: "cash",
    });
    expect(typeof payout.totalPayoutUsd).toBe("string");
    expect(typeof payout.profitToman).toBe("string");
  });

  it("defaults missing money to zeroed strings and nullable fields to null", () => {
    const payout = toStaffPayout({ id: 1, staff: 2, visit: 3, service: 4, role: "laser" } as never);

    expect(payout.staffName).toBe("");
    expect(payout.serviceName).toBeNull();
    expect(payout.revenueUsd).toBe("0.00");
    expect(payout.revenueToman).toBe("0");
    expect(payout.payoutProductQty).toBe("0.00");
    expect(payout.totalPayoutToman).toBe("0");
    expect(payout.exchangeRate).toBe("0.00");
    expect(payout.status).toBe("pending");
    expect(payout.payoutMode).toBe("cash");
    expect(payout.notes).toBe("");
    expect(payout.approvedBy).toBeNull();
    expect(payout.createdAt).toBe("");
  });
});

describe("toStaffPayoutSummary", () => {
  it("maps the unpaginated summary payload", () => {
    const summary = toStaffPayoutSummary({
      totalCashUsd: "120.00",
      totalCashToman: "12000000",
      totalProductValueUsd: "30.00",
      totalProductValueToman: "3000000",
      totalPayoutUsd: "150.00",
      totalPayoutToman: "15000000",
      payoutCount: 4,
    } as never);

    expect(summary).toEqual({
      totalCashUsd: "120.00",
      totalCashToman: "12000000",
      totalProductValueUsd: "30.00",
      totalProductValueToman: "3000000",
      totalPayoutUsd: "150.00",
      totalPayoutToman: "15000000",
      payoutCount: 4,
    });
  });

  it("defaults missing keys", () => {
    const summary = toStaffPayoutSummary({} as never);

    expect(summary.totalPayoutUsd).toBe("0.00");
    expect(summary.totalPayoutToman).toBe("0");
    expect(summary.payoutCount).toBe(0);
  });
});

describe("toCompensationRule", () => {
  it("maps the rule payload", () => {
    expect(toCompensationRule(rawRule as never)).toEqual(rawRule);
  });

  it("defaults the optional fields", () => {
    const rule = toCompensationRule({ id: 1, role: "facial" } as never);

    expect(rule.payoutType).toBe("cash");
    expect(rule.calculationType).toBe("percent_profit");
    expect(rule.percentProfit).toBeNull();
    expect(rule.fixedAmountUsd).toBeNull();
    expect(rule.transportUsd).toBe("0.00");
    expect(rule.transportToman).toBe("0");
    expect(rule.product).toBeNull();
    expect(rule.productQty).toBe("0.00");
    expect(rule.isActive).toBe(true);
  });
});

describe("payouts service", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("listPayouts", () => {
    it("sends pagination plus staff/role/status filters and maps the page", async () => {
      mock.get.mockResolvedValue({
        data: { count: 1, next: null, previous: null, results: [rawPayout] },
      });

      const result = await listPayouts({
        page: 2,
        perPage: 10,
        staff: 7,
        role: "doctor",
        status: "pending",
        visit: 12,
      });

      expect(mock.get).toHaveBeenCalledWith("/finance/staff-payouts/", {
        params: {
          page: 2,
          per_page: 10,
          staff: 7,
          role: "doctor",
          status: "pending",
          visit: 12,
        },
      });
      expect(result.data[0].staffName).toBe("دکتر رضایی");
      expect(result.data[0].totalPayoutUsd).toBe("32.00");
      expect(result.total).toBe(1);
      expect(result.page).toBe(2);
    });

    it("defaults to page 1 / per_page 20 and omits absent filters", async () => {
      mock.get.mockResolvedValue({
        data: { count: 0, next: null, previous: null, results: [] },
      });

      await listPayouts();

      expect(mock.get).toHaveBeenCalledWith("/finance/staff-payouts/", {
        params: { page: 1, per_page: 20 },
      });
    });
  });

  describe("listPayoutSummary", () => {
    it("sends the period param", async () => {
      mock.get.mockResolvedValue({ data: { totalPayoutUsd: "150.00", payoutCount: 4 } });

      const summary = await listPayoutSummary({ period: "this_month" });

      expect(mock.get).toHaveBeenCalledWith("/finance/reports/staff-payout-summary/", {
        params: { period: "this_month" },
      });
      expect(summary.payoutCount).toBe(4);
      expect(summary.totalPayoutUsd).toBe("150.00");
    });

    it("sends Gregorian start_date/end_date together with the domain filters", async () => {
      mock.get.mockResolvedValue({ data: {} });

      await listPayoutSummary({
        staff: 7,
        role: "laser",
        startDate: "2026-09-01",
        endDate: "2026-09-30",
      });

      expect(mock.get).toHaveBeenCalledWith("/finance/reports/staff-payout-summary/", {
        params: {
          staff: 7,
          role: "laser",
          start_date: "2026-09-01",
          end_date: "2026-09-30",
        },
      });
    });

    it("sends no params when called without arguments", async () => {
      mock.get.mockResolvedValue({ data: {} });

      await listPayoutSummary();

      expect(mock.get).toHaveBeenCalledWith("/finance/reports/staff-payout-summary/", {
        params: {},
      });
    });
  });

  describe("listCompensationRules", () => {
    it("lists the paginated rules and maps them", async () => {
      mock.get.mockResolvedValue({
        data: { count: 1, next: null, previous: null, results: [rawRule] },
      });

      const result = await listCompensationRules();

      expect(mock.get).toHaveBeenCalledWith("/finance/staff-compensation-rules/", {
        params: { page: 1, per_page: 20 },
      });
      expect(result.data[0].role).toBe("doctor");
      expect(result.data[0].percentProfit).toBe("30.00");
      expect(result.total).toBe(1);
    });

    it("passes the role filter", async () => {
      mock.get.mockResolvedValue({
        data: { count: 0, next: null, previous: null, results: [] },
      });

      await listCompensationRules({ role: "laser" });

      expect(mock.get).toHaveBeenCalledWith("/finance/staff-compensation-rules/", {
        params: { page: 1, per_page: 20, role: "laser" },
      });
    });
  });

  describe("upsertCompensationRule", () => {
    it("POSTs to the collection endpoint when there is no id", async () => {
      mock.post.mockResolvedValue({ data: rawRule });

      const payload = { role: "doctor" as const, payoutType: "cash" as const };
      const rule = await upsertCompensationRule(payload);

      expect(mock.post).toHaveBeenCalledWith("/finance/staff-compensation-rules/", payload);
      expect(mock.put).not.toHaveBeenCalled();
      expect(rule.id).toBe(3);
      expect(rule.role).toBe("doctor");
    });

    it("PUTs to the detail endpoint when an id is given", async () => {
      mock.put.mockResolvedValue({ data: { ...rawRule, isActive: false } });

      const payload = { role: "doctor" as const, isActive: false };
      const rule = await upsertCompensationRule(payload, 3);

      expect(mock.put).toHaveBeenCalledWith("/finance/staff-compensation-rules/3/", payload);
      expect(mock.post).not.toHaveBeenCalled();
      expect(rule.isActive).toBe(false);
    });
  });
});
