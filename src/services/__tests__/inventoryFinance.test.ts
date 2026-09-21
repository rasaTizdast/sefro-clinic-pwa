import { beforeEach, describe, expect, it, vi } from "vitest";

import * as apiClient from "../../lib/api-client";
import {
  buildPurchasePayload,
  createPurchase,
  listCostHistory,
  listPurchases,
  listUsages,
  recordConsumption,
  toConsumptionRecords,
  toProductCostHistory,
  toProductPurchase,
  toProductUsage,
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

/** Wire shapes — already camelCased by the api-client response interceptor. Money stays a string. */
const rawPurchase = {
  id: 11,
  product: 2,
  quantity: "3.000",
  unitCostUsd: "50.00",
  totalCostUsd: "150.00",
  supplier: "آزمایشگاه پارس",
  purchaseDate: "2026-09-20",
  exchangeRateSnapshot: "100000.00",
  createdAt: "2026-09-20T08:30:00Z",
};

const rawUsage = {
  id: 21,
  product: 2,
  visit: 12,
  service: 4,
  packageSale: null,
  quantity: "1.500",
  unitCostUsdSnapshot: "50.00",
  totalCostUsdSnapshot: "75.00",
  exchangeRateSnapshot: "100000.00",
  createdAt: "2026-09-20T09:00:00Z",
};

const rawCostHistory = {
  id: 31,
  product: 2,
  costUsd: "50.00",
  effectiveFrom: "2026-09-20T08:30:00Z",
  effectiveTo: null,
  createdAt: "2026-09-20T08:30:00Z",
};

describe("toProductPurchase", () => {
  it("maps every field and keeps money/quantity as strings", () => {
    const purchase = toProductPurchase(rawPurchase as never);

    expect(purchase).toEqual(rawPurchase);
    expect(typeof purchase.unitCostUsd).toBe("string");
    expect(typeof purchase.totalCostUsd).toBe("string");
    expect(typeof purchase.quantity).toBe("string");
    expect(purchase.exchangeRateSnapshot).toBe("100000.00");
  });

  it("defaults missing values and keeps a missing rate snapshot null", () => {
    const purchase = toProductPurchase({ id: 1, product: 2 } as never);

    expect(purchase.quantity).toBe("0.000");
    expect(purchase.unitCostUsd).toBe("0.00");
    expect(purchase.totalCostUsd).toBe("0.00");
    expect(purchase.supplier).toBe("");
    expect(purchase.purchaseDate).toBe("");
    expect(purchase.exchangeRateSnapshot).toBeNull();
    expect(purchase.createdAt).toBe("");
  });
});

describe("toProductUsage", () => {
  it("maps every field, including the nullable links and cost snapshots", () => {
    const usage = toProductUsage(rawUsage as never);

    expect(usage).toEqual(rawUsage);
    expect(usage.packageSale).toBeNull();
    expect(typeof usage.unitCostUsdSnapshot).toBe("string");
    expect(typeof usage.totalCostUsdSnapshot).toBe("string");
  });

  it("defaults missing values", () => {
    const usage = toProductUsage({ id: 1, product: 2 } as never);

    expect(usage.visit).toBeNull();
    expect(usage.service).toBeNull();
    expect(usage.packageSale).toBeNull();
    expect(usage.quantity).toBe("0.000");
    expect(usage.unitCostUsdSnapshot).toBe("0.00");
    expect(usage.totalCostUsdSnapshot).toBe("0.00");
    expect(usage.exchangeRateSnapshot).toBe("");
    expect(usage.createdAt).toBe("");
  });
});

describe("toProductCostHistory", () => {
  it("maps every field and keeps an open-ended period null", () => {
    const row = toProductCostHistory(rawCostHistory as never);

    expect(row).toEqual(rawCostHistory);
    expect(row.effectiveTo).toBeNull();
    expect(typeof row.costUsd).toBe("string");
  });

  it("defaults missing values", () => {
    const row = toProductCostHistory({ id: 1, product: 2 } as never);

    expect(row.costUsd).toBe("0.00");
    expect(row.effectiveFrom).toBe("");
    expect(row.effectiveTo).toBeNull();
    expect(row.createdAt).toBe("");
  });
});

describe("buildPurchasePayload", () => {
  it("converts the Toman unit cost with the rate and computes total = unit × quantity", () => {
    const payload = buildPurchasePayload({
      productId: 2,
      quantity: 3,
      unitCostToman: 5_000_000,
      rate: 100_000,
      supplier: "آزمایشگاه پارس",
      purchaseDateJalali: "۱۴۰۵/۰۶/۲۹",
    });

    expect(payload).toEqual({
      product: 2,
      quantity: "3.000",
      unitCostUsd: "50.00",
      totalCostUsd: "150.00",
      supplier: "آزمایشگاه پارس",
      purchaseDate: "2026-09-20",
    });
  });

  it("quantizes the total to 2dp from the rounded unit cost", () => {
    const payload = buildPurchasePayload({
      productId: 5,
      quantity: "2.5",
      unitCostToman: 333_333,
      rate: 100_000,
      purchaseDateJalali: "1405/06/29",
    });

    expect(payload.unitCostUsd).toBe("3.33");
    expect(payload.totalCostUsd).toBe("8.33");
    expect(payload.supplier).toBe("");
  });

  it("throws when no exchange rate is available", () => {
    const input = {
      productId: 2,
      quantity: 3,
      unitCostToman: 5_000_000,
      purchaseDateJalali: "1405/06/29",
    };

    expect(() => buildPurchasePayload({ ...input, rate: null })).toThrow(
      "Exchange rate unavailable."
    );
    expect(() => buildPurchasePayload({ ...input, rate: 0 })).toThrow("Exchange rate unavailable.");
  });
});

describe("listPurchases", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists the paginated purchases and maps them", async () => {
    mock.get.mockResolvedValue({
      data: { count: 1, next: null, previous: null, results: [rawPurchase] },
    });

    const result = await listPurchases();

    expect(mock.get).toHaveBeenCalledWith("/finance/product-purchases/", {
      params: { page: 1, per_page: 20 },
    });
    expect(result.data).toEqual([rawPurchase]);
    expect(result.total).toBe(1);
    expect(typeof result.data[0].totalCostUsd).toBe("string");
  });

  it("passes the product filter and the pagination options", async () => {
    mock.get.mockResolvedValue({ data: { count: 0, next: null, previous: null, results: [] } });

    await listPurchases({ product: 2, page: 2, perPage: 10, sort: "purchase_date" });

    expect(mock.get).toHaveBeenCalledWith("/finance/product-purchases/", {
      params: { page: 2, per_page: 10, ordering: "purchase_date", product: 2 },
    });
  });
});

describe("createPurchase", () => {
  beforeEach(() => vi.clearAllMocks());

  it("POSTs the built payload and returns the created purchase", async () => {
    mock.post.mockResolvedValue({ data: rawPurchase });

    const purchase = await createPurchase({
      productId: 2,
      quantity: 3,
      unitCostToman: 5_000_000,
      rate: 100_000,
      supplier: "آزمایشگاه پارس",
      purchaseDateJalali: "1405/06/29",
    });

    expect(mock.post).toHaveBeenCalledWith("/finance/product-purchases/", {
      product: 2,
      quantity: "3.000",
      unitCostUsd: "50.00",
      totalCostUsd: "150.00",
      supplier: "آزمایشگاه پارس",
      purchaseDate: "2026-09-20",
    });
    expect(purchase.id).toBe(11);
  });
});

describe("listUsages", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists the paginated usages and maps them", async () => {
    mock.get.mockResolvedValue({
      data: { count: 1, next: null, previous: null, results: [rawUsage] },
    });

    const result = await listUsages();

    expect(mock.get).toHaveBeenCalledWith("/finance/product-usages/", {
      params: { page: 1, per_page: 20 },
    });
    expect(result.data).toEqual([rawUsage]);
  });

  it("sends only the filters the endpoint supports", async () => {
    mock.get.mockResolvedValue({ data: { count: 0, next: null, previous: null, results: [] } });

    await listUsages({ visit: 12, service: 4, product: 2, packageSale: 9, page: 3 });

    expect(mock.get).toHaveBeenCalledWith("/finance/product-usages/", {
      params: {
        page: 3,
        per_page: 20,
        visit: 12,
        service: 4,
        product: 2,
        package_sale: 9,
      },
    });
  });
});

describe("listCostHistory", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requests the cost history rows for a product and maps them", async () => {
    mock.get.mockResolvedValue({
      data: { count: 1, next: null, previous: null, results: [rawCostHistory] },
    });

    const result = await listCostHistory(2);

    expect(mock.get).toHaveBeenCalledWith("/finance/product-cost-history/", {
      params: { page: 1, per_page: 20, product: 2 },
    });
    expect(result.data).toEqual([rawCostHistory]);
    expect(result.data[0].effectiveTo).toBeNull();
  });
});

describe("recordConsumption", () => {
  beforeEach(() => vi.clearAllMocks());

  it("flattens the per-service selection into consumption rows", () => {
    expect(toConsumptionRecords({ 4: [{ product: 2, quantity: "1.500" }], 5: [] })).toEqual([
      { service: 4, product: 2, quantity: "1.500" },
    ]);
  });

  it("POSTs the flattened rows to the visit record-consumption endpoint", async () => {
    mock.post.mockResolvedValue({ data: {} });

    await recordConsumption(12, { 4: [{ product: 2, quantity: "1.500" }] });

    expect(mock.post).toHaveBeenCalledWith("/finance/visits/12/record-consumption/", {
      consumptions: [{ service: 4, product: 2, quantity: "1.500" }],
    });
  });

  it("skips the request when the selection is empty", async () => {
    await recordConsumption(12, {});

    expect(mock.post).not.toHaveBeenCalled();
  });
});
