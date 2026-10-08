import { beforeEach, describe, expect, it, vi } from "vitest";

import * as apiClient from "../../lib/api-client";
import type { ExpenseStatus } from "../../types/finance";
import {
  approveExpense,
  createExpense,
  createExpenseCategory,
  listAllExpenseCategories,
  listAllExpenses,
  listExpenses,
  payExpense,
  rejectExpense,
  submitExpense,
  toExpense,
} from "../expenses";

vi.mock("../../lib/api-client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const mock = vi.mocked(apiClient.apiClient);

const rawExpense = {
  id: 4,
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
  status: "draft" as ExpenseStatus,
  approvedBy: null,
  approvedByName: null,
  createdAt: "2026-09-20T10:00:00Z",
  updatedAt: "2026-09-20T10:00:00Z",
};

const paginated = (
  results: unknown[],
  { count = results.length, next = null }: { count?: number; next?: string | null } = {}
) => ({
  count,
  next,
  previous: null,
  results,
});

describe("expenses service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // clearAllMocks keeps queued once-implementations; reset drops them.
    mock.get.mockReset();
    mock.post.mockReset();
    mock.patch.mockReset();
  });

  it("maps a claim row", () => {
    const expense = toExpense(rawExpense);
    expect(expense.status).toBe("draft");
    expect(expense.amountToman).toBe("500000");
    expect(expense.categoryName).toBe("ایاب و ذهاب");
  });

  it("lists claims with the status filter", async () => {
    mock.get.mockResolvedValue({ data: paginated([rawExpense]) });

    const page = await listExpenses({ page: 2, perPage: 20, status: "submitted" });

    expect(mock.get).toHaveBeenCalledWith("/finance/expenses/", {
      params: expect.objectContaining({ page: 2, status: "submitted" }),
    });
    expect(page.data[0].id).toBe(4);
    expect(page.total).toBe(1);
  });

  it("walks every page for the full claim log", async () => {
    mock.get
      .mockResolvedValueOnce({
        data: paginated([rawExpense], { count: 2, next: "http://api/expenses/?page=2" }),
      })
      .mockResolvedValueOnce({ data: paginated([{ ...rawExpense, id: 5 }], { count: 2 }) });

    const all = await listAllExpenses();

    expect(mock.get).toHaveBeenCalledTimes(2);
    expect(mock.get).toHaveBeenLastCalledWith("/finance/expenses/", {
      params: { page: 2, per_page: 100 },
    });
    expect(all.map((row) => row.id)).toEqual([4, 5]);
  });

  it("creates a claim in USD with a Gregorian date", async () => {
    mock.post.mockResolvedValue({ data: rawExpense });

    await createExpense({
      category: 1,
      amountUsd: "5.00",
      expenseDate: "2026-09-20",
      description: "کرایه تاکسی",
      vendor: "اسنپ",
    });

    expect(mock.post).toHaveBeenCalledWith("/finance/expenses/", {
      category: 1,
      amount_usd: "5.00",
      expense_date: "2026-09-20",
      description: "کرایه تاکسی",
      vendor: "اسنپ",
    });
  });

  it("walks the claim lifecycle through its action endpoints", async () => {
    mock.post.mockResolvedValue({ data: rawExpense });

    await submitExpense(4);
    expect(mock.post).toHaveBeenLastCalledWith("/finance/expenses/4/submit/", {});

    await approveExpense(4);
    expect(mock.post).toHaveBeenLastCalledWith("/finance/expenses/4/approve/", {});

    await rejectExpense(4);
    expect(mock.post).toHaveBeenLastCalledWith("/finance/expenses/4/reject/", {});

    await payExpense(4);
    expect(mock.post).toHaveBeenLastCalledWith("/finance/expenses/4/pay/", {});
  });

  it("lists and creates claim categories", async () => {
    mock.get.mockResolvedValue({ data: paginated([{ id: 1, name: "ایاب و ذهاب" }]) });
    mock.post.mockResolvedValue({ data: { id: 2, name: "پذیرایی" } });

    const categories = await listAllExpenseCategories();
    expect(categories[0]).toEqual({ id: 1, name: "ایاب و ذهاب", isActive: true });

    const created = await createExpenseCategory("پذیرایی");
    expect(mock.post).toHaveBeenCalledWith("/finance/expense-categories/", {
      name: "پذیرایی",
    });
    expect(created.name).toBe("پذیرایی");
  });
});
