import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ProfitRow, StaffPayout } from "../../../types/finance";
import { ProfitBreakdownTab } from "../ProfitBreakdownTab";

const state = vi.hoisted(() => ({
  serviceRows: [] as ProfitRow[],
  packageRows: [] as ProfitRow[],
  staffRows: [] as ProfitRow[],
  payouts: [] as StaffPayout[],
  isLoading: false,
}));

vi.mock("../../../hooks/api", () => ({
  useProfitByService: () => ({ data: state.serviceRows, isLoading: state.isLoading }),
  useProfitByPackage: () => ({ data: state.packageRows, isLoading: state.isLoading }),
  useProfitByStaff: () => ({ data: state.staffRows, isLoading: state.isLoading }),
  useAllPayouts: () => ({ data: state.payouts }),
}));

const staffRow = (overrides: Partial<ProfitRow>): ProfitRow => ({
  staffId: 7,
  staffName: "دکتر رضایی",
  revenueUsd: "100.00",
  productCostUsd: "20.00",
  profitUsd: "80.00",
  revenueToman: "10000000",
  profitToman: "8000000",
  count: 3,
  ...overrides,
});

const payout = (overrides: Partial<StaffPayout>): StaffPayout => ({
  id: 1,
  staff: 7,
  staffName: "دکتر رضایی",
  visit: 1,
  service: 1,
  serviceName: "تزریق",
  role: "doctor",
  revenueUsd: "100.00",
  revenueToman: "10000000",
  productCostUsd: "20.00",
  productCostToman: "2000000",
  profitUsd: "80.00",
  profitToman: "8000000",
  payoutCashUsd: "40.00",
  payoutCashToman: "4000000",
  payoutProduct: null,
  productName: null,
  payoutProductQty: "0.000",
  payoutProductValueUsd: "0.00",
  payoutProductValueToman: "0",
  totalPayoutUsd: "40.00",
  totalPayoutToman: "4000000",
  exchangeRate: "100000",
  status: "pending",
  payoutMode: "cash",
  notes: "",
  approvedBy: null,
  approvedAt: null,
  paidAt: null,
  createdAt: new Date().toISOString(),
  ...overrides,
});

const isoToday = () => new Date().toISOString().slice(0, 10);

/** The staff table only exists once its tab is active. */
const openStaffTab = async () => {
  await userEvent.click(screen.getByRole("tab", { name: "پرسنل" }));
};

/** The table renders a desktop row and a mobile card, so names appear twice. */
const staffRowText = async (): Promise<string> => {
  const cells = await screen.findAllByText("دکتر رضایی");
  return cells[0].closest("tr")?.textContent ?? cells[0].parentElement?.textContent ?? "";
};

beforeEach(() => {
  state.serviceRows = [];
  state.packageRows = [];
  state.staffRows = [];
  state.payouts = [];
  state.isLoading = false;
});

describe("ProfitBreakdownTab", () => {
  it("labels each breakdown count by what it actually counts", () => {
    render(<ProfitBreakdownTab />);
    // The backend counts completed visits per service (revenue is list price per
    // visit), not consumption lines.
    expect(screen.getByRole("columnheader", { name: "تعداد ویزیت" })).toBeInTheDocument();
  });

  it("calls the list-price column potential revenue, not collected money", () => {
    // The backend computes this column as Service.price_usd per visit, so it is
    // the list price — it must not be labelled as cash received.
    render(<ProfitBreakdownTab />);
    expect(
      screen.getByRole("columnheader", { name: "درآمد بالقوه (قیمت لیست)" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "درآمد" })).not.toBeInTheDocument();
  });

  it("calls the derived margin potential profit too", () => {
    render(<ProfitBreakdownTab />);
    expect(screen.getByRole("columnheader", { name: "سود بالقوه" })).toBeInTheDocument();
  });

  it("shows each staff member's payout as their salary in the period", async () => {
    state.staffRows = [staffRow({})];
    state.payouts = [
      payout({ id: 1, totalPayoutUsd: "40.00", totalPayoutToman: "4000000" }),
      payout({ id: 2, totalPayoutUsd: "10.00", totalPayoutToman: "1000000" }),
    ];

    render(<ProfitBreakdownTab />);
    await openStaffTab();

    const text = await staffRowText();
    expect(text).toContain("$50.00"); // 40 + 10
    expect(text).toContain("۵٬۰۰۰٬۰۰۰"); // 4,000,000 + 1,000,000
  });

  it("ignores payouts from outside the selected period", async () => {
    state.staffRows = [staffRow({})];
    const outside = new Date();
    outside.setDate(outside.getDate() - 40);
    state.payouts = [payout({ createdAt: outside.toISOString() })];

    render(<ProfitBreakdownTab />);
    await openStaffTab();

    // Default period is the current month, so the old payout lands outside it.
    expect(await staffRowText()).toContain("—");
  });

  it("lists a staff member who only has payouts in the period", async () => {
    state.staffRows = [];
    state.payouts = [payout({ createdAt: `${isoToday()}T10:00:00Z` })];

    render(<ProfitBreakdownTab />);
    await openStaffTab();

    expect((await screen.findAllByText("دکتر رضایی")).length).toBeGreaterThan(0);
    expect(screen.getByRole("columnheader", { name: "حقوق/پرداختی" })).toBeInTheDocument();
  });
});
