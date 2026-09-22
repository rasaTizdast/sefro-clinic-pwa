import { endpoints } from "../config/api";
import { apiClient } from "../lib/api-client";
import { jalaliToGregorianISO } from "../lib/date";
import type { PaginationParams } from "../lib/pagination";
import { toPaginatedResponse } from "../lib/pagination";
import type { PaginatedResponse } from "../types/api";
import type {
  CreateOperatingExpenseCategoryPayload,
  CreateOperatingExpensePayload,
  OperatingExpense,
  OperatingExpenseCategory,
  OperatingExpenseListParams,
  OperatingExpensePaymentMethod,
  OperatingExpenseSummary,
  OperatingExpenseSummaryQuery,
  UpdateOperatingExpenseCategoryPayload,
  UpdateOperatingExpensePayload,
} from "../types/finance";

const DEFAULT_PER_PAGE = 20;

/**
 * Wire shapes (already camelCased by the api-client response interceptor).
 * Money stays a string to avoid float precision loss.
 */
type RawOperatingExpense = Record<string, unknown> & {
  id: number;
};

type RawOperatingExpenseCategory = Record<string, unknown> & {
  id: number;
};

type RawOperatingExpenseSummary = Record<string, unknown>;

export const toOperatingExpense = (raw: RawOperatingExpense): OperatingExpense => ({
  id: raw.id,
  category: (raw.category as number) ?? 0,
  categoryName: (raw.categoryName as string | null) ?? null,
  title: (raw.title as string) ?? "",
  description: (raw.description as string) ?? "",
  amountUsd: (raw.amountUsd as string) ?? "0.00",
  exchangeRate: (raw.exchangeRate as string | null) ?? null,
  amountToman: (raw.amountToman as string) ?? "0",
  expenseDate: (raw.expenseDate as string) ?? "",
  paymentMethod: (raw.paymentMethod as OperatingExpensePaymentMethod) ?? "cash",
  vendor: (raw.vendor as string) ?? "",
  receipt: (raw.receipt as string | null) ?? null,
  notes: (raw.notes as string) ?? "",
  createdBy: (raw.createdBy as number | null) ?? null,
  createdByName: (raw.createdByName as string | null) ?? null,
  idempotencyKey: (raw.idempotencyKey as string | null) ?? null,
  createdAt: (raw.createdAt as string) ?? "",
  updatedAt: (raw.updatedAt as string) ?? "",
});

export const toOperatingExpenseCategory = (
  raw: RawOperatingExpenseCategory
): OperatingExpenseCategory => ({
  id: raw.id,
  name: (raw.name as string) ?? "",
  slug: (raw.slug as string) ?? "",
  description: (raw.description as string) ?? "",
  isActive: (raw.isActive as boolean) ?? true,
  sortOrder: (raw.sortOrder as number) ?? 0,
  createdAt: (raw.createdAt as string) ?? "",
  updatedAt: (raw.updatedAt as string) ?? "",
});

export const toOperatingExpenseSummary = (
  raw: RawOperatingExpenseSummary
): OperatingExpenseSummary => ({
  period: {
    start: ((raw.period as { start?: string })?.start as string) ?? "",
    end: ((raw.period as { end?: string })?.end as string) ?? "",
  },
  totalUsd: (raw.totalUsd as string) ?? "0.00",
  totalToman: (raw.totalToman as string) ?? "0",
  count: (raw.count as number) ?? 0,
  byCategory: (raw.byCategory as OperatingExpenseSummary["byCategory"]) ?? [],
  byPaymentMethod: (raw.byPaymentMethod as OperatingExpenseSummary["byPaymentMethod"]) ?? [],
});

export const listOperatingExpenses = async (
  params?: OperatingExpenseListParams
): Promise<PaginatedResponse<OperatingExpense>> => {
  const page = params?.page ?? 1;
  const perPage = params?.perPage ?? DEFAULT_PER_PAGE;
  const query: Record<string, string | number> = { page, per_page: perPage };
  if (params?.search) query.search = params.search;
  if (params?.category !== undefined) query.category = params.category;
  if (params?.paymentMethod) query.payment_method = params.paymentMethod;
  if (params?.createdBy !== undefined) query.created_by = params.createdBy;
  if (params?.dateFrom) query.date_from = params.dateFrom;
  if (params?.dateTo) query.date_to = params.dateTo;
  if (params?.ordering) query.ordering = params.ordering;

  const { data } = await apiClient.get(endpoints.finance.operatingExpenses, { params: query });
  const paginated = toPaginatedResponse<RawOperatingExpense>(data as never, page, perPage);
  return {
    ...paginated,
    data: paginated.data.map(toOperatingExpense),
  };
};

/**
 * Receipt upload uses multipart/form-data. The api-client request interceptor
 * skips snake-casing for FormData, so snake_case keys are used explicitly.
 */
const toFormData = (payload: CreateOperatingExpensePayload): FormData => {
  const form = new FormData();
  form.append("category", String(payload.category));
  form.append("title", payload.title);
  form.append("amount_usd", payload.amountUsd);
  form.append("expense_date", payload.expenseDate);
  form.append("payment_method", payload.paymentMethod);
  form.append("idempotency_key", payload.idempotencyKey);
  if (payload.description) form.append("description", payload.description);
  if (payload.vendor) form.append("vendor", payload.vendor);
  if (payload.notes) form.append("notes", payload.notes);
  if (payload.receipt) form.append("receipt", payload.receipt);
  return form;
};

export const createOperatingExpense = async (
  payload: CreateOperatingExpensePayload
): Promise<OperatingExpense> => {
  if (payload.receipt instanceof File) {
    const { data } = await apiClient.post(endpoints.finance.operatingExpenses, toFormData(payload));
    return toOperatingExpense(data as RawOperatingExpense);
  }
  const { data } = await apiClient.post(endpoints.finance.operatingExpenses, payload);
  return toOperatingExpense(data as RawOperatingExpense);
};

export const updateOperatingExpense = async (
  id: number,
  payload: UpdateOperatingExpensePayload
): Promise<OperatingExpense> => {
  if (payload.receipt instanceof File) {
    const form = toFormData(payload as CreateOperatingExpensePayload);
    form.delete("idempotency_key");
    const { data } = await apiClient.patch(endpoints.finance.operatingExpenseDetail(id), form);
    return toOperatingExpense(data as RawOperatingExpense);
  }
  const { data } = await apiClient.patch(endpoints.finance.operatingExpenseDetail(id), payload);
  return toOperatingExpense(data as RawOperatingExpense);
};

export const deleteOperatingExpense = async (id: number): Promise<void> => {
  await apiClient.delete(endpoints.finance.operatingExpenseDetail(id));
};

type CategoryListParams = PaginationParams & { search?: string; ordering?: string };

export const listOperatingExpenseCategories = async (
  params?: CategoryListParams
): Promise<PaginatedResponse<OperatingExpenseCategory>> => {
  const page = params?.page ?? 1;
  const perPage = params?.perPage ?? DEFAULT_PER_PAGE;
  const query: Record<string, string | number> = { page, per_page: perPage };
  if (params?.search) query.search = params.search;
  if (params?.ordering) query.ordering = params.ordering;

  const { data } = await apiClient.get(endpoints.finance.operatingExpenseCategories, {
    params: query,
  });
  const paginated = toPaginatedResponse<RawOperatingExpenseCategory>(data as never, page, perPage);
  return {
    ...paginated,
    data: paginated.data.map(toOperatingExpenseCategory),
  };
};

export const createOperatingExpenseCategory = async (
  payload: CreateOperatingExpenseCategoryPayload
): Promise<OperatingExpenseCategory> => {
  const { data } = await apiClient.post(endpoints.finance.operatingExpenseCategories, payload);
  return toOperatingExpenseCategory(data as RawOperatingExpenseCategory);
};

export const updateOperatingExpenseCategory = async (
  id: number,
  payload: UpdateOperatingExpenseCategoryPayload
): Promise<OperatingExpenseCategory> => {
  const { data } = await apiClient.patch(
    endpoints.finance.operatingExpenseCategoryDetail(id),
    payload
  );
  return toOperatingExpenseCategory(data as RawOperatingExpenseCategory);
};

export const deleteOperatingExpenseCategory = async (id: number): Promise<void> => {
  await apiClient.delete(endpoints.finance.operatingExpenseCategoryDetail(id));
};

export const getOperatingExpenseSummary = async (
  query?: OperatingExpenseSummaryQuery
): Promise<OperatingExpenseSummary> => {
  const params: Record<string, string> = {};
  if (query?.period) {
    params.period = query.period;
  } else {
    if (query?.startDateJalali) params.start_date = jalaliToGregorianISO(query.startDateJalali);
    if (query?.endDateJalali) params.end_date = jalaliToGregorianISO(query.endDateJalali);
  }
  const { data } = await apiClient.get(endpoints.finance.operatingExpenseSummary, { params });
  return toOperatingExpenseSummary(data as RawOperatingExpenseSummary);
};
