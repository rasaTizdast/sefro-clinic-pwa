import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SalesTab } from "../SalesTab";

const state = vi.hoisted(() => ({
  paidVisitIds: [] as number[],
  visits: [
    {
      id: 9,
      customerName: "بیمار تست",
      time: "10:30",
      services: [1],
      serviceNames: ["فیشال صورت"],
    },
  ],
}));

vi.mock("../../../hooks/api", () => ({
  useAllServices: () => ({ data: [{ id: 1, price: 1000000 }], isLoading: false }),
  useAllVisits: () => ({ data: state.visits, isLoading: false }),
  usePaidVisitIds: () => ({ data: state.paidVisitIds, isLoading: false }),
}));

vi.mock("../VisitCheckoutModal", () => ({
  VisitCheckoutModal: ({ visitId }: { visitId: number }) => (
    <div data-testid="visit-checkout">checkout {visitId}</div>
  ),
}));

describe("SalesTab", () => {
  beforeEach(() => {
    state.paidVisitIds = [];
  });

  it("lists completed visits that have no paid sale", () => {
    render(<SalesTab />);

    expect(screen.getByText("نوبت‌های تکمیل‌شده و تسویه‌نشده")).toBeInTheDocument();
    expect(screen.getByText("1 نوبت")).toBeInTheDocument();
    expect(screen.getByText("بیمار تست")).toBeInTheDocument();
    expect(screen.getByText("۱٬۰۰۰٬۰۰۰ تومان")).toBeInTheDocument();
  });

  it("hides visits that already have a paid sale", () => {
    state.paidVisitIds = [9];

    render(<SalesTab />);

    expect(screen.getByText("نوبت تسویه‌نشده‌ای وجود ندارد.")).toBeInTheDocument();
    expect(screen.queryByText("بیمار تست")).not.toBeInTheDocument();
  });

  it("opens the visit checkout modal from the تسویه button", async () => {
    const user = userEvent.setup();
    render(<SalesTab />);

    await user.click(screen.getByRole("button", { name: "تسویه" }));

    expect(screen.getByTestId("visit-checkout")).toHaveTextContent("checkout 9");
  });
});
