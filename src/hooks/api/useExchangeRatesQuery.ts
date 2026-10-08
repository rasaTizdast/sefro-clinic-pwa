import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useToast } from "../../components/ui";
import { extractApiError } from "../../lib/api-error";
import { queryKeys } from "../../lib/query-keys";
import * as exchangeRatesService from "../../services/exchangeRates";

/** Refetch the live rate every 5 minutes so dollar-linked prices stay current. */
const RATE_REFETCH_MS = 5 * 60 * 1000; // 5 minutes

export function useCurrentRate() {
  return useQuery({
    queryKey: queryKeys.finance.currentRate,
    queryFn: async () => {
      try {
        return await exchangeRatesService.getCurrentRate();
      } catch (primaryError) {
        // Primary source down → keep prices live off the backup provider instead of
        // failing the whole page (the raw error still wins if the backup is down too).
        try {
          return await exchangeRatesService.getBackupRate();
        } catch {
          throw primaryError;
        }
      }
    },
    staleTime: RATE_REFETCH_MS,
    refetchInterval: RATE_REFETCH_MS,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
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
    mutationFn: (payload: { rate: string; source?: string; effective_at: string }) =>
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
