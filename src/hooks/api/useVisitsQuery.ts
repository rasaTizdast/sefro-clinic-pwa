import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useToast } from "../../components/ui";
import { queryKeys } from "../../lib/query-keys";
import * as visitsService from "../../services/visits";

export function useVisitsList(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: queryKeys.visits.list(params),
    queryFn: () => visitsService.listVisits(params as never),
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

export function useCreateVisit() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (data: Record<string, unknown>) => visitsService.createVisit(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.visits.all });
      toast.success("نوبت با موفقیت ثبت شد.");
    },
    onError: () => {
      toast.error("خطا در ثبت نوبت");
    },
  });
}

export function useReserveVisit() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (data: Record<string, unknown>) => visitsService.reserveVisit(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.visits.all });
      toast.success("نوبت رزرو شد.");
    },
    onError: () => {
      toast.error("خطا در رزرو نوبت");
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
    onError: () => {
      toast.error("خطا در اتمام نوبت");
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
