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
import * as salesService from "../../../services/sales";
import type { Sale } from "../../../types/finance";
import { useCheckout, useSale, useSalesList } from "../useSalesQuery";

vi.mock("../../../services/sales", () => ({
  listSales: vi.fn(),
  getSale: vi.fn(),
  checkout: vi.fn(),
  refundSale: vi.fn(),
}));

const sale: Sale = {
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

const checkoutPayload = {
  customer: 5,
  amountUsd: "10.00",
  components: [{ method: "cash" as const, amountUsd: "10.00" }],
  visit: 9,
  package: null,
  idempotencyKey: "uuid-1",
  description: "",
};

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper, queryClient, invalidateQueries };
}

describe("useSalesQuery hooks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("useSalesList passes params to listSales", async () => {
    vi.mocked(salesService.listSales).mockResolvedValue({
      data: [sale],
      total: 1,
      page: 1,
      perPage: 20,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useSalesList({ page: 1, customer: 5 }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(salesService.listSales).toHaveBeenCalledWith({ page: 1, customer: 5 });
    expect(result.current.data?.data[0].amountUsd).toBe("10.00");
  });

  it("useSale stays disabled for a non-positive id", () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useSale(0), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(salesService.getSale).not.toHaveBeenCalled();
  });

  it("useCheckout invalidates sales, finance dashboard and visits, then toasts success", async () => {
    vi.mocked(salesService.checkout).mockResolvedValue(sale);

    const { wrapper, invalidateQueries } = createWrapper();
    const { result } = renderHook(() => useCheckout(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(checkoutPayload);
    });

    expect(salesService.checkout).toHaveBeenCalledWith(checkoutPayload);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.sales.all });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["finance", "dashboard"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.visits.all });
    expect(toast.success).toHaveBeenCalledWith("فروش ثبت شد");
  });

  it("useCheckout toasts the extracted api error on failure", async () => {
    vi.mocked(salesService.checkout).mockRejectedValue({
      message: "خطای سرور",
      raw: { components: ["مبلغ اجزا با مبلغ فروش برابر نیست"] },
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCheckout(), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync(checkoutPayload)).rejects.toBeTruthy();
    });

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("مبلغ اجزا با مبلغ فروش برابر نیست")
    );
  });
});
