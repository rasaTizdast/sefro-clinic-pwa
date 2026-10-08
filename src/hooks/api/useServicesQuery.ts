import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useToast } from "../../components/ui";
import { extractApiError } from "../../lib/api-error";
import type { PaginationParams } from "../../lib/pagination";
import { queryKeys } from "../../lib/query-keys";
import * as servicesService from "../../services/services";

export function useServicesList(params?: PaginationParams) {
  return useQuery({
    queryKey: queryKeys.services.list(params),
    queryFn: () => servicesService.listServices(params),
    placeholderData: (prev) => prev,
  });
}

export function useAllServices() {
  return useQuery({
    queryKey: queryKeys.services.all,
    queryFn: () => servicesService.listAllServices(),
  });
}

export function useService(id: number) {
  return useQuery({
    queryKey: queryKeys.services.detail(id),
    queryFn: () => servicesService.getService(id),
    enabled: id > 0,
  });
}

export function useCreateService() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (data: Record<string, unknown>) => servicesService.createService(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.services.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.packages.all });
      toast.success("خدمت با موفقیت افزوده شد.");
    },
  });
}

export function useUpdateService() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      servicesService.updateService(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.services.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.packages.all });
      toast.success("خدمت به‌روزرسانی شد.");
    },
  });
}

export function useDeleteService() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (id: number) => servicesService.deleteService(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.services.all });
      // Package pickers also list services — refresh them so a deleted service disappears there too.
      queryClient.invalidateQueries({ queryKey: queryKeys.packages.all });
      toast.success("خدمت حذف شد.");
    },
    onError: (error) => {
      toast.error("خطا در حذف خدمت", extractApiError(error));
    },
  });
}
