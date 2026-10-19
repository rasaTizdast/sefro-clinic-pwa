import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { queryKeys } from "../../lib/query-keys";
import * as authService from "../../services/auth";
import { usePermissions } from "../usePermissions";
import { useProfitByStaff } from "./useFinanceReportsQuery";

/** Who a visit's operator can be — the visit serializer takes any active ClinicUser id. */
export interface VisitStaffOption {
  id: number;
  label: string;
}

/**
 * The visit serializer accepts any active `ClinicUser` id as `staff`, but there
 * is no staff-list endpoint open to every role. The choices here are merged from
 * what the app can already read:
 *
 * - the per-staff profit report for the current Shamsi year — any authenticated
 *   user can read it, and it covers everyone who has run a completed visit;
 * - the employee directory — admins only, and it also covers people who have not
 *   run a visit yet. It returns usernames only, so it only fills in gaps.
 */
function useVisitStaffOptions(): VisitStaffOption[] {
  const { canManageUsers } = usePermissions();
  const { data: profitRows } = useProfitByStaff({ period: "this_year" });
  const { data: employees } = useQuery({
    queryKey: queryKeys.auth.employees,
    queryFn: authService.listEmployees,
    retry: false,
    enabled: canManageUsers,
  });

  return useMemo(() => {
    const options = new Map<number, VisitStaffOption>();

    for (const row of profitRows ?? []) {
      const id = row.staffId;
      if (id == null) continue;
      const label = (row.staffName ?? "").trim() || `پرسنل ${id}`;
      if (!options.has(id)) options.set(id, { id, label });
    }

    if (canManageUsers) {
      for (const employee of employees ?? []) {
        const id = employee.id;
        if (id == null || options.has(id)) continue;
        const label = (employee.username ?? "").trim() || `پرسنل ${id}`;
        options.set(id, { id, label });
      }
    }

    return [...options.values()].sort((a, b) => a.label.localeCompare(b.label, "fa"));
  }, [canManageUsers, employees, profitRows]);
}

export { useVisitStaffOptions };
