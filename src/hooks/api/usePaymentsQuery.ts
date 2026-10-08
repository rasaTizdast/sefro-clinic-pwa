import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "../../lib/query-keys";
import * as paymentsService from "../../services/payments";

export function useAllPayments() {
  return useQuery({
    queryKey: queryKeys.payments.all,
    queryFn: () => paymentsService.listAllPayments(),
  });
}
