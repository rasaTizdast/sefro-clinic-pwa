import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useToast } from "../../components/ui";
import type { PaginationParams } from "../../lib/pagination";
import { queryKeys } from "../../lib/query-keys";
import * as productsService from "../../services/products";

export function useProductsList(params?: PaginationParams) {
  return useQuery({
    queryKey: queryKeys.products.list(params),
    queryFn: () => productsService.listProducts(params),
    placeholderData: (prev) => prev,
  });
}

export function useProduct(id: number) {
  return useQuery({
    queryKey: queryKeys.products.detail(id),
    queryFn: () => productsService.getProduct(id),
    enabled: id > 0,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (data: Record<string, unknown>) => productsService.createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      toast.success("محصول با موفقیت افزوده شد.");
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      productsService.updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      toast.success("محصول به‌روزرسانی شد.");
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (id: number) => productsService.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      toast.success("محصول حذف شد.");
    },
    onError: () => {
      toast.error("خطا در حذف محصول");
    },
  });
}
