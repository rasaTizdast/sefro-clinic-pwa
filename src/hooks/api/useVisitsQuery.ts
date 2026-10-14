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
      if (!options?.silent) toast.error("خطا در رزرو نوبت");
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
    onError: () => {
      toast.error("خطا در تأیید نوبت");
    },
  });
}

export function useCompleteVisit() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (id: number) => visitsService.completeVisit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.visits.all });
      toast.success("نوبت به اتمام رسید.");
    },
    onError: (error) => {
      // Surface the backend's own message (e.g. the staff-requirement 400)
      // instead of hiding it behind a generic failure toast.
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
    onError: () => {
      toast.error("خطا در ویرایش نوبت");
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
    onError: () => {
      toast.error("خطا در حذف نوبت");
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
    onError: () => {
      toast.error("خطا در لغو نوبت");
    },
  });
}
