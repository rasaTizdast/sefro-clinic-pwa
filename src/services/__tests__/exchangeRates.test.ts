import { beforeEach, describe, expect, it, vi } from "vitest";

import * as apiClient from "../../lib/api-client";
import {
  createExchangeRate,
  getBackupRate,
  getCurrentRate,
  listExchangeRates,
} from "../exchangeRates";

vi.mock("../../lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const mock = vi.mocked(apiClient.apiClient);

const rawRate = {
  id: 7,
  currency_from: "USD",
  currency_to: "IRT",
  rate: "985000.00",
  effective_at: "2026-09-20T08:00:00Z",
  source: "manual",
  is_active: true,
  created_at: "2026-09-20T08:00:00Z",
};

describe("exchangeRates service", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("getCurrentRate", () => {
    it("maps the snake_case payload to camelCase CurrentRate and keeps rate a string", async () => {
      mock.get.mockResolvedValue({
        data: {
          rate: "985000.00",
          rate_toman_per_usd: "985000.00",
          effective_at: "2026-09-20T08:00:00Z",
          source: "manual",
        },
      });

      const result = await getCurrentRate();

      expect(mock.get).toHaveBeenCalledWith("/reports/exchange-dollar/");
      expect(result).toEqual({
        rate: "985000.00",
        rateTomanPerUsd: "985000.00",
        effectiveAt: "2026-09-20T08:00:00Z",
        source: "manual",
      });
      expect(typeof result.rate).toBe("string");
      expect(typeof result.rateTomanPerUsd).toBe("string");
    });

    it("also accepts the camelCase payload produced by the api-client interceptor", async () => {
      mock.get.mockResolvedValue({
        data: {
          rate: "985000.00",
          rateTomanPerUsd: "985000.00",
          effectiveAt: null,
          source: "backup",
        },
      });

      const result = await getCurrentRate();

      expect(result.rateTomanPerUsd).toBe("985000.00");
      expect(result.effectiveAt).toBeNull();
      expect(result.source).toBe("backup");
    });
  });

  describe("getBackupRate", () => {
    it("maps the payload and keeps the provider", async () => {
      mock.get.mockResolvedValue({
        data: {
          rate: "990000.00",
          rate_toman_per_usd: "990000.00",
          effective_at: "2026-09-20T08:00:00Z",
          source: "backup",
          provider: "navasan",
        },
      });

      const result = await getBackupRate();

      expect(mock.get).toHaveBeenCalledWith("/reports/backup-exchange/");
      expect(result.rate).toBe("990000.00");
      expect(result.provider).toBe("navasan");
    });
  });

  describe("listExchangeRates", () => {
    it("paginates via toPaginatedResponse and maps the rows", async () => {
      mock.get.mockResolvedValue({
        data: {
          count: 2,
          next: "http://api/finance/exchange-rates/?page=2",
          previous: null,
          results: [rawRate, { ...rawRate, id: 6, rate: "980000.00", is_active: false }],
        },
      });

      const result = await listExchangeRates({ page: 1 });

      expect(mock.get).toHaveBeenCalledWith("/finance/exchange-rates/", {
        params: { page: 1, per_page: 20 },
      });
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.perPage).toBe(20);
      expect(result.totalPages).toBe(1);
      expect(result.hasNext).toBe(true);
      expect(result.hasPrev).toBe(false);
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({
        id: 7,
        currencyFrom: "USD",
        currencyTo: "IRT",
        rate: "985000.00",
        effectiveAt: "2026-09-20T08:00:00Z",
        source: "manual",
        isActive: true,
        createdAt: "2026-09-20T08:00:00Z",
      });
      expect(result.data[1].isActive).toBe(false);
      expect(typeof result.data[0].rate).toBe("string");
    });

    it("defaults to page 1", async () => {
      mock.get.mockResolvedValue({ data: { count: 0, next: null, previous: null, results: [] } });

      const result = await listExchangeRates();

      expect(mock.get).toHaveBeenCalledWith("/finance/exchange-rates/", {
        params: { page: 1, per_page: 20 },
      });
      expect(result.data).toEqual([]);
      expect(result.totalPages).toBe(1);
    });
  });

  describe("createExchangeRate", () => {
    it("posts to /finance/exchange-rates/ and maps the created row", async () => {
      mock.post.mockResolvedValue({ data: rawRate });

      const result = await createExchangeRate({ rate: "985000.00", source: "manual" });

      expect(mock.post).toHaveBeenCalledWith("/finance/exchange-rates/", {
        rate: "985000.00",
        source: "manual",
      });
      expect(result.id).toBe(7);
      expect(result.rate).toBe("985000.00");
      expect(result.currencyFrom).toBe("USD");
      expect(result.isActive).toBe(true);
    });
  });
});
