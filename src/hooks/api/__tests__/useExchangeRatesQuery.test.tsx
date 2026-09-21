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
import * as exchangeRatesService from "../../../services/exchangeRates";
import { useCreateExchangeRate, useCurrentRate, useExchangeRates } from "../useExchangeRatesQuery";

vi.mock("../../../services/exchangeRates", () => ({
  listExchangeRates: vi.fn(),
  getCurrentRate: vi.fn(),
  getBackupRate: vi.fn(),
  createExchangeRate: vi.fn(),
}));

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper, queryClient, invalidateQueries };
}

describe("useExchangeRatesQuery hooks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("useCurrentRate fetches the rate and caches it for a minute", async () => {
    vi.mocked(exchangeRatesService.getCurrentRate).mockResolvedValue({
      rate: "985000.00",
      rateTomanPerUsd: "985000.00",
      effectiveAt: null,
      source: "manual",
    });

    const { wrapper, queryClient } = createWrapper();
    const { result } = renderHook(() => useCurrentRate(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(exchangeRatesService.getCurrentRate).toHaveBeenCalled();
    expect(result.current.data?.rate).toBe("985000.00");

    const query = queryClient.getQueryCache().find({ queryKey: queryKeys.finance.currentRate });
    expect(query?.options).toMatchObject({ staleTime: 60_000, retry: 1 });
  });

  it("useExchangeRates passes the page param to listExchangeRates", async () => {
    vi.mocked(exchangeRatesService.listExchangeRates).mockResolvedValue({
      data: [],
      total: 0,
      page: 2,
      perPage: 20,
      totalPages: 1,
      hasNext: false,
      hasPrev: true,
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useExchangeRates({ page: 2 }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(exchangeRatesService.listExchangeRates).toHaveBeenCalledWith({ page: 2 });
  });

  it("useCreateExchangeRate invalidates rate queries and toasts success", async () => {
    vi.mocked(exchangeRatesService.createExchangeRate).mockResolvedValue({
      id: 7,
      currencyFrom: "USD",
      currencyTo: "IRT",
      rate: "985000.00",
      effectiveAt: "2026-09-20T08:00:00Z",
      source: "manual",
      isActive: true,
      createdAt: "2026-09-20T08:00:00Z",
    });

    const { wrapper, invalidateQueries } = createWrapper();
    const { result } = renderHook(() => useCreateExchangeRate(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ rate: "985000.00" });
    });

    expect(exchangeRatesService.createExchangeRate).toHaveBeenCalledWith({ rate: "985000.00" });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.finance.exchangeRates,
    });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.finance.currentRate });
    expect(toast.success).toHaveBeenCalledWith("نرخ ارز ثبت شد");
  });

  it("useCreateExchangeRate toasts the extracted api error on failure", async () => {
    vi.mocked(exchangeRatesService.createExchangeRate).mockRejectedValue({
      message: "خطای سرور",
      raw: { rate: ["نرخ ارز نامعتبر است"] },
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateExchangeRate(), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync({ rate: "0" })).rejects.toBeTruthy();
    });

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("نرخ ارز نامعتبر است"));
  });
});
