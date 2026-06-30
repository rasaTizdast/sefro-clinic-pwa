import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useToast } from "../../components/ui";
import type { PaginationParams } from "../../lib/pagination";
import { queryKeys } from "../../lib/query-keys";
import * as customersService from "../../services/customers";
import type { PatientFormData } from "../../types/patient";

export function useCustomersList(params?: PaginationParams) {
  return useQuery({
    queryKey: queryKeys.customers.list(params),
    queryFn: () => customersService.listCustomers(params),
    placeholderData: (prev) => prev,
  });
}

export function useCustomer(id: number) {
  return useQuery({
    queryKey: queryKeys.customers.detail(id),
    queryFn: () => customersService.getCustomer(id),
    enabled: id > 0,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (data: PatientFormData) => customersService.createCustomer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      toast.success("بیمار با موفقیت افزوده شد.");
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<PatientFormData> }) =>
      customersService.updateCustomer(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      toast.success("اطلاعات بیمار به‌روزرسانی شد.");
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (id: number) => customersService.deleteCustomer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      toast.success("بیمار حذف شد.");
    },
    onError: () => {
      toast.error("خطا در حذف بیمار");
    },
  });
}
