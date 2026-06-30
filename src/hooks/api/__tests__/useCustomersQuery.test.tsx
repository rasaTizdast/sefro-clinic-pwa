import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../components/ui", () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }),
}));

import * as customersService from "../../../services/customers";
import {
  useCreateCustomer,
  useCustomersList,
  useDeleteCustomer,
  useUpdateCustomer,
} from "../useCustomersQuery";

vi.mock("../../../services/customers", () => ({
  listCustomers: vi.fn(),
  getCustomer: vi.fn(),
  createCustomer: vi.fn(),
  updateCustomer: vi.fn(),
  deleteCustomer: vi.fn(),
}));

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useCustomersQuery hooks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("useCustomersList calls listCustomers", async () => {
    vi.mocked(customersService.listCustomers).mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      perPage: 20,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    });
    const { result } = renderHook(() => useCustomersList(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(customersService.listCustomers).toHaveBeenCalled();
  });

  it("useCreateCustomer calls createCustomer and returns data", async () => {
    vi.mocked(customersService.createCustomer).mockResolvedValue({ data: { id: 1 } } as never);
    const { result } = renderHook(() => useCreateCustomer(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.mutateAsync({
        firstName: "علی",
        lastName: "رضایی",
        mobileNumber: "0912",
        nationalId: "1234567890",
        bitmojiCode: "",
        notes: "",
      });
    });
    expect(customersService.createCustomer).toHaveBeenCalled();
  });

  it("useUpdateCustomer calls updateCustomer with id", async () => {
    vi.mocked(customersService.updateCustomer).mockResolvedValue({ data: {} } as never);
    const { result } = renderHook(() => useUpdateCustomer(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.mutateAsync({ id: 1, data: { firstName: "جدید" } });
    });
    expect(customersService.updateCustomer).toHaveBeenCalledWith(1, { firstName: "جدید" });
  });

  it("useDeleteCustomer calls deleteCustomer with id", async () => {
    vi.mocked(customersService.deleteCustomer).mockResolvedValue({ data: {} } as never);
    const { result } = renderHook(() => useDeleteCustomer(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.mutateAsync(1);
    });
    expect(customersService.deleteCustomer).toHaveBeenCalledWith(1);
  });
});
