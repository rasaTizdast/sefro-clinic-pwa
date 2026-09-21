import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useToast } from "../../components/ui";
import { extractApiError } from "../../lib/api-error";
import { queryKeys } from "../../lib/query-keys";
import * as inventoryFinanceService from "../../services/inventoryFinance";
import type { ConsumptionSelection } from "../../types/finance";

export function usePurchasesList(params?: inventoryFinanceService.PurchasesListParams) {
  return useQuery({
    queryKey: queryKeys.finance.purchases(params),
    queryFn: () => inventoryFinanceService.listPurchases(params),
    placeholderData: (prev) => prev,
  });
}

/** Read-only usage log; filtered by visit / service / product / package sale. */
export function useUsagesList(params?: inventoryFinanceService.UsagesListParams) {
  return useQuery({
    queryKey: queryKeys.finance.usages(params),
    queryFn: () => inventoryFinanceService.listUsages(params),
    placeholderData: (prev) => prev,
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
    placeholderData: (prev) => prev,
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

/** Record the consumables used during a visit (checkout consumption step). */
export function useRecordConsumption() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ visitId, selection }: { visitId: number; selection: ConsumptionSelection }) =>
      inventoryFinanceService.recordConsumption(visitId, selection),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance", "usages"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
    onError: (error) => {
      toast.error(extractApiError(error));
    },
  });
}
