import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useToast } from "../../components/ui";
import { extractApiError } from "../../lib/api-error";
import type { PaginationParams } from "../../lib/pagination";
import { queryKeys } from "../../lib/query-keys";
import * as service from "../../services/operatingExpenses";
import type {
  CreateOperatingExpenseCategoryPayload,
  CreateOperatingExpensePayload,
  OperatingExpenseListParams,
  OperatingExpenseSummaryQuery,
  UpdateOperatingExpenseCategoryPayload,
  UpdateOperatingExpensePayload,
} from "../../types/finance";

/** Operating expense list hooks. Expenses are fetched page-by-page. */
export function useOperatingExpensesList(params?: OperatingExpenseListParams) {
  return useQuery({
    queryKey: queryKeys.finance.operatingExpenses.list(
      params as unknown as Record<string, unknown>
    ),
    queryFn: () => service.listOperatingExpenses(params),
  });
}

export function useOperatingExpenseCategories(params?: PaginationParams & { search?: string }) {
  return useQuery({
    queryKey: queryKeys.finance.operatingExpenses.categories(
      params as unknown as Record<string, unknown>
    ),
    queryFn: () => service.listOperatingExpenseCategories({ ...params, ordering: "sort_order" }),
  });
}

export function useOperatingExpenseSummary(query?: OperatingExpenseSummaryQuery) {
  return useQuery({
    queryKey: queryKeys.finance.operatingExpenses.summary(
      query as unknown as Record<string, unknown>
    ),
    queryFn: () => service.getOperatingExpenseSummary(query),
  });
}

export function useCreateOperatingExpense() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (payload: CreateOperatingExpensePayload) => service.createOperatingExpense(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.operatingExpenses.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.operatingExpenses.summary() });
      toast.success("هزینه جاری ثبت شد");
    },
    onError: (error) => toast.error(extractApiError(error)),
  });
}

export function useUpdateOperatingExpense() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateOperatingExpensePayload }) =>
      service.updateOperatingExpense(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.operatingExpenses.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.operatingExpenses.summary() });
      toast.success("هزینه جاری ویرایش شد");
    },
    onError: (error) => toast.error(extractApiError(error)),
  });
}

export function useDeleteOperatingExpense() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (id: number) => service.deleteOperatingExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.operatingExpenses.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.operatingExpenses.summary() });
      toast.success("هزینه جاری حذف شد");
    },
    onError: (error) => toast.error(extractApiError(error)),
  });
}

export function useCreateOperatingExpenseCategory() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (payload: CreateOperatingExpenseCategoryPayload) =>
      service.createOperatingExpenseCategory(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.operatingExpenses.categories() });
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.operatingExpenses.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.operatingExpenses.summary() });
      toast.success("دسته‌بندی ثبت شد");
    },
    onError: (error) => toast.error(extractApiError(error)),
  });
}

export function useUpdateOperatingExpenseCategory() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateOperatingExpenseCategoryPayload }) =>
      service.updateOperatingExpenseCategory(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.operatingExpenses.categories() });
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.operatingExpenses.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.operatingExpenses.summary() });
      toast.success("دسته‌بندی ویرایش شد");
    },
    onError: (error) => toast.error(extractApiError(error)),
  });
}

export function useDeleteOperatingExpenseCategory() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (id: number) => service.deleteOperatingExpenseCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.operatingExpenses.categories() });
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.operatingExpenses.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.operatingExpenses.summary() });
      toast.success("دسته‌بندی حذف شد");
    },
    onError: (error) =>
      // a category with existing expenses answers 400 — show the backend message
      toast.error(extractApiError(error)),
  });
}
