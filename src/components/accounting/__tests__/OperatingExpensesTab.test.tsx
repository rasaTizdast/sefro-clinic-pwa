import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ToastProvider } from "../../ui/Toast";
import { OperatingExpensesTab } from "../OperatingExpensesTab";

const createMutateAsync = vi.fn().mockResolvedValue({ id: 1 });
const deleteMutateAsync = vi.fn().mockResolvedValue(undefined);

const categories = [
  {
    id: 7,
    name: "اجاره",
    slug: "rent",
    description: "",
    isActive: true,
    sortOrder: 0,
    createdAt: "",
    updatedAt: "",
  },
];

const expenses = [
  {
    id: 3,
    category: 7,
    categoryName: "اجاره",
    title: "اجاره مرداد",
    description: "",
    amountUsd: "100.00",
    exchangeRate: "100000.00",
    amountToman: "10000000",
    expenseDate: "2026-08-22T00:00:00Z",
    paymentMethod: "bank_transfer",
    vendor: "موجر",
    receipt: null,
    notes: "",
    createdBy: 1,
    createdByName: "مدیر",
    idempotencyKey: "uuid-1",
    createdAt: "2026-08-22T10:00:00Z",
    updatedAt: "2026-08-22T10:00:00Z",
  },
];

const listSpy = vi.fn();
const summarySpy = vi.fn();

vi.mock("react-calendar-datetime-picker", () => ({
  DtPicker: () => <input data-testid="dt-picker" readOnly />,
}));

vi.mock("../../ui/JalaliDatePicker", () => ({
  JalaliDatePicker: ({
    onChange,
    label,
  }: {
    onChange: (v: string | null) => void;
    label?: string;
  }) => {
    const id = label ?? "date";
    return (
      <div>
        <label htmlFor={id}>{label}</label>
        <input id={id} onChange={(e) => onChange(e.target.value)} value="" />
      </div>
    );
  },
}));

vi.mock("../../../hooks/api", () => ({
  useOperatingExpensesList: (params: unknown) => {
    listSpy(params);
    return {
      data: {
        data: expenses,
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
  useAllOperatingExpenseCategories: () => ({
    data: categories,
    isLoading: false,
  }),
  useOperatingExpenseSummary: (params: unknown) => {
    summarySpy(params);
    return {
      data: {
        period: { start: "2026-08-01", end: "2026-08-31" },
        totalUsd: "150.00",
        totalToman: "15000000",
        count: 3,
        byCategory: [
          {
            categoryId: 7,
            categoryName: "اجاره",
            totalUsd: "100.00",
            totalToman: "10000000",
            count: 2,
          },
        ],
        byPaymentMethod: [{ paymentMethod: "bank_transfer", totalUsd: "150.00", count: 3 }],
      },
      isLoading: false,
    };
  },
  useFinancialSummary: () => ({
    data: {
      period: { start: "2026-08-01", end: "2026-08-31" },
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
    },
    isLoading: false,
  }),
  useCreateOperatingExpense: () => ({ mutateAsync: createMutateAsync, isPending: false }),
  useUpdateOperatingExpense: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteOperatingExpense: () => ({ mutateAsync: deleteMutateAsync, isPending: false }),
  useCurrentRate: () => ({
    data: { rate: "100000.00", rateTomanPerUsd: "100000", effectiveAt: null, source: "manual" },
    isLoading: false,
  }),
  useCreateOperatingExpenseCategory: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateOperatingExpenseCategory: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteOperatingExpenseCategory: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("../../../hooks/usePermissions", () => ({
  usePermissions: () => ({ canManageFinance: true }),
}));

describe("OperatingExpensesTab", () => {
  const renderTab = () =>
    render(
      <ToastProvider>
        <OperatingExpensesTab />
      </ToastProvider>
    );
  it("renders the summary cards", () => {
    renderTab();

    expect(screen.getByText("جمع تومان (این ماه)")).toBeInTheDocument();
    expect(screen.getByText(/15/)).toBeInTheDocument();
    expect(screen.getByText("$150.00")).toBeInTheDocument();
  });

  it("renders the expense row", () => {
    renderTab();

    expect(screen.getAllByText("اجاره مرداد").length).toBeGreaterThan(0);
    expect(screen.getAllByText("اجاره").length).toBeGreaterThan(0);
    expect(screen.getAllByText("انتقال بانکی").length).toBeGreaterThan(0);
  });

  it("opens the create modal and submits a normalized payload", async () => {
    const user = userEvent.setup();
    renderTab();

    await user.click(screen.getByRole("button", { name: "هزینه جدید" }));
    expect(screen.getByText("ثبت هزینه جاری")).toBeInTheDocument();

    const dialog = within(screen.getByRole("dialog"));
    // fill the required fields (category combobox, title, amount)
    await user.click(dialog.getAllByRole("combobox")[0]); // category select is the first in the modal
    await user.click(screen.getByRole("option", { name: "اجاره" }));
    await user.type(dialog.getByLabelText("عنوان"), "اجاره مرداد");
    await user.type(dialog.getByLabelText("مبلغ (تومان)"), "1000000");
    await user.type(dialog.getByLabelText("تاریخ هزینه"), "1400/05/01");
    await user.click(dialog.getByRole("button", { name: "ثبت هزینه" }));

    expect(createMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.any(String),
        amountUsd: expect.any(String),
        expenseDate: expect.any(String),
        paymentMethod: expect.any(String),
        idempotencyKey: expect.any(String),
      })
    );
  });

  it("sends the current filters to the list hook", () => {
    renderTab();

    expect(listSpy).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, perPage: 20, ordering: "-expense_date" })
    );
  });

  it("places the expense total inside the finance picture of the same period", () => {
    renderTab();

    expect(screen.getByText("موقعیت مالی · این ماه")).toBeInTheDocument();
    expect(screen.getByText("هزینه‌های جاری")).toBeInTheDocument();
    expect(screen.getByText(/از درآمد این ماه/)).toBeInTheDocument();
    // Backend net_profit replaces the local "gross − operating" figure.
    expect(screen.getByText("سود خالص")).toBeInTheDocument();
    expect(screen.queryByText("سود پس از هزینه‌های جاری")).not.toBeInTheDocument();
  });

  it("sends the selected period to the summary query and relabels the total", async () => {
    const user = userEvent.setup();
    renderTab();

    expect(summarySpy).toHaveBeenCalledWith({ period: "this_month" });

    await user.click(screen.getByRole("combobox", { name: "بازه زمانی" }));
    await user.click(screen.getByRole("option", { name: "ماه قبل" }));

    expect(summarySpy).toHaveBeenCalledWith({ period: "prev_month" });
    expect(screen.getByText("جمع تومان (ماه قبل)")).toBeInTheDocument();
  });
});
