import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../components/ui", () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }),
}));

import * as visitsService from "../../../services/visits";
import {
  useCancelVisit,
  useCompleteVisit,
  useConfirmVisit,
  useReserveVisit,
  useVisitsList,
} from "../useVisitsQuery";

vi.mock("../../../services/visits", () => ({
  listVisits: vi.fn(),
  getVisit: vi.fn(),
  confirmVisit: vi.fn(),
  completeVisit: vi.fn(),
  cancelVisit: vi.fn(),
  reserveVisit: vi.fn(),
  updateVisit: vi.fn(),
  deleteVisit: vi.fn(),
}));

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useVisitsQuery hooks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("useVisitsList calls listVisits", async () => {
    vi.mocked(visitsService.listVisits).mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      perPage: 50,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    });
    const { result } = renderHook(() => useVisitsList(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(visitsService.listVisits).toHaveBeenCalled();
  });

  it("useReserveVisit calls reserveVisit", async () => {
    vi.mocked(visitsService.reserveVisit).mockResolvedValue({ data: { id: 1 } } as never);
    const { result } = renderHook(() => useReserveVisit(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.mutateAsync({
        customer: 10,
        services: [1],
        date: "2026-06-15",
        time: "10:00",
      });
    });
    expect(visitsService.reserveVisit).toHaveBeenCalledWith({
      customer: 10,
      services: [1],
      date: "2026-06-15",
      time: "10:00",
    });
  });

  it("useConfirmVisit calls confirmVisit with id", async () => {
    vi.mocked(visitsService.confirmVisit).mockResolvedValue({ data: {} } as never);
    const { result } = renderHook(() => useConfirmVisit(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.mutateAsync(1);
    });
    expect(visitsService.confirmVisit).toHaveBeenCalledWith(1);
  });

  it("useCompleteVisit calls completeVisit with id", async () => {
    vi.mocked(visitsService.completeVisit).mockResolvedValue({ data: {} } as never);
    const { result } = renderHook(() => useCompleteVisit(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.mutateAsync(1);
    });
    expect(visitsService.completeVisit).toHaveBeenCalledWith(1);
  });

  it("useCancelVisit calls cancelVisit with id", async () => {
    vi.mocked(visitsService.cancelVisit).mockResolvedValue({ data: {} } as never);
    const { result } = renderHook(() => useCancelVisit(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.mutateAsync(1);
    });
    expect(visitsService.cancelVisit).toHaveBeenCalledWith(1);
  });
});
