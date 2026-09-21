import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useToast } from "../../components/ui";
import { extractApiError } from "../../lib/api-error";
import { queryKeys } from "../../lib/query-keys";
import * as salesService from "../../services/sales";
import type { CheckoutPayload } from "../../types/finance";

export function useSalesList(params?: salesService.SalesListParams) {
  return useQuery({
    queryKey: queryKeys.sales.list(params),
    queryFn: () => salesService.listSales(params),
    placeholderData: (prev) => prev,
  });
}

export function useSale(id: number) {
  return useQuery({
    queryKey: queryKeys.sales.detail(id),
    queryFn: () => salesService.getSale(id),
    enabled: id > 0,
  });
}

export function useCheckout() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (payload: CheckoutPayload) => salesService.checkout(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sales.all });
      // `finance.dashboard` is a key *factory* — invalidate its prefix so every period matches.
      queryClient.invalidateQueries({ queryKey: ["finance", "dashboard"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.visits.all });
      toast.success("فروش ثبت شد");
    },
    onError: (error) => {
      toast.error(extractApiError(error));
    },
  });
}

export function useRefundSale() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: { refundAmountUsd?: string; reason?: string };
    }) => salesService.refundSale(id, payload),
    onSuccess: (_sale, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sales.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.sales.detail(id) });
      queryClient.invalidateQueries({ queryKey: ["finance", "dashboard"] });
      toast.success("وجه بازگردانده شد");
    },
    onError: (error) => {
      toast.error(extractApiError(error));
    },
  });
}
