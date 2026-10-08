import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useToast } from "../../components/ui";
import { extractApiError } from "../../lib/api-error";
import { queryKeys } from "../../lib/query-keys";
import * as expensesService from "../../services/expenses";

/** Claim list — fetched page by page, exactly like the operating-expense tab. */
export function useExpensesList(params?: expensesService.ExpensesListParams) {
  return useQuery({
    queryKey: queryKeys.finance.expenses.list(params as unknown as Record<string, unknown>),
    queryFn: () => expensesService.listExpenses(params),
    placeholderData: (prev) => prev,
  });
}

/** Every claim matching the filters — for the period totals above the table. */
export function useAllExpenses(
  params?: Omit<expensesService.ExpensesListParams, "page" | "perPage">
) {
  return useQuery({
    queryKey: queryKeys.finance.expenses.allPages(
      params as unknown as Record<string, unknown> | undefined
    ),
    queryFn: () => expensesService.listAllExpenses(params),
  });
}

export function useAllExpenseCategories() {
  return useQuery({
    queryKey: queryKeys.finance.expenses.categories,
    queryFn: () => expensesService.listAllExpenseCategories(),
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (input: expensesService.ExpenseInput) => expensesService.createExpense(input),
    onSuccess: () => {
      invalidateExpenses(queryClient);
      toast.success("مطالبه ثبت شد", "برای بررسی، آن را ارسال کنید");
    },
    onError: (error) => {
      toast.error(extractApiError(error));
    },
  });
}

type ClaimAction = "submit" | "approve" | "reject" | "pay";

const actionToasts: Record<ClaimAction, string> = {
  submit: "مطالبه ارسال شد",
  approve: "مطالبه تأیید شد",
  reject: "مطالبه رد شد",
  pay: "پرداخت مطالبه ثبت شد",
};

/**
 * One mutation for the whole lifecycle. Every transition changes the claim's
 * financial effect, so all of them refresh the summary cards behind analytics too.
 */
export function useExpenseAction() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ id, action }: { id: number; action: ClaimAction }) => {
      switch (action) {
        case "submit":
          return expensesService.submitExpense(id);
        case "approve":
          return expensesService.approveExpense(id);
        case "reject":
          return expensesService.rejectExpense(id);
        case "pay":
          return expensesService.payExpense(id);
      }
    },
    onSuccess: (_expense, variables) => {
      invalidateExpenses(queryClient);
      toast.success(actionToasts[variables.action]);
    },
    onError: (error) => {
      toast.error(extractApiError(error));
    },
  });
}

export function useCreateExpenseCategory() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (name: string) => expensesService.createExpenseCategory(name),
    onSuccess: (_category, name) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.expenses.categories });
      toast.success("دسته‌بندی ثبت شد", name);
    },
    onError: (error) => {
      toast.error(extractApiError(error));
    },
  });
}

function invalidateExpenses(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: queryKeys.finance.expenses.all });
  // Claims feed the financial summary's expense line and net profit.
  queryClient.invalidateQueries({ queryKey: ["finance", "financialSummary"] });
}
