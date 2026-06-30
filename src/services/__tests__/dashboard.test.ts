import { beforeEach, describe, expect, it, vi } from "vitest";

import * as apiClient from "../../lib/api-client";
import { getDashboardStats } from "../dashboard";

vi.mock("../../lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

const mock = vi.mocked(apiClient.apiClient);

describe("dashboard service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches and maps dashboard stats", async () => {
    mock.get.mockResolvedValue({
      data: {
        customerCount: 100,
        loyalCustomerCount: 30,
        todaySales: "5000000",
        todayVisits: 12,
        newCustomers: 5,
      },
    });
    const result = await getDashboardStats();
    expect(result.customerCount).toBe(100);
    expect(result.loyalCustomerCount).toBe(30);
    expect(result.todaySales).toBe(5000000);
    expect(result.todayVisits).toBe(12);
    expect(result.newCustomers).toBe(5);
  });

  it("defaults missing fields to zero", async () => {
    mock.get.mockResolvedValue({ data: {} });
    const result = await getDashboardStats();
    expect(result.customerCount).toBe(0);
    expect(result.loyalCustomerCount).toBe(0);
    expect(result.todaySales).toBe(0);
    expect(result.todayVisits).toBe(0);
    expect(result.newCustomers).toBe(0);
  });
});
