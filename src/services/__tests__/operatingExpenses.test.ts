import { beforeEach, describe, expect, it, vi } from "vitest";

import * as apiClient from "../../lib/api-client";
import {
  createOperatingExpense,
  createOperatingExpenseCategory,
  deleteOperatingExpense,
  deleteOperatingExpenseCategory,
  getOperatingExpenseSummary,
  listOperatingExpenseCategories,
  listOperatingExpenses,
  toOperatingExpense,
  updateOperatingExpense,
  updateOperatingExpenseCategory,
} from "../operatingExpenses";

vi.mock("../../lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mock = vi.mocked(apiClient.apiClient);

const rawExpense = {
  id: 3,
  category: 7,
  categoryName: "اجاره",
  title: "اجاره مرداد",
  description: "",
  amountUsd: "100.00",
  exchangeRate: "100000.00",
  amountToman: "10000000",
  expenseDate: "2026-08-22",
  paymentMethod: "bank_transfer",
  vendor: "موجر",
  receipt: null,
  notes: "",
  createdBy: 1,
  createdByName: "مدیر",
  idempotencyKey: "uuid-1",
  createdAt: "2026-08-22T10:00:00Z",
  updatedAt: "2026-08-22T10:00:00Z",
};

const rawCategory = {
  id: 7,
  name: "اجاره",
  slug: "rent",
  description: "هزینه اجاره محل",
  isActive: true,
  sortOrder: 5,
  createdAt: "2026-08-01T00:00:00Z",
  updatedAt: "2026-08-01T00:00:00Z",
};

const rawSummary = {
  period: { start: "2026-08-01", end: "2026-08-31" },
  totalUsd: "150.00",
  totalToman: "15000000",
  count: 3,
  byCategory: [
    { categoryId: 7, categoryName: "اجاره", totalUsd: "100.00", totalToman: "10000000", count: 1 },
  ],
  byPaymentMethod: [{ paymentMethod: "bank_transfer", totalUsd: "100.00", count: 1 }],
};

describe("operatingExpenses mappers", () => {
  it("maps a raw expense with defaults for missing fields", () => {
    const expense = toOperatingExpense(rawExpense);
    expect(expense.id).toBe(3);
    expect(expense.categoryName).toBe("اجاره");
    expect(expense.amountUsd).toBe("100.00");
    expect(expense.paymentMethod).toBe("bank_transfer");

    const minimal = toOperatingExpense({ id: 1 } as never);
    expect(minimal.title).toBe("");
    expect(minimal.amountUsd).toBe("0.00");
    expect(minimal.receipt).toBeNull();
  });
});

describe("operatingExpenses service", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("listOperatingExpenses", () => {
    it("GETs the list endpoint with pagination and snake_case filters", async () => {
      mock.get.mockResolvedValue({
        data: { count: 1, next: null, previous: null, results: [rawExpense] },
      });

      const result = await listOperatingExpenses({
        page: 2,
        perPage: 10,
        search: "اجاره",
        category: 7,
        paymentMethod: "bank_transfer",
        createdBy: 1,
        dateFrom: "2026-08-01",
        dateTo: "2026-08-31",
        ordering: "-expense_date",
      });

      expect(mock.get).toHaveBeenCalledWith("/finance/operating-expenses/", {
        params: {
          page: 2,
          per_page: 10,
          search: "اجاره",
          category: 7,
          payment_method: "bank_transfer",
          created_by: 1,
          date_from: "2026-08-01",
          date_to: "2026-08-31",
          ordering: "-expense_date",
        },
      });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe(3);
      expect(result.total).toBe(1);
    });
  });

  describe("createOperatingExpense", () => {
    it("sends JSON when there is no receipt", async () => {
      mock.post.mockResolvedValue({ data: rawExpense });

      await createOperatingExpense({
        category: 7,
        title: "اجاره مرداد",
        amountUsd: "100.00",
        expenseDate: "2026-08-22",
        paymentMethod: "bank_transfer",
        idempotencyKey: "uuid-1",
      });

      const [, body] = mock.post.mock.calls[0];
      expect(body).not.toBeInstanceOf(FormData);
      expect(body).toMatchObject({ category: 7, amountUsd: "100.00" });
    });

    it("sends FormData with snake_case keys when a receipt exists", async () => {
      mock.post.mockResolvedValue({ data: rawExpense });

      const receipt = new File(["pdf"], "receipt.pdf", { type: "application/pdf" });
      await createOperatingExpense({
        category: 7,
        title: "اجاره مرداد",
        amountUsd: "100.00",
        expenseDate: "2026-08-22",
        paymentMethod: "bank_transfer",
        vendor: "موجر",
        description: "قسط اول",
        notes: "یادداشت",
        receipt,
        idempotencyKey: "uuid-1",
      });

      const [, body] = mock.post.mock.calls[0];
      expect(body).toBeInstanceOf(FormData);
      const form = body as FormData;
      // the api-client interceptor skips snake-casing for FormData, so keys are snake_case
      expect(form.get("amount_usd")).toBe("100.00");
      expect(form.get("expense_date")).toBe("2026-08-22");
      expect(form.get("payment_method")).toBe("bank_transfer");
      expect(form.get("idempotency_key")).toBe("uuid-1");
      expect(form.get("category")).toBe("7");
      expect(form.get("receipt")).toBe(receipt);
    });
  });

  describe("updateOperatingExpense", () => {
    it("PATCHes the detail endpoint", async () => {
      mock.patch.mockResolvedValue({ data: rawExpense });

      await updateOperatingExpense(3, { title: "عنوان جدید" });

      expect(mock.patch).toHaveBeenCalledWith("/finance/operating-expenses/3/", {
        title: "عنوان جدید",
      });
    });
  });

  describe("deleteOperatingExpense", () => {
    it("DELETEs the detail endpoint", async () => {
      mock.delete.mockResolvedValue({ data: undefined });

      await deleteOperatingExpense(3);

      expect(mock.delete).toHaveBeenCalledWith("/finance/operating-expenses/3/");
    });
  });

  describe("categories", () => {
    it("lists categories from the category endpoint", async () => {
      mock.get.mockResolvedValue({
        data: { count: 1, next: null, previous: null, results: [rawCategory] },
      });

      const result = await listOperatingExpenseCategories({
        page: 1,
        perPage: 50,
        search: "اجاره",
      });

      expect(mock.get).toHaveBeenCalledWith("/finance/operating-expense-categories/", {
        params: { page: 1, per_page: 50, search: "اجاره" },
      });
      expect(result.data[0].slug).toBe("rent");
    });

    it("creates a category", async () => {
      mock.post.mockResolvedValue({ data: rawCategory });

      await createOperatingExpenseCategory({ name: "اجاره", sortOrder: 5, isActive: true });

      expect(mock.post).toHaveBeenCalledWith("/finance/operating-expense-categories/", {
        name: "اجاره",
        sortOrder: 5,
        isActive: true,
      });
    });

    it("patches a category", async () => {
      mock.patch.mockResolvedValue({ data: { ...rawCategory, isActive: false } });

      const category = await updateOperatingExpenseCategory(7, { isActive: false });

      expect(mock.patch).toHaveBeenCalledWith("/finance/operating-expense-categories/7/", {
        isActive: false,
      });
      expect(category.isActive).toBe(false);
    });

    it("deletes a category", async () => {
      mock.delete.mockResolvedValue({ data: undefined });

      await deleteOperatingExpenseCategory(7);

      expect(mock.delete).toHaveBeenCalledWith("/finance/operating-expense-categories/7/");
    });
  });

  describe("getOperatingExpenseSummary", () => {
    it("GETs the summary endpoint with the period", async () => {
      mock.get.mockResolvedValue({ data: rawSummary });

      const summary = await getOperatingExpenseSummary({ period: "this_month" });

      expect(mock.get).toHaveBeenCalledWith("/finance/operating-expenses/summary/", {
        params: { period: "this_month" },
      });
      expect(summary.totalUsd).toBe("150.00");
      expect(summary.count).toBe(3);
      expect(summary.byCategory[0].categoryName).toBe("اجاره");
      expect(summary.byPaymentMethod[0].paymentMethod).toBe("bank_transfer");
    });
  });
});
