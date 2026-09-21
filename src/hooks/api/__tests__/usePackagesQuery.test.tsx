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
import * as packagesService from "../../../services/packages";
import type { Package } from "../../../types/finance";
import { usePackage, usePackagesList, useSavePackage } from "../usePackagesQuery";

vi.mock("../../../services/packages", () => ({
  listPackages: vi.fn(),
  getPackage: vi.fn(),
  savePackage: vi.fn(),
}));

const pkg: Package = {
  id: 5,
  name: "پکیج لیزر",
  description: "۶ جلسه",
  priceUsd: "300.00",
  priceToman: "30000000",
  exchangeRate: "100000.00",
  isActive: true,
  services: [4, 7],
  items: [{ product: 2, quantity: "1.00" }],
};

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper, invalidateQueries };
}

describe("usePackagesQuery hooks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("usePackagesList passes the pagination params to listPackages", async () => {
    vi.mocked(packagesService.listPackages).mockResolvedValue({
      data: [pkg],
      total: 1,
      page: 1,
      perPage: 20,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => usePackagesList({ page: 1, search: "لیزر" }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(packagesService.listPackages).toHaveBeenCalledWith({ page: 1, search: "لیزر" });
    expect(result.current.data?.data[0].priceToman).toBe("30000000");
  });

  it("usePackage fetches one package", async () => {
    vi.mocked(packagesService.getPackage).mockResolvedValue(pkg);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => usePackage(5), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(packagesService.getPackage).toHaveBeenCalledWith(5);
    expect(result.current.data?.services).toEqual([4, 7]);
  });

  it("useSavePackage saves the input, invalidates packages and toasts", async () => {
    vi.mocked(packagesService.savePackage).mockResolvedValue(pkg);
    const input: packagesService.PackageInput = {
      name: "پکیج لیزر",
      priceUsd: "300.00",
      serviceIds: [4, 7],
      items: [{ product: 2, quantity: "1.00" }],
    };

    const { wrapper, invalidateQueries } = createWrapper();
    const { result } = renderHook(() => useSavePackage(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(input);
    });

    expect(packagesService.savePackage).toHaveBeenCalledWith(input);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.packages.all });
    expect(toast.success).toHaveBeenCalledWith("پکیج ذخیره شد");
  });

  it("useSavePackage toasts the backend message on failure", async () => {
    vi.mocked(packagesService.savePackage).mockRejectedValue(new Error("خدمت انتخابی نامعتبر است"));

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useSavePackage(), { wrapper });

    await act(async () => {
      await expect(
        result.current.mutateAsync({ name: "x", priceUsd: "1.00" })
      ).rejects.toBeTruthy();
    });

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("خدمت انتخابی نامعتبر است"));
  });
});
