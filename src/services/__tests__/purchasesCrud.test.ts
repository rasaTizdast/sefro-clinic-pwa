import { beforeEach, describe, expect, it, vi } from "vitest";

import * as apiClient from "../../lib/api-client";
import type { ProductPurchase } from "../../types/finance";
import {
  deletePurchase,
  listAllPurchases,
  sumPurchasesInRange,
  updatePurchase,
} from "../inventoryFinance";

vi.mock("../../lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mock = vi.mocked(apiClient.apiClient);

const purchase = (over: Partial<ProductPurchase> = {}): ProductPurchase => ({
  id: 1,
  product: 2,
  quantity: "2.000",
  unitCostUsd: "10.00",
  totalCostUsd: "20.00",
  supplier: "",
  purchaseDate: "2026-09-20",
  exchangeRateSnapshot: "100000.00",
  createdAt: "2026-09-20T08:30:00Z",
  ...over,
});

describe("updatePurchase", () => {
  beforeEach(() => vi.clearAllMocks());

  it("PATCHes the detail route with the editable fields only", async () => {
    mock.patch.mockResolvedValue({
      data: { id: 7, product: 2, quantity: "4.000", unitCostUsd: "12.50" },
    });

    await updatePurchase(7, {
      quantity: 4,
      unitCostToman: 1_000_000,
      rate: 100_000,
      supplier: "  دیجی میکس  ",
      purchaseDateJalali: "1405/07/08",
    });

    expect(mock.patch).toHaveBeenCalledWith("/finance/product-purchases/7/", {
      quantity: "4.000",
      unitCostUsd: "10.00",
      supplier: "دیجی میکس",
      purchaseDate: "2026-09-30",
    });
  });

  it("never sends totalCostUsd — it is derived server-side and read-only", async () => {
    mock.patch.mockResolvedValue({ data: { id: 7 } });

    await updatePurchase(7, {
      quantity: 3,
      unitCostToman: 500_000,
      rate: 100_000,
      purchaseDateJalali: "1405/07/08",
    });

    const body = mock.patch.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(body).not.toHaveProperty("totalCostUsd");
    expect(body).not.toHaveProperty("exchangeRateSnapshot");
  });

  it("throws when no exchange rate is available, before any request", async () => {
    await expect(
      updatePurchase(7, {
        quantity: 1,
        unitCostToman: 100_000,
        rate: null,
        purchaseDateJalali: "1405/07/08",
      })
    ).rejects.toThrow(/rate/i);
    expect(mock.patch).not.toHaveBeenCalled();
  });
});

describe("deletePurchase", () => {
  beforeEach(() => vi.clearAllMocks());

  it("DELETEs the detail route", async () => {
    mock.delete.mockResolvedValue({ data: null });
    await deletePurchase(9);
    expect(mock.delete).toHaveBeenCalledWith("/finance/product-purchases/9/");
  });
});

describe("listAllPurchases", () => {
  beforeEach(() => vi.clearAllMocks());

  it("walks every page and maps the rows", async () => {
    mock.get
      .mockResolvedValueOnce({
        data: {
          count: 3,
          next: "http://api/api/finance/product-purchases/?page=2",
          results: [{ id: 1, product: 2, quantity: "1.000", totalCostUsd: "10.00" }],
        },
      })
      .mockResolvedValueOnce({
        data: {
          count: 3,
          next: null,
          results: [
            { id: 2, product: 2, quantity: "1.000", totalCostUsd: "20.00" },
            { id: 3, product: 3, quantity: "1.000", totalCostUsd: "30.00" },
          ],
        },
      });

    const rows = await listAllPurchases();

    expect(mock.get).toHaveBeenCalledTimes(2);
    expect(rows.map((r) => r.id)).toEqual([1, 2, 3]);
  });
});

describe("sumPurchasesInRange", () => {
  const range = { start: "2026-09-01", end: "2026-09-30" };

  it("sums USD and the rate-snapshot Toman of purchases inside the range", () => {
    const total = sumPurchasesInRange(
      [
        purchase({ id: 1, totalCostUsd: "20.00", exchangeRateSnapshot: "100000.00" }),
        purchase({ id: 2, totalCostUsd: "5.50", exchangeRateSnapshot: "200000.00" }),
      ],
      range
    );

    expect(total.usd).toBeCloseTo(25.5, 5);
    // 20 × 100,000 = 2,000,000 and 5.50 × 200,000 = 1,100,000
    expect(total.toman).toBe(3_100_000);
    expect(total.count).toBe(2);
  });

  it("excludes purchases outside the range on both ends", () => {
    const total = sumPurchasesInRange(
      [
        purchase({ id: 1, purchaseDate: "2026-08-31" }),
        purchase({ id: 2, purchaseDate: "2026-09-15" }),
        purchase({ id: 3, purchaseDate: "2026-10-01" }),
      ],
      range
    );

    expect(total.count).toBe(1);
    expect(total.usd).toBeCloseTo(20, 5);
  });

  it("treats the bounds as inclusive", () => {
    const total = sumPurchasesInRange(
      [
        purchase({ id: 1, purchaseDate: "2026-09-01" }),
        purchase({ id: 2, purchaseDate: "2026-09-30" }),
      ],
      range
    );
    expect(total.count).toBe(2);
  });

  it("returns zeros for an empty ledger", () => {
    expect(sumPurchasesInRange([], range)).toEqual({ usd: 0, toman: 0, count: 0 });
  });

  it("keeps the USD total even when a row has no rate snapshot", () => {
    const total = sumPurchasesInRange(
      [purchase({ totalCostUsd: "12.00", exchangeRateSnapshot: null })],
      range
    );
    expect(total.usd).toBeCloseTo(12, 5);
    expect(total.toman).toBe(0);
  });
});
