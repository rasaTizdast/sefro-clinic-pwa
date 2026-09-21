import { beforeEach, describe, expect, it, vi } from "vitest";

import * as apiClient from "../../lib/api-client";
import { buildCheckoutPayload, checkout, getSale, listSales, refundSale } from "../sales";

vi.mock("../../lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mock = vi.mocked(apiClient.apiClient);

const rawSale = {
  id: 12,
  customer: 5,
  visit: 9,
  package: null,
  amountUsd: "10.00",
  discountUsd: "0.00",
  exchangeRate: "100000.00",
  amountToman: "1000000",
  status: "paid",
  idempotencyKey: "uuid-1",
  createdAt: "2026-09-20T08:00:00Z",
};

describe("buildCheckoutPayload", () => {
  it("builds a payload whose components sum exactly to amountUsd (cash + card)", () => {
    const p = buildCheckoutPayload({
      customerId: 1,
      totalToman: 1_000_000,
      rate: 100_000,
      cashToman: 400_000,
      cardToman: 600_000,
      visitId: 9,
    });

    const sum = p.components.reduce((a, c) => a + Number(c.amountUsd), 0);
    expect(sum.toFixed(2)).toBe(p.amountUsd);
    expect(p.amountUsd).toBe("10.00");
    expect(p.components.map((c) => c.method)).toEqual(["cash", "card"]);
    expect(p.idempotencyKey).toBeTruthy();
    expect(p.customer).toBe(1);
    expect(p.visit).toBe(9);
    expect(p.package).toBeNull();
  });

  it("passes the package id through and includes the discount when given", () => {
    const p = buildCheckoutPayload({
      customerId: 2,
      totalToman: 500_000,
      rate: 100_000,
      cashToman: 500_000,
      cardToman: 0,
      packageId: 4,
      discountToman: 50_000,
      description: "بسته لیزر",
    });

    expect(p.package).toBe(4);
    expect(p.visit).toBeNull();
    expect(p.discountUsd).toBe("0.50");
    expect(p.description).toBe("بسته لیزر");
  });

  it("throws when the component split does not equal the total", () => {
    expect(() =>
      buildCheckoutPayload({
        customerId: 1,
        totalToman: 100,
        rate: 100_000,
        cashToman: 40,
        cardToman: 50,
      })
    ).toThrow();
  });

  it("throws when no exchange rate is available", () => {
    expect(() =>
      buildCheckoutPayload({
        customerId: 1,
        totalToman: 100_000,
        rate: null,
        cashToman: 100_000,
        cardToman: 0,
      })
    ).toThrow();
  });

  it("omits zero-amount components (cash-only)", () => {
    const p = buildCheckoutPayload({
      customerId: 1,
      totalToman: 500_000,
      rate: 100_000,
      cashToman: 500_000,
      cardToman: 0,
    });

    expect(p.components).toHaveLength(1);
    expect(p.components[0].method).toBe("cash");
    expect(p.components[0].amountUsd).toBe("5.00");
  });

  it("omits zero-amount components (card-only)", () => {
    const p = buildCheckoutPayload({
      customerId: 1,
      totalToman: 500_000,
      rate: 100_000,
      cashToman: 0,
      cardToman: 500_000,
    });

    expect(p.components).toHaveLength(1);
    expect(p.components[0].method).toBe("card");
  });
});

describe("sales service", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("checkout", () => {
    it("POSTs the payload to the checkout endpoint and maps the sale", async () => {
      mock.post.mockResolvedValue({ data: rawSale });
      const payload = buildCheckoutPayload({
        customerId: 5,
        totalToman: 1_000_000,
        rate: 100_000,
        cashToman: 1_000_000,
        cardToman: 0,
      });

      const sale = await checkout(payload);

      expect(mock.post).toHaveBeenCalledWith("/finance/checkout/", payload);
      expect(sale.id).toBe(12);
      expect(sale.customer).toBe(5);
      expect(sale.amountUsd).toBe("10.00");
      expect(sale.status).toBe("paid");
      expect(sale.visit).toBe(9);
    });
  });

  describe("listSales", () => {
    it("sends pagination + filters and maps the paginated response", async () => {
      mock.get.mockResolvedValue({
        data: { count: 1, next: null, previous: null, results: [rawSale] },
      });

      const result = await listSales({ page: 2, perPage: 10, customer: 5, status: "paid" });

      expect(mock.get).toHaveBeenCalledWith("/finance/sales/", {
        params: expect.objectContaining({
          page: 2,
          per_page: 10,
          customer: 5,
          status: "paid",
        }),
      });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].amountToman).toBe("1000000");
      expect(result.total).toBe(1);
      expect(result.page).toBe(2);
    });

    it("defaults to page 1 / per_page 20", async () => {
      mock.get.mockResolvedValue({
        data: { count: 0, next: null, previous: null, results: [] },
      });

      await listSales();

      expect(mock.get).toHaveBeenCalledWith("/finance/sales/", {
        params: expect.objectContaining({ page: 1, per_page: 20 }),
      });
    });
  });

  describe("getSale", () => {
    it("GETs the sale detail endpoint", async () => {
      mock.get.mockResolvedValue({ data: rawSale });

      const sale = await getSale(12);

      expect(mock.get).toHaveBeenCalledWith("/finance/sales/12/");
      expect(sale.idempotencyKey).toBe("uuid-1");
      expect(sale.createdAt).toBe("2026-09-20T08:00:00Z");
    });
  });

  describe("refundSale", () => {
    it("POSTs the refund payload to the refund endpoint", async () => {
      mock.post.mockResolvedValue({ data: { ...rawSale, status: "refunded" } });

      const sale = await refundSale(12, { refundAmountUsd: "10.00", reason: "انصراف" });

      expect(mock.post).toHaveBeenCalledWith("/finance/sales/12/refund/", {
        refundAmountUsd: "10.00",
        reason: "انصراف",
      });
      expect(sale.status).toBe("refunded");
    });
  });
});
