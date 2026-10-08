import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useToast } from "../../components/ui";
import { extractApiError } from "../../lib/api-error";
import { queryKeys } from "../../lib/query-keys";
import * as payoutsService from "../../services/payouts";

export function usePayoutsList(params?: payoutsService.PayoutsListParams) {
  return useQuery({
    queryKey: queryKeys.payouts.list(params),
    queryFn: () => payoutsService.listPayouts(params),
    placeholderData: (prev) => prev,
  });
}

/** Every payout matching the filters, unpaginated — period filtering happens client-side. */
export function useAllPayouts(params?: Omit<payoutsService.PayoutsListParams, "page" | "perPage">) {
  return useQuery({
    queryKey: queryKeys.payouts.allPages(params as unknown as Record<string, unknown> | undefined),
    queryFn: () => payoutsService.listAllPayouts(params),
  });
}

/** Unpaginated aggregate for the selected period / staff / role. */
export function usePayoutSummary(params?: payoutsService.PayoutSummaryParams) {
  return useQuery({
    queryKey: queryKeys.payouts.summary(params),
    queryFn: () => payoutsService.listPayoutSummary(params),
  });
}

export function useCompensationRules(params?: payoutsService.CompensationRulesParams) {
  return useQuery({
    // params are part of the key so a role change refetches; invalidating the
    // `payouts.rules` prefix still invalidates every variant.
    queryKey: [...queryKeys.payouts.rules, params ?? null],
    queryFn: () => payoutsService.listCompensationRules(params),
    placeholderData: (prev) => prev,
  });
}

export function useUpsertCompensationRule() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id?: number;
      payload: payoutsService.CompensationRulePayload;
    }) => payoutsService.upsertCompensationRule(payload, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payouts.rules });
      toast.success("قانون تسویه ذخیره شد");
    },
    onError: (error) => {
      toast.error(extractApiError(error));
    },
  });
}
