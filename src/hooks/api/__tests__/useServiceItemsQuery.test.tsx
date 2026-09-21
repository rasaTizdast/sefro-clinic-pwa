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
import * as serviceItemsService from "../../../services/serviceItems";
import type { ServiceItem } from "../../../types/finance";
import { useServiceItems, useSyncServiceItems } from "../useServiceItemsQuery";

vi.mock("../../../services/serviceItems", () => ({
  listServiceItems: vi.fn(),
  syncServiceItems: vi.fn(),
}));

const item: ServiceItem = {
  id: 11,
  service: 4,
  product: 2,
  productName: "ژل لیزر",
  quantity: "1.50",
};

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper, invalidateQueries };
}

describe("useServiceItemsQuery hooks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("useServiceItems loads the consumables of one service", async () => {
    vi.mocked(serviceItemsService.listServiceItems).mockResolvedValue([item]);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useServiceItems(4), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(serviceItemsService.listServiceItems).toHaveBeenCalledWith(4);
    expect(result.current.data?.[0].quantity).toBe("1.50");
  });

  it("useServiceItems stays idle without a service id", () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useServiceItems(0), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(serviceItemsService.listServiceItems).not.toHaveBeenCalled();
  });

  it("useSyncServiceItems syncs the rows and invalidates the service detail + list", async () => {
    vi.mocked(serviceItemsService.syncServiceItems).mockResolvedValue([item]);
    const items = [{ product: 2, quantity: "1.50" }];

    const { wrapper, invalidateQueries } = createWrapper();
    const { result } = renderHook(() => useSyncServiceItems(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ serviceId: 4, items });
    });

    expect(serviceItemsService.syncServiceItems).toHaveBeenCalledWith(4, items);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.serviceItems.list(4) });
    // the service detail embeds the consumables + estimated costs
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.services.detail(4) });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.services.all });
    expect(toast.success).toHaveBeenCalledWith("مواد مصرفی خدمت ذخیره شد");
  });

  it("useSyncServiceItems toasts the extracted api error on failure", async () => {
    vi.mocked(serviceItemsService.syncServiceItems).mockRejectedValue({
      message: "خطای سرور",
      raw: { quantity: ["مقدار باید بزرگ‌تر از صفر باشد."] },
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useSyncServiceItems(), { wrapper });

    await act(async () => {
      await expect(
        result.current.mutateAsync({ serviceId: 4, items: [{ product: 2, quantity: "0.00" }] })
      ).rejects.toBeTruthy();
    });

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("مقدار باید بزرگ‌تر از صفر باشد.")
    );
  });
});
