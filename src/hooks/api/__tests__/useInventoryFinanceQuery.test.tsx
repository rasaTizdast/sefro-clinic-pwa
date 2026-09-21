import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const toast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
}));

vi.mock("../../../components/ui", () => ({ useToast: () => toast }));

import { queryKeys } from "../../../lib/query-keys";
import * as inventoryFinanceService from "../../../services/inventoryFinance";
import type { ProductCostHistory, ProductPurchase, ProductUsage } from "../../../types/finance";
import {
  useCostHistory,
  useCreatePurchase,
  usePurchasesList,
  useUsagesList,
} from "../useInventoryFinanceQuery";

vi.mock("../../../services/inventoryFinance", () => ({
  listPurchases: vi.fn(),
  createPurchase: vi.fn(),
  listUsages: vi.fn(),
  listCostHistory: vi.fn(),
}));

const purchase: ProductPurchase = {
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

const usage: ProductUsage = {
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

const costRow: ProductCostHistory = {
  id: 31,
  product: 2,
  costUsd: "50.00",
  effectiveFrom: "2026-09-20T08:30:00Z",
  effectiveTo: null,
  createdAt: "2026-09-20T08:30:00Z",
};

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper, invalidateQueries };
}

describe("useInventoryFinanceQuery hooks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("usePurchasesList passes the params to listPurchases", async () => {
    vi.mocked(inventoryFinanceService.listPurchases).mockResolvedValue({
      data: [purchase],
      total: 1,
      page: 1,
      perPage: 20,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => usePurchasesList({ product: 2 }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(inventoryFinanceService.listPurchases).toHaveBeenCalledWith({ product: 2 });
    expect(result.current.data?.data[0].totalCostUsd).toBe("150.00");
  });

  it("useUsagesList passes the filters to listUsages", async () => {
    vi.mocked(inventoryFinanceService.listUsages).mockResolvedValue({
      data: [usage],
      total: 1,
      page: 1,
      perPage: 20,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useUsagesList({ visit: 12 }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(inventoryFinanceService.listUsages).toHaveBeenCalledWith({ visit: 12 });
    expect(result.current.data?.data[0].visit).toBe(12);
  });

  it("useCostHistory fetches the cost history of one product", async () => {
    vi.mocked(inventoryFinanceService.listCostHistory).mockResolvedValue({
      data: [costRow],
      total: 1,
      page: 1,
      perPage: 20,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCostHistory(2), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(inventoryFinanceService.listCostHistory).toHaveBeenCalledWith(2, undefined);
    expect(result.current.data?.data[0].costUsd).toBe("50.00");
  });

  it("useCreatePurchase saves the purchase, invalidates purchases/products and toasts", async () => {
    vi.mocked(inventoryFinanceService.createPurchase).mockResolvedValue(purchase);
    const input: inventoryFinanceService.PurchaseInput = {
      productId: 2,
      quantity: 3,
      unitCostToman: 5_000_000,
      rate: 100_000,
      supplier: "آزمایشگاه پارس",
      purchaseDateJalali: "1405/06/29",
    };

    const { wrapper, invalidateQueries } = createWrapper();
    const { result } = renderHook(() => useCreatePurchase(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(input);
    });

    expect(inventoryFinanceService.createPurchase).toHaveBeenCalledWith(input);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["finance", "purchases"] });
    // a purchase rewrites the product's cost + cost history server-side
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.products.all });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["finance", "costHistory"] });
    expect(toast.success).toHaveBeenCalledWith("خرید ثبت شد");
  });

  it("useCreatePurchase toasts the backend message on failure", async () => {
    vi.mocked(inventoryFinanceService.createPurchase).mockRejectedValue(
      new Error("مقدار باید بزرگ‌تر از صفر باشد.")
    );

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreatePurchase(), { wrapper });

    await act(async () => {
      await expect(
        result.current.mutateAsync({
          productId: 2,
          quantity: 0,
          unitCostToman: 0,
          rate: 100_000,
          purchaseDateJalali: "1405/06/29",
        })
      ).rejects.toBeTruthy();
    });

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("مقدار باید بزرگ‌تر از صفر باشد.")
    );
  });
});
