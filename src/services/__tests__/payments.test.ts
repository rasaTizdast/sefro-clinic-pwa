import { beforeEach, describe, expect, it, vi } from "vitest";

import * as apiClient from "../../lib/api-client";
import { listAllPayments } from "../payments";

vi.mock("../../lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

const mock = vi.mocked(apiClient.apiClient);

describe("payments service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches all pages and maps rows", async () => {
    mock.get
      .mockResolvedValueOnce({
        data: {
          count: 3,
          next: "http://test/payments/?page=2",
          previous: null,
          results: [
            {
              id: 1,
              customer: 5,
              customerName: "علی رضایی",
              visit: 10,
              amount: "1000000",
              amountUsd: "10",
              exchangeRate: "100000",
              paymentMethod: "cash",
              paidAt: "1405-07-06 10:30",
              notes: "",
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          count: 3,
          next: null,
          previous: "http://test/payments/?page=1",
          results: [
            {
              id: 2,
              customer: 7,
              customerName: "سارا احمدی",
              visit: null,
              amount: "500000",
              amountUsd: "5",
              exchangeRate: "100000",
              paymentMethod: "card",
              paidAt: "1405-07-05 14:00",
              notes: "",
            },
            {
              id: 3,
              customer: 5,
              customerName: "علی رضایی",
              visit: 11,
              amount: "2000000",
              amountUsd: "20",
              exchangeRate: "100000",
              paymentMethod: "cash",
              paidAt: null,
              notes: "",
            },
          ],
        },
      });

    const result = await listAllPayments();

    expect(mock.get).toHaveBeenCalledTimes(2);
    expect(mock.get).toHaveBeenNthCalledWith(1, "/payments/", {
      params: { page: 1, per_page: 100 },
    });
    expect(mock.get).toHaveBeenNthCalledWith(2, "/payments/", {
      params: { page: 2, per_page: 100 },
    });
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      id: 1,
      customer: 5,
      customerName: "علی رضایی",
      visit: 10,
      amount: "1000000",
      amountUsd: "10",
      exchangeRate: "100000",
      paymentMethod: "cash",
      paidAt: "1405-07-06 10:30",
      notes: "",
    });
    expect(result[1].customer).toBe(7);
    expect(result[1].visit).toBeNull();
    expect(result[2].paidAt).toBeNull();
  });

  it("handles plain array responses", async () => {
    mock.get.mockResolvedValue({
      data: [
        {
          id: 1,
          customer: 3,
          customerName: "تست",
          amount: "100",
          paidAt: "1405-07-01 09:00",
        },
      ],
    });

    const result = await listAllPayments();
    expect(result).toHaveLength(1);
    expect(result[0].customer).toBe(3);
    expect(result[0].paidAt).toBe("1405-07-01 09:00");
  });
});
