import { endpoints } from "../config/api";
import { apiClient } from "../lib/api-client";
import { type PaginationParams, toPaginatedResponse, toQueryParams } from "../lib/pagination";
import type { PaginatedResponse } from "../types/api";
import type { Expense, ExpenseCategory, ExpenseStatus } from "../types/finance";
import { fetchAllPages } from "./fetch-all-pages";

const DEFAULT_PER_PAGE = 20;

type RawExpenseCategory = Record<string, unknown> & {
  id: number;
  name?: string;
  isActive?: boolean;
};

type RawExpense = Record<string, unknown> & {
  id: number;
  createdBy?: number | null;
  createdByName?: string | null;
  category?: number;
  categoryName?: string | null;
  amountUsd?: string;
  exchangeRateSnapshot?: string | null;
  amountToman?: string;
  description?: string;
  vendor?: string;
  expenseDate?: string;
  status?: ExpenseStatus;
  approvedBy?: number | null;
  approvedByName?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export const toExpenseCategory = (raw: RawExpenseCategory): ExpenseCategory => ({
  id: raw.id,
  name: raw.name ?? "",
  isActive: raw.isActive ?? true,
});

export const toExpense = (raw: RawExpense): Expense => ({
  id: raw.id,
  createdBy: raw.createdBy ?? null,
  createdByName: raw.createdByName ?? null,
  category: raw.category ?? 0,
  categoryName: raw.categoryName ?? null,
  amountUsd: raw.amountUsd ?? "0.00",
  exchangeRateSnapshot: raw.exchangeRateSnapshot ?? null,
  amountToman: raw.amountToman ?? "0",
  description: raw.description ?? "",
  vendor: raw.vendor ?? "",
  expenseDate: raw.expenseDate ?? "",
  status: raw.status ?? "draft",
  approvedBy: raw.approvedBy ?? null,
  approvedByName: raw.approvedByName ?? null,
  createdAt: raw.createdAt ?? "",
  updatedAt: raw.updatedAt ?? "",
});

export type ExpensesListParams = PaginationParams & {
  status?: ExpenseStatus;
  category?: number;
  search?: string;
  ordering?: string;
};

export interface ExpenseInput {
  category: number;
  /** USD amount — the backend converts it at the live rate and snapshots the result. */
  amountUsd: string;
  /** Gregorian `YYYY-MM-DD`; the caller converts its Jalali input. */
  expenseDate: string;
  description?: string;
  vendor?: string;
}

/**
 * Staff expense claims. The backend scopes non-admins to their own rows and
 * rejects anyone approving their own claim, so the UI keeps submit separate from
 * the admin approve/reject/pay actions.
 */
export const listExpenses = async (
  params?: ExpensesListParams
): Promise<PaginatedResponse<Expense>> => {
  const page = params?.page ?? 1;
  const perPage = params?.perPage ?? DEFAULT_PER_PAGE;
  const query: Record<string, string | number> = toQueryParams({ ...params, page, perPage });
  if (params?.status) query.status = params.status;
  if (params?.category !== undefined) query.category = params.category;
  if (params?.search) query.search = params.search;
  if (params?.ordering) query.ordering = params.ordering;

  const { data } = await apiClient.get(endpoints.finance.expenses, { params: query });
  const paginated = toPaginatedResponse<RawExpense>(data as never, page, perPage);
  return { ...paginated, data: paginated.data.map(toExpense) };
};

/** Every claim matching the filters — walks all server pages (`per_page` is ignored). */
export const listAllExpenses = async (
  params?: Omit<ExpensesListParams, "page" | "perPage">
): Promise<Expense[]> => {
  const rows = await fetchAllPages<RawExpense>(endpoints.finance.expenses, {
    ...(params?.status ? { status: params.status } : {}),
    ...(params?.category !== undefined ? { category: params.category } : {}),
    ...(params?.search ? { search: params.search } : {}),
    ...(params?.ordering ? { ordering: params.ordering } : {}),
  });
  return rows.map(toExpense);
};

export const createExpense = async (input: ExpenseInput): Promise<Expense> => {
  const { data } = await apiClient.post(endpoints.finance.expenses, {
    category: input.category,
    amount_usd: input.amountUsd,
    expense_date: input.expenseDate,
    description: input.description ?? "",
    vendor: input.vendor ?? "",
  });
  return toExpense(data as RawExpense);
};

/** `draft → submitted`. The employee-owned step. */
export const submitExpense = async (id: number): Promise<Expense> => {
  const { data } = await apiClient.post(endpoints.finance.expenseAction(id, "submit"), {});
  return toExpense(data as RawExpense);
};

/** `submitted → approved`. Admin only, and never on your own claim. */
export const approveExpense = async (id: number): Promise<Expense> => {
  const { data } = await apiClient.post(endpoints.finance.expenseAction(id, "approve"), {});
  return toExpense(data as RawExpense);
};

/** `submitted → rejected`. Admin only. */
export const rejectExpense = async (id: number): Promise<Expense> => {
  const { data } = await apiClient.post(endpoints.finance.expenseAction(id, "reject"), {});
  return toExpense(data as RawExpense);
};

/** `approved → paid`. Admin only; from here the claim counts as settled. */
export const payExpense = async (id: number): Promise<Expense> => {
  const { data } = await apiClient.post(endpoints.finance.expenseAction(id, "pay"), {});
  return toExpense(data as RawExpense);
};

export const listAllExpenseCategories = async (): Promise<ExpenseCategory[]> => {
  const rows = await fetchAllPages<RawExpenseCategory>(endpoints.finance.expenseCategories);
  return rows.map(toExpenseCategory);
};

export const createExpenseCategory = async (name: string): Promise<ExpenseCategory> => {
  const { data } = await apiClient.post(endpoints.finance.expenseCategories, { name });
  return toExpenseCategory(data as RawExpenseCategory);
};

export const updateExpenseCategory = async (
  id: number,
  payload: Partial<Pick<ExpenseCategory, "name" | "isActive">>
): Promise<ExpenseCategory> => {
  const { data } = await apiClient.patch(endpoints.finance.expenseCategoryDetail(id), payload);
  return toExpenseCategory(data as RawExpenseCategory);
};
