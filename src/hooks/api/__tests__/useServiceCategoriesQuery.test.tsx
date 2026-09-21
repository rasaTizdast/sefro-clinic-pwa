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
import * as serviceCategoriesService from "../../../services/serviceCategories";
import type { ServiceCategory } from "../../../types/finance";
import {
  useDeleteServiceCategory,
  useSaveServiceCategory,
  useServiceCategories,
} from "../useServiceCategoriesQuery";

vi.mock("../../../services/serviceCategories", () => ({
  listCategories: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
}));

const category: ServiceCategory = {
  id: 3,
  name: "لیزر",
  slug: "laser",
  description: "خدمات لیزر",
  isActive: true,
  sortOrder: 2,
};

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper, invalidateQueries };
}

describe("useServiceCategoriesQuery hooks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("useServiceCategories returns the whole mapped list", async () => {
    vi.mocked(serviceCategoriesService.listCategories).mockResolvedValue([category]);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useServiceCategories(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(serviceCategoriesService.listCategories).toHaveBeenCalledTimes(1);
    expect(result.current.data?.[0].slug).toBe("laser");
  });

  it("useSaveServiceCategory creates a category and invalidates the list", async () => {
    vi.mocked(serviceCategoriesService.createCategory).mockResolvedValue(category);
    const payload = { name: "لیزر", slug: "laser", sortOrder: 2 };

    const { wrapper, invalidateQueries } = createWrapper();
    const { result } = renderHook(() => useSaveServiceCategory(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ payload });
    });

    expect(serviceCategoriesService.createCategory).toHaveBeenCalledWith(payload);
    expect(serviceCategoriesService.updateCategory).not.toHaveBeenCalled();
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.serviceCategories.all });
    expect(toast.success).toHaveBeenCalledWith("دسته‌بندی خدمت ایجاد شد");
  });

  it("useSaveServiceCategory updates when an id is given", async () => {
    vi.mocked(serviceCategoriesService.updateCategory).mockResolvedValue(category);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useSaveServiceCategory(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: 3, payload: { name: "لیزر", isActive: false } });
    });

    expect(serviceCategoriesService.updateCategory).toHaveBeenCalledWith(3, {
      name: "لیزر",
      isActive: false,
    });
    expect(toast.success).toHaveBeenCalledWith("دسته‌بندی خدمت ویرایش شد");
  });

  it("useDeleteServiceCategory deletes by id, invalidates and toasts", async () => {
    vi.mocked(serviceCategoriesService.deleteCategory).mockResolvedValue(undefined);

    const { wrapper, invalidateQueries } = createWrapper();
    const { result } = renderHook(() => useDeleteServiceCategory(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(3);
    });

    expect(serviceCategoriesService.deleteCategory).toHaveBeenCalledWith(3);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.serviceCategories.all });
    expect(toast.success).toHaveBeenCalledWith("دسته‌بندی خدمت حذف شد");
  });

  it("useDeleteServiceCategory toasts the backend 400 message", async () => {
    vi.mocked(serviceCategoriesService.deleteCategory).mockRejectedValue(
      new Error("این دسته‌بندی دارای خدمت است و حذف نمی‌شود.")
    );

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useDeleteServiceCategory(), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync(3)).rejects.toBeTruthy();
    });

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("این دسته‌بندی دارای خدمت است و حذف نمی‌شود.")
    );
  });
});
