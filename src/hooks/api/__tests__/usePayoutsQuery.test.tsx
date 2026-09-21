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
import * as payoutsService from "../../../services/payouts";
import type { StaffCompensationRule, StaffPayout } from "../../../types/finance";
import {
  useCompensationRules,
  usePayoutsList,
  usePayoutSummary,
  useUpsertCompensationRule,
} from "../usePayoutsQuery";

vi.mock("../../../services/payouts", () => ({
  listPayouts: vi.fn(),
  listPayoutSummary: vi.fn(),
  listCompensationRules: vi.fn(),
  upsertCompensationRule: vi.fn(),
}));

const payout: StaffPayout = {
  id: 31,
  staff: 7,
  staffName: "دکتر رضایی",
  visit: 12,
  service: 4,
  serviceName: "لیزر",
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

const rule: StaffCompensationRule = {
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

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper, queryClient, invalidateQueries };
}

describe("usePayoutsQuery hooks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("usePayoutsList passes the filters to listPayouts", async () => {
    vi.mocked(payoutsService.listPayouts).mockResolvedValue({
      data: [payout],
      total: 1,
      page: 1,
      perPage: 20,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => usePayoutsList({ page: 1, staff: 7, status: "pending" }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(payoutsService.listPayouts).toHaveBeenCalledWith({
      page: 1,
      staff: 7,
      status: "pending",
    });
    expect(result.current.data?.data[0].totalPayoutUsd).toBe("32.00");
  });

  it("usePayoutSummary passes the period params to listPayoutSummary", async () => {
    vi.mocked(payoutsService.listPayoutSummary).mockResolvedValue({
      totalCashUsd: "120.00",
      totalCashToman: "12000000",
      totalProductValueUsd: "30.00",
      totalProductValueToman: "3000000",
      totalPayoutUsd: "150.00",
      totalPayoutToman: "15000000",
      payoutCount: 4,
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => usePayoutSummary({ period: "this_month" }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(payoutsService.listPayoutSummary).toHaveBeenCalledWith({ period: "this_month" });
    expect(result.current.data?.payoutCount).toBe(4);
  });

  it("useCompensationRules passes the role param to listCompensationRules", async () => {
    vi.mocked(payoutsService.listCompensationRules).mockResolvedValue({
      data: [rule],
      total: 1,
      page: 1,
      perPage: 20,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCompensationRules({ role: "doctor" }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(payoutsService.listCompensationRules).toHaveBeenCalledWith({ role: "doctor" });
    expect(result.current.data?.data[0].percentProfit).toBe("30.00");
  });

  it("useUpsertCompensationRule invalidates the rules query and toasts success", async () => {
    vi.mocked(payoutsService.upsertCompensationRule).mockResolvedValue(rule);

    const { wrapper, invalidateQueries } = createWrapper();
    const { result } = renderHook(() => useUpsertCompensationRule(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ payload: { role: "doctor", isActive: false } });
    });

    expect(payoutsService.upsertCompensationRule).toHaveBeenCalledWith(
      { role: "doctor", isActive: false },
      undefined
    );
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.payouts.rules });
    expect(toast.success).toHaveBeenCalledWith("قانون تسویه ذخیره شد");
  });

  it("useUpsertCompensationRule forwards the rule id when updating", async () => {
    vi.mocked(payoutsService.upsertCompensationRule).mockResolvedValue(rule);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useUpsertCompensationRule(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: 3, payload: { role: "doctor", isActive: true } });
    });

    expect(payoutsService.upsertCompensationRule).toHaveBeenCalledWith(
      { role: "doctor", isActive: true },
      3
    );
  });

  it("useUpsertCompensationRule toasts the extracted api error on failure", async () => {
    vi.mocked(payoutsService.upsertCompensationRule).mockRejectedValue({
      message: "خطای سرور",
      raw: { role: ["قانون این نقش از قبل وجود دارد"] },
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useUpsertCompensationRule(), { wrapper });

    await act(async () => {
      await expect(
        result.current.mutateAsync({ payload: { role: "doctor" } })
      ).rejects.toBeTruthy();
    });

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("قانون این نقش از قبل وجود دارد"));
  });
});
