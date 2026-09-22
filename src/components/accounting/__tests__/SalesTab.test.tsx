import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SalesTab } from "../SalesTab";

const sale = {
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

let canManageFinance = true;

vi.mock("../../../hooks/api", () => ({
  useSalesList: () => ({
    data: {
      data: [sale],
      total: 1,
      page: 1,
      perPage: 20,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    },
    isLoading: false,
  }),
  useCustomersList: () => ({
    data: {
      data: [{ id: 5, firstName: "تسویه", lastName: "تست" }],
      total: 1,
      page: 1,
      perPage: 200,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    },
    isLoading: false,
  }),
  usePackagesList: () => ({
    data: {
      data: [],
      total: 0,
      page: 1,
      perPage: 100,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    },
    isLoading: false,
  }),
  useServicesList: () => ({
    data: {
      data: [],
      total: 0,
      page: 1,
      perPage: 200,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    },
    isLoading: false,
  }),
  useVisitsList: () => ({
    data: {
      data: [],
      total: 0,
      page: 1,
      perPage: 200,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    },
    isLoading: false,
  }),
  useCurrentRate: () => ({ data: null, isLoading: false }),
  useCheckout: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRecordConsumption: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRefundSale: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("../../../hooks/usePermissions", () => ({
  usePermissions: () => ({ canManageFinance }),
}));

describe("SalesTab", () => {
  it("renders paginated sales with Toman primary, USD secondary and a paid badge", () => {
    render(<SalesTab />);

    // the Table renders desktop + mobile layouts, so rows appear twice
    expect(screen.getAllByText("تسویه تست").length).toBeGreaterThan(0);
    expect(screen.getAllByText("۱٬۰۰۰٬۰۰۰ تومان").length).toBeGreaterThan(0);
    expect(screen.getAllByText("$10.00").length).toBeGreaterThan(0);
    expect(screen.getAllByText("پرداخت‌شده").length).toBeGreaterThan(0);
  });

  it("shows the refund button for admins and opens the refund modal", async () => {
    canManageFinance = true;
    const user = userEvent.setup();
    render(<SalesTab />);

    await user.click(screen.getAllByRole("button", { name: "استرداد فروش #12" })[0]);
    expect(screen.getByText("استرداد فروش #12")).toBeInTheDocument();
  });

  it("hides the refund button for employees", () => {
    canManageFinance = false;
    render(<SalesTab />);

    expect(screen.queryByRole("button", { name: "استرداد فروش #12" })).not.toBeInTheDocument();
    canManageFinance = true;
  });

  it("opens the standalone new-sale flow from «فروش جدید»", async () => {
    const user = userEvent.setup();
    render(<SalesTab />);

    await user.click(screen.getByRole("button", { name: "فروش جدید" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("فروش جدید")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "ادامه به تسویه" })).toBeDisabled();
  });
});
