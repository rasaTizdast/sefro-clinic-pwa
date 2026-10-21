import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useToast } from "../../components/ui";
import { extractApiError } from "../../lib/api-error";
import { queryKeys } from "../../lib/query-keys";
import * as visitsService from "../../services/visits";
import type { ReserveVisitPayload, UpdateVisitPayload } from "../../types/appointment";

export function useVisitsList(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: queryKeys.visits.list(params),
    queryFn: () => visitsService.listVisits(params as never),
    placeholderData: (prev) => prev,
  });
}

/** All visits matching the filters — walks every server page (`per_page` is ignored). */
export function useAllVisits(params?: visitsService.ListAllVisitsParams) {
  return useQuery({
    queryKey: queryKeys.visits.allPages(params as unknown as Record<string, unknown>),
    queryFn: () => visitsService.listAllVisits(params),
    placeholderData: (prev) => prev,
  });
}

export function useVisit(id: number) {
  return useQuery({
    queryKey: queryKeys.visits.detail(id),
    queryFn: () => visitsService.getVisit(id),
    enabled: id > 0,
  });
}

export function useReserveVisit(options?: { silent?: boolean }) {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (data: ReserveVisitPayload) => visitsService.reserveVisit(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.visits.all });
      if (!options?.silent) toast.success("نوبت رزرو شد.");
    },
    onError: (error) => {
      console.error("[useReserveVisit] Error reserving visit:", error);
      // The backend's own reason — a closed month (409) or a compensable visit
      // booked without staff (400) — reads better than a generic failure.
      if (!options?.silent) toast.error(extractApiError(error));
    },
  });
}

export function useConfirmVisit() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (id: number) => visitsService.confirmVisit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.visits.all });
      toast.success("نوبت تأیید شد.");
    },
    onError: (error) => {
      toast.error(extractApiError(error));
    },
  });
}

/**
 * Complete a visit. `silent` skips the success toast — callers that complete
 * right after a checkout already hear «تسویه با موفقیت ثبت شد». Failures
 * (e.g. consumption not recorded) always surface: a silent complete still has
 * to say why the visit stayed open.
 */
export function useCompleteVisit(options?: { silent?: boolean }) {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (id: number) => visitsService.completeVisit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.visits.all });
      if (!options?.silent) toast.success("نوبت به اتمام رسید.");
    },
    onError: (error) => {
      // Surface the backend's own message (e.g. the staff-requirement or the
      // missing-consumption 400) instead of hiding it behind a generic failure.
      toast.error(extractApiError(error));
    },
  });
}

export function useUpdateVisit() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateVisitPayload }) =>
      visitsService.updateVisit(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.visits.all });
      toast.success("نوبت ویرایش شد.");
    },
    onError: (error) => {
      // Reassigning the operator of a visit that already carries a payout, or
      // writing into a closed month, both come back as the backend's own message.
      toast.error(extractApiError(error));
    },
  });
}

export function useDeleteVisit() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (id: number) => visitsService.deleteVisit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.visits.all });
      toast.success("نوبت حذف شد.");
    },
    onError: (error) => {
      toast.error(extractApiError(error));
    },
  });
}

export function useCancelVisit() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (id: number) => visitsService.cancelVisit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.visits.all });
      toast.success("نوبت لغو شد.");
    },
    onError: (error) => {
      toast.error(extractApiError(error));
    },
  });
}
