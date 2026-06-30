import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useToast } from "../../components/ui";
import { queryKeys } from "../../lib/query-keys";
import * as paymentsService from "../../services/payments";

export function usePaymentsList(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: queryKeys.payments.list(params),
    queryFn: () => paymentsService.listPayments(params as never),
    placeholderData: (prev) => prev,
  });
}

export function usePayment(id: number) {
  return useQuery({
    queryKey: queryKeys.payments.detail(id),
    queryFn: () => paymentsService.getPayment(id),
    enabled: id > 0,
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (data: Record<string, unknown>) => paymentsService.createPayment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
      toast.success("تراکنش با موفقیت ثبت شد.");
    },
  });
}

export function usePaymentsByService(dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: queryKeys.payments.byService(dateFrom, dateTo),
    queryFn: () => paymentsService.getPaymentsByService(dateFrom, dateTo),
    enabled: !!dateFrom || !!dateTo,
  });
}
