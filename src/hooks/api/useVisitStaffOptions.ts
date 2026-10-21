import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { queryKeys } from "../../lib/query-keys";
import * as authService from "../../services/auth";
import type { CompensationRole } from "../../types/finance";
import { usePermissions } from "../usePermissions";
import { useProfitByStaff } from "./useFinanceReportsQuery";

/**
 * Who a visit's operator can be — the visit serializer takes any active
 * ClinicUser id. `compensationRole` is known for staff coming from the
 * employee directory (admins); the profit report carries no role, so it
 * stays undefined there and callers must degrade gracefully.
 */
export interface VisitStaffOption {
  id: number;
  label: string;
  compensationRole?: CompensationRole;
}

/**
 * The visit serializer accepts any active `ClinicUser` id as `staff`, but there
 * is no staff-list endpoint open to every role. The choices here are merged from
 * what the app can already read:
 *
 * - the per-staff profit report for the current Shamsi year — any authenticated
 *   user can read it, and it covers everyone who has run a completed visit;
 * - the employee directory — admins only, and it also covers people who have not
 *   run a visit yet. It also carries each person's `compensation_role`, the only
 *   client-side role source for a whole staff list.
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
        if (id == null) continue;
        const label = (employee.username ?? "").trim() || `پرسنل ${id}`;
        const existing = options.get(id);
        if (existing) {
          // The profit row came first — it has no role, the directory does.
          existing.compensationRole ??= employee.compensationRole;
        } else {
          options.set(id, { id, label, compensationRole: employee.compensationRole });
        }
      }
    }

    return [...options.values()].sort((a, b) => a.label.localeCompare(b.label, "fa"));
  }, [canManageUsers, employees, profitRows]);
}

export { useVisitStaffOptions };
