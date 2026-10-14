import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { useToast } from "../../components/ui";
import { extractApiError } from "../../lib/api-error";
import { queryKeys } from "../../lib/query-keys";
import * as welcomePacksService from "../../services/welcomePacks";
import type { IssueWelcomePackInput, ReportPeriod } from "../../types/finance";

/**
 * Pack definitions change rarely and their reads are expensive (see
 * `WELCOME_PACK_TIMEOUT_MS`), so the list stays fresh for 5 minutes. Mutations
 * still invalidate it, so a create/edit/delete shows up immediately.
 */
const WELCOME_PACK_STALE_TIME_MS = 5 * 60 * 1000;

const ACTIVE_PACKS_PARAMS = { isActive: true } as const;

export function useWelcomePacksList(params?: welcomePacksService.WelcomePacksListParams) {
  return useQuery({
    queryKey: queryKeys.finance.welcomePacks.list(params),
    queryFn: () => welcomePacksService.listWelcomePacks(params),
  });
}

/** Every welcome pack matching the filters — walks every server page (`per_page` is ignored). */
export function useAllWelcomePacks(
  params?: Omit<welcomePacksService.WelcomePacksListParams, "page" | "perPage">
) {
  return useQuery({
    queryKey: queryKeys.finance.welcomePacks.allPages(params as unknown as Record<string, unknown>),
    queryFn: () => welcomePacksService.listAllWelcomePacks(params),
    staleTime: WELCOME_PACK_STALE_TIME_MS,
  });
}

/**
 * Warms the active-pack cache while a screen that will need it is still loading,
 * so opening the picker doesn't wait on a slow first fetch.
 */
export function usePrefetchWelcomePacks(): void {
  const queryClient = useQueryClient();
  useEffect(() => {
    void queryClient.prefetchQuery({
      queryKey: queryKeys.finance.welcomePacks.allPages({
        isActive: true,
      } as unknown as Record<string, unknown>),
      queryFn: () => welcomePacksService.listAllWelcomePacks(ACTIVE_PACKS_PARAMS),
      staleTime: WELCOME_PACK_STALE_TIME_MS,
    });
  }, [queryClient]);
}

export function useWelcomePack(id: number) {
  return useQuery({
    queryKey: queryKeys.finance.welcomePacks.detail(id),
    queryFn: () => welcomePacksService.getWelcomePack(id),
    enabled: id > 0,
  });
}

export function useWelcomePackUsages(params?: welcomePacksService.WelcomePackUsagesListParams) {
  return useQuery({
    queryKey: queryKeys.finance.welcomePacks.usages(params),
    queryFn: () => welcomePacksService.listWelcomePackUsages(params),
  });
}

/** Issued-pack count and cost for a period — read straight off the backend report. */
export function useWelcomePackReport(query: { period?: ReportPeriod }) {
  return useQuery({
    queryKey: queryKeys.finance.welcomePacks.report(query as unknown as Record<string, unknown>),
    queryFn: () => welcomePacksService.getWelcomePackReport(query),
  });
}

/**
 * Issue a pack to a customer (optionally bound to a visit).
 * This is the only write that creates a welcome-pack financial event.
 */
export function useIssueWelcomePack(options?: { silent?: boolean }) {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (input: IssueWelcomePackInput) => welcomePacksService.issueWelcomePack(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.welcomePacks.all });
      if (!options?.silent) toast.success("ولکام‌پک صادر شد");
    },
    onError: (error) => {
      if (!options?.silent) toast.error(extractApiError(error));
    },
  });
}

/** Create (no id) or update a welcome-pack definition with its items. */
export function useSaveWelcomePack() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (input: welcomePacksService.WelcomePackInput) =>
      welcomePacksService.saveWelcomePack(input),
    onSuccess: (_pack, input) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.welcomePacks.all });
      if (input.id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.finance.welcomePacks.detail(input.id),
        });
      }
      toast.success("ولکام‌پک ذخیره شد");
    },
    onError: (error) => {
      toast.error(extractApiError(error));
    },
  });
}

export function useDeleteWelcomePack() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (id: number) => welcomePacksService.deleteWelcomePack(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.welcomePacks.all });
      toast.success("ولکام‌پک حذف شد");
    },
    onError: (error) => {
      toast.error(extractApiError(error));
    },
  });
}
