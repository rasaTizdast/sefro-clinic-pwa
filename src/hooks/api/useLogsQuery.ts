import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "../../lib/query-keys";
import * as logsService from "../../services/logs";

export function useLogsList(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: queryKeys.logs.list(params),
    queryFn: () => logsService.listLogs(params as never),
    placeholderData: (prev) => prev,
  });
}

export function useLog(id: number) {
  return useQuery({
    queryKey: queryKeys.logs.detail(id),
    queryFn: () => logsService.getLog(id),
    enabled: id > 0,
  });
}
