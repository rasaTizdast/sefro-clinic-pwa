import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useToast } from "../../components/ui";
import { extractApiError } from "../../lib/api-error";
import { queryKeys } from "../../lib/query-keys";
import * as inventoryFinanceService from "../../services/inventoryFinance";
import type { ConsumptionSelection } from "../../types/finance";
import type { ConsumableSelection } from "../../types/wizard";

export function usePurchasesList(params?: inventoryFinanceService.PurchasesListParams) {
  return useQuery({
    queryKey: queryKeys.finance.purchases(params),
    queryFn: () => inventoryFinanceService.listPurchases(params),
  });
}

/**
 * The whole purchase ledger (all pages) for period-scoped cost totals. The API
 * declares no date filters and paginates at a fixed size, so filtering happens
 * client-side over complete totals.
 */
export function useAllPurchases() {
  return useQuery({
    queryKey: queryKeys.finance.allPurchases(),
    queryFn: () => inventoryFinanceService.listAllPurchases(),
  });
}

/**
 * Read-only usage log; the *whole* list (all pages) so summary totals and filters cover every
 * row — the API paginates at a fixed size and ignores date params, so the tab filters in the UI.
 */
export function useAllUsages() {
  return useQuery({
    queryKey: queryKeys.finance.usages(),
    queryFn: () => inventoryFinanceService.listAllUsages(),
  });
}

/** Cost snapshots of one product (0 disables the query until a product is picked). */
export function useCostHistory(
  productId: number,
  params?: inventoryFinanceService.CostHistoryParams
) {
  return useQuery({
    queryKey: queryKeys.finance.costHistory(productId),
    queryFn: () => inventoryFinanceService.listCostHistory(productId, params),
    enabled: productId > 0,
  });
}

export function useCreatePurchase() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (input: inventoryFinanceService.PurchaseInput) =>
      inventoryFinanceService.createPurchase(input),
    onSuccess: () => {
      // the literal prefixes: a key *factory* is not a valid QueryKey for invalidation
      queryClient.invalidateQueries({ queryKey: ["finance", "purchases"] });
      // recording a purchase rewrites the product's cost/count and appends cost history
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      queryClient.invalidateQueries({ queryKey: ["finance", "costHistory"] });
      toast.success("خرید ثبت شد");
    },
    onError: (error) => {
      toast.error(extractApiError(error));
    },
  });
}

/**
 * Edit a purchase. The backend reverses the old receipt and re-applies the new
 * one, so product stock and cost history move with the row.
 */
export function useUpdatePurchase() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: number;
      input: Omit<inventoryFinanceService.PurchaseInput, "productId">;
    }) => inventoryFinanceService.updatePurchase(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance", "purchases"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.allPurchases() });
      // a changed quantity/cost rewrites the product's count and cost history
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      queryClient.invalidateQueries({ queryKey: ["finance", "costHistory"] });
      toast.success("خرید ویرایش شد");
    },
    onError: (error) => {
      toast.error(extractApiError(error));
    },
  });
}

/**
 * Delete a purchase. The backend rolls back the stock it added; it answers 400
 * when that quantity has since been consumed, and that message is shown as-is.
 */
export function useDeletePurchase() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (id: number) => inventoryFinanceService.deletePurchase(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance", "purchases"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.allPurchases() });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      queryClient.invalidateQueries({ queryKey: ["finance", "costHistory"] });
      toast.success("خرید حذف شد");
    },
    onError: (error) => {
      toast.error(extractApiError(error));
    },
  });
}

/** Record the consumables used during a visit (checkout consumption step). */
export function useRecordConsumption() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({
      visitId,
      selection,
      includeMandatoryOnly,
      extraProducts,
    }: {
      visitId: number;
      selection: ConsumptionSelection;
      includeMandatoryOnly?: boolean;
      extraProducts?: ConsumableSelection[];
    }) =>
      inventoryFinanceService.recordConsumption(visitId, selection, {
        includeMandatoryOnly,
        extraProducts,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance", "usages"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
    onError: (error) => {
      toast.error(extractApiError(error));
    },
  });
}

/** How many consumption rows this visit already has — gates re-recording on checkout. */
export function useVisitConsumptionCount(visitId: number | null | undefined) {
  return useQuery({
    queryKey: queryKeys.finance.visitUsages(visitId as number),
    queryFn: () => inventoryFinanceService.countVisitConsumptions(visitId as number),
    enabled: visitId != null,
  });
}
