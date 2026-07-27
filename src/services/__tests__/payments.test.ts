import { beforeEach, describe, expect, it, vi } from "vitest";

import * as apiClient from "../../lib/api-client";
import { createPayment, getPayment, getPaymentsByService, listPayments } from "../payments";

vi.mock("../../lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const mock = vi.mocked(apiClient.apiClient);

describe("payments service", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("createPayment", () => {
    it("maps patientId→customer and paymentMethod→payment_method", async () => {
      mock.post.mockResolvedValue({ data: { id: 1 } });
      await createPayment({
        patientId: 10,
        visitId: 5,
        amount: 200000,
        paymentMethod: "card",
        date: "1405-03-26 00:00",
        description: "پرداخت کارتی",
      });
      expect(mock.post).toHaveBeenCalledWith("/payments/", {
        customer: 10,
        visit: 5,
        amount: 200000,
        payment_method: "card",
        paid_at: "1405-03-26 00:00",
        notes: "پرداخت کارتی",
      });
    });

    it("defaults invalid payment method to cash", async () => {
      mock.post.mockResolvedValue({ data: { id: 1 } });
      await createPayment({ patientId: 10, amount: 100000, paymentMethod: "invalid_method" });
      const payload = mock.post.mock.calls[0][1] as Record<string, unknown>;
      expect(payload.payment_method).toBe("cash");
    });

    it("accepts cash, card, transfer methods", async () => {
      mock.post.mockResolvedValue({ data: { id: 1 } });
      for (const method of ["cash", "card", "transfer"]) {
        await createPayment({ patientId: 10, amount: 100000, paymentMethod: method });
        const payload = mock.post.mock.calls[mock.post.mock.calls.length - 1][1] as Record<
          string,
          unknown
        >;
        expect(payload.payment_method).toBe(method);
      }
    });
  });

  describe("getPayment", () => {
    it("maps backend response to Transaction", async () => {
      mock.get.mockResolvedValue({
        data: {
          id: 1,
          customerName: "علی رضایی",
          amount: "200000",
          paymentMethod: "card",
          paidAt: "2026-06-15",
          notes: "test",
        },
      });
      const result = await getPayment(1);
      expect(result.patient).toBe("علی رضایی");
      expect(result.amount).toBe(200000);
      expect(result.paymentMethod).toBe("card");
      expect(result.description).toBe("test");
    });
  });

  describe("listPayments", () => {
    it("sends dateFrom and dateTo params", async () => {
      mock.get.mockResolvedValue({ data: { count: 0, next: null, previous: null, results: [] } });
      await listPayments({ dateFrom: "2026-06-01", dateTo: "2026-06-30" });
      expect(mock.get).toHaveBeenCalledWith("/payments/", {
        params: expect.objectContaining({ dateFrom: "2026-06-01", dateTo: "2026-06-30" }),
      });
    });
  });

  describe("getPaymentsByService", () => {
    it("sends GET with date params", async () => {
      mock.get.mockResolvedValue({ data: [] });
      await getPaymentsByService("2026-06-01", "2026-06-30");
      expect(mock.get).toHaveBeenCalledWith("/payments/by_service/", {
        params: { dateFrom: "2026-06-01", dateTo: "2026-06-30" },
      });
    });
  });
});
