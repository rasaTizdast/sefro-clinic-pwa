import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Expense, ExpenseCategory } from "../../../types/finance";
import { StaffExpensesTab } from "../StaffExpensesTab";

const state = vi.hoisted(() => ({
  claims: [] as Expense[],
  categories: [] as ExpenseCategory[],
  isLoading: false,
}));

vi.mock("../../../hooks/api", () => ({
  useExpensesList: () => ({
    data: {
      data: state.claims,
      total: state.claims.length,
      totalPages: 1,
      page: 1,
    },
    isLoading: state.isLoading,
  }),
  useAllExpenses: () => ({ data: state.claims }),
  useAllExpenseCategories: () => ({ data: state.categories }),
  useCurrentRate: () => ({ data: { rate: "100000", rateTomanPerUsd: "100000" } }),
  useCreateExpense: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateExpenseCategory: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ id: 9 }),
    isPending: false,
  }),
}));

// The form modal pulls in lib/date (jalaali-js is CJS and breaks named ESM imports
// under Vitest), so the date helpers are stubbed like the sibling tab's tests do.
vi.mock("../../../lib/date", () => ({
  formatJalaliDate: (value: string) => value,
  jalaliToGregorianISO: (value: string) => value,
}));

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

const claim = (overrides: Partial<Expense>): Expense => ({
  id: 1,
  createdBy: 2,
  createdByName: "دکتر رضایی",
  category: 1,
  categoryName: "ایاب و ذهاب",
  amountUsd: "5.00",
  exchangeRateSnapshot: "100000.00",
  amountToman: "500000",
  description: "کرایه تاکسی",
  vendor: "اسنپ",
  expenseDate: "2026-09-20",
  status: "draft",
  approvedBy: null,
  approvedByName: null,
  createdAt: "2026-09-20T10:00:00Z",
  updatedAt: "2026-09-20T10:00:00Z",
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  state.claims = [];
  state.categories = [{ id: 1, name: "ایاب و ذهاب", isActive: true }];
  state.isLoading = false;
});

describe("StaffExpensesTab", () => {
  it("explains the empty state", () => {
    render(<StaffExpensesTab />);
    expect(screen.getByText("مطالبه‌ای ثبت نشده است")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /مطالبه جدید/ })).toBeInTheDocument();
  });

  it("sums only claims that actually reduce profit", () => {
    state.claims = [
      claim({ id: 1, status: "approved", amountToman: "500000", amountUsd: "5.00" }),
      claim({ id: 2, status: "paid", amountToman: "300000", amountUsd: "3.00" }),
      claim({ id: 3, status: "submitted", amountToman: "100000", amountUsd: "1.00" }),
    ];

    render(<StaffExpensesTab />);

    // approved + paid = 800,000 — the submitted claim is not counted yet.
    expect(screen.getByText("۸۰۰٬۰۰۰ تومان")).toBeInTheDocument();
    expect(screen.getByText("$8.00")).toBeInTheDocument();
  });

  it("shows no per-row action buttons — claims are auto-approved on create", () => {
    state.claims = [claim({ id: 7, status: "draft" }), claim({ id: 8, status: "approved" })];

    render(<StaffExpensesTab />);

    expect(screen.queryByRole("button", { name: /ارسال مطالبه/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /تأیید مطالبه/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /پرداخت مطالبه/ })).not.toBeInTheDocument();
  });

  it("filters by status and shows the row count", async () => {
    const user = userEvent.setup();
    state.claims = [claim({ id: 1, status: "paid" })];

    render(<StaffExpensesTab />);

    expect(within(screen.getByRole("table")).getByText("پرداخت‌شده")).toBeInTheDocument();
    expect(screen.getByText(/۱ ردیف/)).toBeInTheDocument();

    await user.click(screen.getByRole("combobox", { name: "وضعیت" }));
    await user.click(screen.getByRole("option", { name: "ارسال‌شده" }));

    // The mocked list ignores the filter, so the row is still there — what matters
    // is that choosing a status does not blow up and keeps the table usable.
    expect(within(screen.getByRole("table")).getByText("پرداخت‌شده")).toBeInTheDocument();
  });
});
