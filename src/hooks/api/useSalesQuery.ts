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

/**
 * Visit ids that already have a paid sale. Key sits under the `sales` prefix so
 * `useCheckout`'s invalidation refreshes it right after a sale is posted.
 */
export function usePaidVisitIds() {
  return useQuery({
    queryKey: queryKeys.sales.paidVisitIds,
    queryFn: () => salesService.listPaidVisitIds(),
    staleTime: 60_000,
  });
}

export function useCheckout(options?: { silent?: boolean }) {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (payload: CheckoutPayload) => salesService.checkout(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sales.all });
      // `finance.dashboard` is a key *factory* — invalidate its prefix so every period matches.
      queryClient.invalidateQueries({ queryKey: ["finance", "dashboard"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.visits.all });
      // Checkout re-runs visit payout settlement server-side, so payout rows changed.
      queryClient.invalidateQueries({ queryKey: queryKeys.payouts.all });
      // Mid-flow callers (wizard payment, visit checkout) show a single final
      // toast themselves — suppress these per-sale toasts when silent.
      if (!options?.silent) toast.success("فروش ثبت شد");
    },
    onError: (error) => {
      if (!options?.silent) toast.error(extractApiError(error));
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
      // A refund regenerates the visit's payouts (cancelled rows are never revived).
      queryClient.invalidateQueries({ queryKey: queryKeys.payouts.all });
      toast.success("وجه بازگردانده شد");
    },
    onError: (error) => {
      toast.error(extractApiError(error));
    },
  });
}
