import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PayoutsTab } from "../PayoutsTab";

const payout = {
  id: 3,
  staff: 7,
  staffName: "دکتر احمدی",
  visit: 9,
  service: 4,
  serviceName: "لیزر",
  role: "doctor",
  revenueUsd: "50.00",
  revenueToman: "5000000",
  productCostUsd: "10.00",
  productCostToman: "1000000",
  profitUsd: "40.00",
  profitToman: "4000000",
  payoutCashUsd: "8.00",
  payoutCashToman: "800000",
  payoutProduct: null,
  productName: null,
  payoutProductQty: "0.00",
  payoutProductValueUsd: "0.00",
  payoutProductValueToman: "0",
  totalPayoutUsd: "8.00",
  totalPayoutToman: "800000",
  exchangeRate: "100000.00",
  status: "pending",
  payoutMode: "cash",
  notes: "",
  approvedBy: null,
  approvedAt: null,
  paidAt: null,
  createdAt: "2026-09-20T08:00:00Z",
};

const summary = {
  totalCashUsd: "8.00",
  totalCashToman: "800000",
  totalProductValueUsd: "0.00",
  totalProductValueToman: "0",
  totalPayoutUsd: "8.00",
  totalPayoutToman: "800000",
  payoutCount: 1,
};

let lastSummaryParams: unknown = null;

vi.mock("../../../hooks/api", () => ({
  usePayoutSummary: (params: unknown) => {
    lastSummaryParams = params;
    return { data: summary, isLoading: false };
  },
  usePayoutsList: () => ({
    data: {
      data: [payout],
      total: 1,
      page: 1,
      perPage: 20,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    },
    isLoading: false,
  }),
}));

describe("PayoutsTab", () => {
  it("renders summary cards with Toman primary values and the payout count", () => {
    render(<PayoutsTab />);

    expect(screen.getByText("مجموع نقدی")).toBeInTheDocument();
    expect(screen.getByText("۸۰۰٬۰۰۰")).toBeInTheDocument();
    expect(screen.getByText("تعداد تسویه")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("renders the payouts table with staff, service, role and status", () => {
    render(<PayoutsTab />);

    // the Table renders desktop + mobile layouts, so rows appear twice
    expect(screen.getAllByText("دکتر احمدی").length).toBeGreaterThan(0);
    expect(screen.getAllByText("لیزر").length).toBeGreaterThan(0);
    expect(screen.getAllByText("پزشک").length).toBeGreaterThan(0);
    expect(screen.getAllByText("در انتظار").length).toBeGreaterThan(0);
  });

  it("sends the selected period param to the summary query", async () => {
    const user = userEvent.setup();
    render(<PayoutsTab />);

    expect(lastSummaryParams).toEqual({ period: "today" });

    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByText("این ماه"));

    expect(lastSummaryParams).toEqual({ period: "this_month" });
  });
});
