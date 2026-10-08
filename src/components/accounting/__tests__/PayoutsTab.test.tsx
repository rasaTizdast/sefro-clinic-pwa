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
let lastListParams: unknown = null;

const financialSummary = {
  period: { start: "2026-09-29", end: "2026-09-29" },
  revenue: { usd: "5000.00", toman: "50000000" },
  productCost: { usd: "1000.00", toman: "10000000" },
  grossProfit: { usd: "4000.00", toman: "40000000" },
  expenses: { usd: "0.00", toman: "0" },
  netProfit: { usd: "4000.00", toman: "40000000" },
  paymentMethods: { cash: "0.00", card: "0.00", wallet: "0.00" },
  counts: {
    appointments: 0,
    packagesSold: 0,
    productsSoldQuantity: "0.000",
    paidSales: 0,
    averageTransactionValue: "0.00",
  },
};

vi.mock("../../../hooks/api", () => ({
  usePayoutSummary: (params: unknown) => {
    lastSummaryParams = params;
    return { data: summary, isLoading: false };
  },
  usePayoutsList: (params: unknown) => {
    lastListParams = params;
    return {
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
    };
  },
  useCompensationRules: () => ({ data: { data: [] } }),
  useFinancialSummary: () => ({ data: financialSummary, isLoading: false }),
}));

// `react-calendar-datetime-picker` is a CJS bundle that cannot be transformed in
// Vitest, so the picker is stubbed like the sibling tab tests do.
vi.mock("../../ui/JalaliDatePicker", () => ({
  JalaliDatePicker: ({
    label,
    value,
    onChange,
  }: {
    label?: string;
    value: string | null;
    onChange: (value: string | null) => void;
  }) => {
    const id = label ?? "date";
    return (
      <div>
        <label htmlFor={id}>{label}</label>
        <input id={id} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
      </div>
    );
  },
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

    await user.click(screen.getByRole("combobox", { name: "بازه زمانی" }));
    await user.click(screen.getByRole("option", { name: "این ماه" }));

    expect(lastSummaryParams).toEqual({ period: "this_month" });
  });

  it("shows the payouts total inside the finance picture of the same period", () => {
    render(<PayoutsTab />);

    expect(screen.getByText("موقعیت مالی · امروز")).toBeInTheDocument();
    expect(screen.getByText("تسویه پرسنل")).toBeInTheDocument();
    expect(screen.getByText(/از درآمد امروز/)).toBeInTheDocument();
    // The backend's own net_profit replaces the old local "gross − payouts"
    // line, so the UI cannot disagree with the server about what is left.
    expect(screen.getByText("سود خالص")).toBeInTheDocument();
    expect(screen.queryByText("باقی‌مانده پس از تسویه")).not.toBeInTheDocument();
  });

  it("passes the status filter to the list query", async () => {
    const user = userEvent.setup();
    render(<PayoutsTab />);

    expect(lastListParams).toEqual({ page: 1, perPage: 20 });

    await user.click(screen.getByRole("combobox", { name: "وضعیت" }));
    await user.click(screen.getByRole("option", { name: "در انتظار" }));

    expect(lastListParams).toEqual({ page: 1, perPage: 20, status: "pending" });
  });
});
