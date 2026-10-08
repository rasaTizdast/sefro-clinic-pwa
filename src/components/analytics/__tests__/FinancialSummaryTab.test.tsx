import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { FinancialSummary, WelcomePackReport } from "../../../types/finance";
import { FinancialSummaryTab } from "../FinancialSummaryTab";

const state = vi.hoisted(() => ({
  summary: null as FinancialSummary | null,
  isLoading: false,
  isError: false,
  error: null as unknown,
  packReport: null as WelcomePackReport | null,
  purchases: [] as unknown[],
}));

vi.mock("../../../hooks/api", () => ({
  useFinancialSummary: () => ({
    data: state.summary,
    isLoading: state.isLoading,
    isError: state.isError,
    error: state.error,
  }),
  useWelcomePackReport: () => ({ data: state.packReport }),
  useAllPurchases: () => ({ data: state.purchases }),
}));

const summaryFixture = (overrides: Partial<FinancialSummary> = {}): FinancialSummary => ({
  period: { start: "2026-09-01", end: "2026-09-30" },
  revenue: { usd: "113.51", toman: "27652967" },
  revenueBasis: "sale_ledger",
  productCost: { usd: "10.00", toman: "1000000" },
  welcomePackCost: { usd: "4.13", toman: "413000" },
  grossProfit: { usd: "99.38", toman: "26239967" },
  expenses: { usd: "5.00", toman: "500000" },
  staffCompensation: {
    cash: { usd: "20.00", toman: "2000000" },
    product: { usd: "10.00", toman: "1000000" },
    total: { usd: "30.00", toman: "3000000" },
    payoutCount: 6,
    byRole: {
      doctor: {
        role: "doctor",
        count: 3,
        cashUsd: "13.00",
        cashToman: "1300000",
        productUsd: "0.00",
        productToman: "0",
        totalUsd: "13.00",
        totalToman: "1300000",
      },
      facial: {
        role: "facial",
        count: 2,
        cashUsd: "5.00",
        cashToman: "500000",
        productUsd: "0.00",
        productToman: "0",
        totalUsd: "5.00",
        totalToman: "500000",
      },
      laser: {
        role: "laser",
        count: 1,
        cashUsd: "2.00",
        cashToman: "1200000",
        productUsd: "10.00",
        productToman: "0",
        totalUsd: "12.00",
        totalToman: "1200000",
      },
    },
  },
  operatingExpenses: { usd: "20.00", toman: "2000000", count: 4 },
  staffExpenseClaims: { usd: "5.00", toman: "500000", count: 2 },
  belowTheLineTotal: { usd: "55.00", toman: "5500000" },
  netProfit: { usd: "44.38", toman: "20739967" },
  costCoverage: { zeroCostRows: 0, productsMissingCost: [] },
  paymentMethods: { cash: "4.28", card: "2.00", wallet: "0.00" },
  counts: {
    appointments: 8,
    packagesSold: 0,
    productsSoldQuantity: "3.000",
    paidSales: 12,
    averageTransactionValue: "9.46",
  },
  ...overrides,
});

/** Text of the bridge row identified by its stable test id. */
function rowText(testId: string): string {
  return screen.getByTestId(testId).textContent ?? "";
}

/** A purchase dated inside whatever period the tab is currently showing. */
function purchaseOn(date: string) {
  return {
    id: 1,
    product: 2,
    quantity: "2.000",
    unitCostUsd: "10.00",
    totalCostUsd: "20.00",
    supplier: "",
    purchaseDate: date,
    exchangeRateSnapshot: "100000.00",
    createdAt: `${date}T08:00:00Z`,
  };
}

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

beforeEach(() => {
  state.summary = summaryFixture();
  state.isLoading = false;
  state.isError = false;
  state.error = null;
  state.packReport = {
    period: { start: "2026-09-01", end: "2026-09-30" },
    totalUsageCount: 3,
    totalPacksIssued: "3.000",
    totalCostUsd: "4.13",
    totalCostToman: "413000",
    byPack: [],
  };
  state.purchases = [];
});

describe("FinancialSummaryTab — backend as the single source of truth", () => {
  it("opens on the current month", () => {
    render(<FinancialSummaryTab />);
    expect(screen.getByRole("combobox")).toHaveTextContent("این ماه");
  });

  it("displays the backend gross profit verbatim, with no staff cost deducted", () => {
    render(<FinancialSummaryTab />);
    // backend gross_profit = 26,239,967 — shown exactly
    expect(rowText("bridge-gross-profit")).toContain("۲۶٬۲۳۹٬۹۶۷");
    // the payroll and opex figures appear as separate rows, not folded in
    expect(rowText("bridge-staff-payout")).toContain("۳٬۰۰۰٬۰۰۰");
    expect(rowText("bridge-operating")).toContain("۲٬۰۰۰٬۰۰۰");
  });

  it("displays the backend net profit verbatim instead of recomputing it", () => {
    render(<FinancialSummaryTab />);
    // The backend's own net_profit (gross − staff claims only). If the UI were
    // doing its own arithmetic this would read 23,739,967 instead.
    expect(rowText("bridge-net-profit")).toContain("۲۰٬۷۳۹٬۹۶۷");
    expect(screen.queryByText("۲۵٬۷۳۹٬۹۶۷")).not.toBeInTheDocument();
  });

  it("shows a separate row per staff role, using the backend's own split", () => {
    render(<FinancialSummaryTab />);
    expect(rowText("bridge-role-doctor")).toContain("پزشک (تسویه)");
    expect(rowText("bridge-role-doctor")).toContain("۱٬۳۰۰٬۰۰۰");
    expect(rowText("bridge-role-facial")).toContain("اپراتور فیشال (تسویه)");
    expect(rowText("bridge-role-facial")).toContain("۵۰۰٬۰۰۰");
    expect(rowText("bridge-role-laser")).toContain("اپراتور لیزر (تسویه)");
    expect(rowText("bridge-role-laser")).toContain("۱٬۲۰۰٬۰۰۰");
    // the aggregate is shown too, from staff_compensation.total
    expect(rowText("bridge-staff-payout")).toContain("۳٬۰۰۰٬۰۰۰");
    expect(rowText("bridge-staff-payout")).toContain("۶ فیش تسویه");
  });

  it("invents no role row when the backend returned no payouts", () => {
    state.summary = summaryFixture({
      staffCompensation: {
        cash: { usd: "0.00", toman: "0" },
        product: { usd: "0.00", toman: "0" },
        total: { usd: "0.00", toman: "0" },
        payoutCount: 0,
        byRole: {},
      },
    });
    render(<FinancialSummaryTab />);
    expect(screen.queryByTestId("bridge-role-doctor")).not.toBeInTheDocument();
    expect(screen.queryByTestId("bridge-role-facial")).not.toBeInTheDocument();
    expect(screen.queryByTestId("bridge-role-laser")).not.toBeInTheDocument();
    expect(rowText("bridge-staff-payout")).toContain("فیش تسویه‌ای ثبت نشده است");
  });

  it("warns only about buckets the backend genuinely does not deduct", () => {
    render(<FinancialSummaryTab />);
    // net_profit now subtracts staff, operating expenses and claims — so the old
    // "backend omits these" warning must not reappear.
    expect(
      screen.queryByText("سود خالص بک‌اند همه هزینه‌ها را کسر نمی‌کند")
    ).not.toBeInTheDocument();
    expect(rowText("bridge-below-the-line")).toContain("۵٬۵۰۰٬۰۰۰");
    expect(rowText("bridge-operating")).toContain("۴ ردیف هزینه جاری");
    expect(rowText("bridge-staff-claims")).toContain("۵۰۰٬۰۰۰");
    expect(rowText("bridge-staff-claims")).not.toContain("کسر نمی‌شود");
  });

  it("flags list-price revenue and zero-cost products as integrity warnings", () => {
    state.summary = summaryFixture({
      revenueBasis: "list_price",
      costCoverage: { zeroCostRows: 4, productsMissingCost: [11, 30] },
    });
    render(<FinancialSummaryTab />);
    expect(screen.getByText("درآمد این گزارش بالقوه است، نه دریافت‌شده")).toBeInTheDocument();
    expect(screen.getByText("پوشش هزینه محصول ناقص است")).toBeInTheDocument();
  });

  it("shows no integrity warnings when the backend reports clean data", () => {
    render(<FinancialSummaryTab />);
    expect(screen.queryByText("درآمد این گزارش بالقوه است، نه دریافت‌شده")).not.toBeInTheDocument();
    expect(screen.queryByText("پوشش هزینه محصول ناقص است")).not.toBeInTheDocument();
  });

  it("shows the welcome-pack cost once, stating the patient pays nothing", () => {
    render(<FinancialSummaryTab />);
    const row = rowText("bridge-welcome-pack");
    expect(row).toContain("۴۱۳٬۰۰۰");
    expect(row).toContain("$4.13");
    expect(row).toContain("چیزی پرداخت نمی‌کنند");
    // present exactly once in the whole tab
    expect(screen.getAllByText("هزینه بسته خوش‌آمدید")).toHaveLength(1);
  });

  it("keeps the restocking cash-out separate from the profit bridge", () => {
    state.purchases = [purchaseOn(todayIso())];
    render(<FinancialSummaryTab />);
    const row = rowText("bridge-purchase-cashout");
    expect(row).toContain("۲٬۰۰۰٬۰۰۰");
    expect(row).toContain("در سود خالص کسر نمی‌شود");
    // and it never leaks into the backend gross/net figures
    expect(rowText("bridge-gross-profit")).toContain("۲۶٬۲۳۹٬۹۶۷");
    expect(rowText("bridge-net-profit")).toContain("۲۰٬۷۳۹٬۹۶۷");
  });

  it("renders a real zero as ۰ تومان rather than a dash or an error", () => {
    state.summary = summaryFixture({
      revenue: { usd: "0.00", toman: "0" },
      productCost: { usd: "0.00", toman: "0" },
      welcomePackCost: { usd: "0.00", toman: "0" },
      grossProfit: { usd: "0.00", toman: "0" },
      expenses: { usd: "0.00", toman: "0" },
      belowTheLineTotal: { usd: "0.00", toman: "0" },
      netProfit: { usd: "0.00", toman: "0" },
      counts: { ...summaryFixture().counts, paidSales: 0, averageTransactionValue: "0.00" },
    });
    render(<FinancialSummaryTab />);
    expect(rowText("bridge-revenue")).toContain("۰ تومان");
    expect(rowText("bridge-net-profit")).toContain("۰ تومان");
  });

  it("formats Toman with Persian digits and the ٬ separator, without scaling", () => {
    state.summary = summaryFixture({
      revenue: { usd: "1.15", toman: "1150000" },
      productCost: { usd: "0.04", toman: "40000" },
    });
    render(<FinancialSummaryTab />);
    expect(rowText("bridge-revenue")).toContain("۱٬۱۵۰٬۰۰۰ تومان");
    expect(rowText("bridge-product-cost")).toContain("۴۰٬۰۰۰ تومان");
    // the database amount is shown as-is — never multiplied by 1000
    expect(screen.queryByText(/۱٬۱۵۰٬۰۰۰٬۰۰۰/)).not.toBeInTheDocument();
  });

  it("shows the backend average transaction value instead of dividing revenue locally", () => {
    render(<FinancialSummaryTab />);
    const stat = screen.getByText("میانگین تراکنش").parentElement?.textContent ?? "";
    expect(stat).toContain("$9.46");
    // 27,652,967 / 12 would be 2,304,414 — that locally-derived figure is gone
    expect(stat).not.toContain("۲٬۳۰۴٬۴۱۴");
  });

  it("refreshes every card when the reporting period changes", async () => {
    const user = userEvent.setup();
    const seen: string[] = [];
    state.summary = summaryFixture();
    render(<FinancialSummaryTab />);

    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByText("امسال"));
    seen.push(screen.getByText("جریان مالی · امسال").textContent ?? "");
    expect(screen.getByText("کسرشونده از سود ناخالص · امسال")).toBeInTheDocument();
  });

  it("surfaces a backend failure instead of rendering fabricated zeros", () => {
    state.isError = true;
    state.error = { message: "خطای سرور" };
    render(<FinancialSummaryTab />);
    expect(screen.getByText("گزارش مالی در دسترس نیست")).toBeInTheDocument();
    expect(screen.getByText("خطای سرور")).toBeInTheDocument();
    // no money rows invented while the report is unavailable
    expect(screen.queryByText("سود خالص (محاسبه‌شده در بک‌اند)")).not.toBeInTheDocument();
  });

  it("explains a zero staff payout as 'no payout recorded', not missing data", () => {
    state.summary = summaryFixture({
      staffCompensation: {
        cash: { usd: "0.00", toman: "0" },
        product: { usd: "0.00", toman: "0" },
        total: { usd: "0.00", toman: "0" },
        payoutCount: 0,
        byRole: {},
      },
    });
    render(<FinancialSummaryTab />);
    expect(rowText("bridge-staff-payout")).toContain("۰ تومان");
    expect(rowText("bridge-staff-payout")).toContain("فیش تسویه‌ای ثبت نشده است");
  });
});
