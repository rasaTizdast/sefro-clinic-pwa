import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useToast } from "../../components/ui";
import { extractApiError } from "../../lib/api-error";
import { queryKeys } from "../../lib/query-keys";
import * as serviceItemsService from "../../services/serviceItems";

/** Consumables attached to one service. */
export function useServiceItems(serviceId: number) {
  return useQuery({
    queryKey: queryKeys.serviceItems.list(serviceId),
    queryFn: () => serviceItemsService.listServiceItems(serviceId),
    enabled: serviceId > 0,
  });
}

export function useSyncServiceItems() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({
      serviceId,
      items,
    }: {
      serviceId: number;
      items: serviceItemsService.ServiceItemInput[];
    }) => serviceItemsService.syncServiceItems(serviceId, items),
    onSuccess: (_items, { serviceId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.serviceItems.list(serviceId) });
      // the service detail embeds the consumables plus the estimated cost/profit figures
      queryClient.invalidateQueries({ queryKey: queryKeys.services.detail(serviceId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.services.all });
      toast.success("مواد مصرفی خدمت ذخیره شد");
    },
    onError: (error) => {
      toast.error(extractApiError(error));
    },
  });
}
