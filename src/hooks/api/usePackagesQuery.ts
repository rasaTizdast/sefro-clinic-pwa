import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useToast } from "../../components/ui";
import { extractApiError } from "../../lib/api-error";
import type { PaginationParams } from "../../lib/pagination";
import { queryKeys } from "../../lib/query-keys";
import * as packagesService from "../../services/packages";

export function usePackagesList(params?: PaginationParams) {
  return useQuery({
    queryKey: queryKeys.packages.list(params),
    queryFn: () => packagesService.listPackages(params),
    placeholderData: (prev) => prev,
  });
}

export function usePackage(id: number) {
  return useQuery({
    queryKey: queryKeys.packages.detail(id),
    queryFn: () => packagesService.getPackage(id),
    enabled: id > 0,
  });
}

/** Create (no id) or update a package — the nested services/items are synced by the service. */
export function useSavePackage() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (input: packagesService.PackageInput) => packagesService.savePackage(input),
    onSuccess: (_pkg, input) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.packages.all });
      if (input.id)
        queryClient.invalidateQueries({ queryKey: queryKeys.packages.detail(input.id) });
      toast.success("پکیج ذخیره شد");
    },
    onError: (error) => {
      toast.error(extractApiError(error));
    },
  });
}

export function useDeletePackage() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (id: number) => packagesService.deletePackage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.packages.all });
      toast.success("پکیج حذف شد");
    },
    onError: (error) => {
      toast.error(extractApiError(error));
    },
  });
}
