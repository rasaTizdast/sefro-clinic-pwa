import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useToast } from "../../components/ui";
import { queryKeys } from "../../lib/query-keys";
import * as workTimeService from "../../services/work-time";

export function useWorkTime() {
  return useQuery({
    queryKey: queryKeys.workTime.all,
    queryFn: workTimeService.getWorkTime,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSaveWorkTime() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id?: number; data: { startTime: string; endTime: string } }) => {
      if (id) {
        return workTimeService.updateWorkTime(id, data);
      }
      return workTimeService.createWorkTime(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workTime.all });
      toast.success("ساعات کاری ذخیره شد.");
    },
    onError: () => {
      toast.error("خطا در ذخیره ساعات کاری");
    },
  });
}
