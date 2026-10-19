import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { formatPrice } from "../../../lib/format";
import type { MonthlyCloseMonth } from "../../../types/finance";
import { MonthlyCloseTab } from "../MonthlyCloseTab";

// Freeze "today" so the year heading and the "next year" gating stay put.
vi.mock("jalaali-js", () => ({
  default: { toJalaali: () => ({ jy: 1405, jm: 7, jd: 26 }) },
}));

const MONTH_NAMES_FA = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

type MonthRow = { month: number; report?: MonthlyCloseMonth; isError: boolean };

function month(monthNumber: number, overrides: Partial<MonthlyCloseMonth> = {}): MonthlyCloseMonth {
  const key = `1405-${String(monthNumber).padStart(2, "0")}`;
  return {
    key,
    year: 1405,
    month: monthNumber,
    monthName: MONTH_NAMES_FA[monthNumber - 1],
    shamsiStart: `${key}-01`,
    shamsiEnd: `${key}-31`,
    isCurrent: false,
    isClosed: false,
    closedAt: null,
    closedByName: "",
    closeNote: "",
    wasReopened: false,
    reopenedAt: null,
    reopenReason: "",
    revenue: { usd: "100.00", toman: "10000000" },
    productCost: { usd: "20.00", toman: "2000000" },
    welcomePackCost: { usd: "0.00", toman: "0" },
    grossProfit: { usd: "80.00", toman: "8000000" },
    clinicShare: { usd: "40.00", toman: "4000000" },
    staffCompensationTotal: { usd: "8.00", toman: "800000" },
    operatingExpenses: { usd: "0.00", toman: "0" },
    staffExpenseClaims: { usd: "0.00", toman: "0" },
    netProfit: { usd: "72.00", toman: "7200000" },
    purchases: { usd: "0.00", toman: "0" },
    netProfitAfterPurchases: { usd: "72.00", toman: "7200000" },
    payoutTotal: { usd: "8.00", toman: "800000", payoutCount: 1 },
    operators: [],
    ...overrides,
  };
}

/** A year of per-month rows: مرداد closed, مهر current, تیر completely empty. */
function yearRows(): MonthRow[] {
  return Array.from({ length: 12 }, (_, index) => {
    const m = index + 1;
    if (m === 4) {
      // Nothing happened this month — every figure is zero.
      return {
        month: m,
        isError: false,
        report: month(m, {
          revenue: { usd: "0.00", toman: "0" },
          netProfit: { usd: "0.00", toman: "0" },
          payoutTotal: { usd: "0.00", toman: "0", payoutCount: 0 },
        }),
      };
    }
    return {
      month: m,
      isError: false,
      report: month(m, {
        ...(m === 5 ? { isClosed: true } : {}),
        ...(m === 7 ? { isCurrent: true } : {}),
      }),
    };
  });
}

const hookState: {
  rows: MonthRow[];
  isLoading: boolean;
  isError: boolean;
  refetchAll: () => void;
} = {
  rows: yearRows(),
  isLoading: false,
  isError: false,
  refetchAll: vi.fn(),
};

vi.mock("../../../hooks/api", () => ({
  useMonthlyCloseMonths: () => hookState,
}));

const monthRow = (name: string) => {
  const rows = screen.getAllByRole("row");
  const row = rows.find((r) => within(r).queryByText(name));
  if (!row) throw new Error(`no row for ${name}`);
  return row;
};

describe("MonthlyCloseTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hookState.rows = yearRows();
    hookState.isLoading = false;
    hookState.isError = false;
  });

  it("emphasizes the toman figure and keeps the USD twin quiet", () => {
    render(<MonthlyCloseTab />);

    const toman = within(monthRow("مرداد")).getByText(`${formatPrice(10000000)} تومان`);
    expect(toman.className).toContain("font-medium");
    expect(within(monthRow("مرداد")).getByText("$100.00").className).toContain("text-surface-400");
  });

  it("stripes months that have nothing in them", () => {
    render(<MonthlyCloseTab />);

    expect(monthRow("تیر").className).toContain("monthly-close-empty");
    expect(monthRow("مرداد").className).not.toContain("monthly-close-empty");
  });

  it("counts closed months in the summary and offers no close/reopen controls", () => {
    render(<MonthlyCloseTab />);

    expect(screen.getByText("ماه‌های بسته")).toBeTruthy();
    expect(screen.getByText("۱ از ۱۲")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "بستن ماه" })).toBeNull();
    expect(screen.queryByRole("button", { name: "بازگشایی" })).toBeNull();
  });

  it("shows an error badge on a month whose request failed", () => {
    hookState.rows = yearRows().map((row) =>
      row.month === 6 ? { ...row, report: undefined, isError: true } : row
    );
    render(<MonthlyCloseTab />);

    const row = monthRow("شهریور");
    expect(within(row).getByText("خطا")).toBeTruthy();
    expect(within(row).getAllByText("—").length).toBeGreaterThan(0);
  });
});
