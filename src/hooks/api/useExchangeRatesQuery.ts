import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useToast } from "../../components/ui";
import { extractApiError } from "../../lib/api-error";
import { queryKeys } from "../../lib/query-keys";
import * as exchangeRatesService from "../../services/exchangeRates";

export function useCurrentRate() {
  return useQuery({
    queryKey: queryKeys.finance.currentRate,
    queryFn: () => exchangeRatesService.getCurrentRate(),
    staleTime: 60_000,
    retry: 1,
  });
}

export function useExchangeRates(params?: { page?: number }) {
  return useQuery({
    // params are part of the key so a page change actually refetches; invalidating the
    // `finance.exchangeRates` prefix still invalidates every page.
    queryKey: [...queryKeys.finance.exchangeRates, params ?? null],
    queryFn: () => exchangeRatesService.listExchangeRates(params),
    placeholderData: (prev) => prev,
  });
}

export function useCreateExchangeRate() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (payload: { rate: string; source?: string }) =>
      exchangeRatesService.createExchangeRate(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.exchangeRates });
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.currentRate });
      toast.success("نرخ ارز ثبت شد");
    },
    onError: (error) => {
      toast.error(extractApiError(error));
    },
  });
}
