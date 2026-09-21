import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useToast } from "../../components/ui";
import { extractApiError } from "../../lib/api-error";
import { queryKeys } from "../../lib/query-keys";
import * as serviceCategoriesService from "../../services/serviceCategories";

/** Full category list (every DRF page is followed) for filters and selects. */
export function useServiceCategories() {
  return useQuery({
    queryKey: queryKeys.serviceCategories.list,
    queryFn: () => serviceCategoriesService.listCategories(),
  });
}

export function useSaveServiceCategory() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id?: number;
      payload: serviceCategoriesService.ServiceCategoryPayload;
    }) =>
      id
        ? serviceCategoriesService.updateCategory(id, payload)
        : serviceCategoriesService.createCategory(payload),
    onSuccess: (_category, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.serviceCategories.all });
      toast.success(id ? "دسته‌بندی خدمت ویرایش شد" : "دسته‌بندی خدمت ایجاد شد");
    },
    onError: (error) => {
      toast.error(extractApiError(error));
    },
  });
}

export function useDeleteServiceCategory() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (id: number) => serviceCategoriesService.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.serviceCategories.all });
      toast.success("دسته‌بندی خدمت حذف شد");
    },
    onError: (error) => {
      // a category that still has services answers 400 — show the backend message
      toast.error(extractApiError(error));
    },
  });
}
