import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../components/ui", () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }),
}));

import * as servicesService from "../../../services/services";
import { useCreateService, useDeleteService, useServicesList } from "../useServicesQuery";

vi.mock("../../../services/services", () => ({
  listServices: vi.fn(),
  getService: vi.fn(),
  createService: vi.fn(),
  updateService: vi.fn(),
  deleteService: vi.fn(),
}));

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useServicesQuery hooks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("useServicesList calls listServices", async () => {
    vi.mocked(servicesService.listServices).mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      perPage: 20,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    });
    const { result } = renderHook(() => useServicesList(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(servicesService.listServices).toHaveBeenCalled();
  });

  it("useCreateService calls createService", async () => {
    vi.mocked(servicesService.createService).mockResolvedValue({ id: 1 } as never);
    const { result } = renderHook(() => useCreateService(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.mutateAsync({ title: "کوتاهی مو", duration: 30 });
    });
    expect(servicesService.createService).toHaveBeenCalled();
  });

  it("useDeleteService calls deleteService with id", async () => {
    vi.mocked(servicesService.deleteService).mockResolvedValue({ data: {} } as never);
    const { result } = renderHook(() => useDeleteService(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.mutateAsync(1);
    });
    expect(servicesService.deleteService).toHaveBeenCalledWith(1);
  });
});
