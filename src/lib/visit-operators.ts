import type { VisitOperator } from "../types/appointment";
import type { CompensationRole } from "../types/finance";

/** Structurally compatible with `VisitStaffOption` (kept hook-free on purpose). */
export interface OperatorStaffOption {
  id: number;
  label: string;
  compensationRole?: CompensationRole;
}

/**
 * The edit modal's per-service select state: service id → staff id as a
 * string ("" = not assigned yet). Built from the visit's resolved
 * `operators` rows so the modal opens showing what the backend would settle.
 */
export function initialOperatorSelection(operators: VisitOperator[]): Record<number, string> {
  const selection: Record<number, string> = {};
  for (const op of operators) {
    selection[op.service] = op.staff != null ? String(op.staff) : "";
  }
  return selection;
}

/**
 * Only the entries the user actually changed to a non-empty staff — the
 * backend keeps any assignment left out, and its `service_operators` staff is
 * not nullable, so a "cleared" selection simply cannot be expressed on the
 * wire and is treated as "leave unchanged".
 */
export function buildServiceOperatorsPayload(
  initial: Record<number, string>,
  current: Record<number, string>
): { service: number; staff: number }[] {
  const payload: { service: number; staff: number }[] = [];
  for (const [serviceKey, staffValue] of Object.entries(current)) {
    const service = Number(serviceKey);
    if (!Number.isFinite(service)) continue;
    if (staffValue === "" || staffValue === (initial[service] ?? "")) continue;
    payload.push({ service, staff: Number(staffValue) });
  }
  return payload;
}

function sortOptions(options: OperatorStaffOption[]): OperatorStaffOption[] {
  return [...options].sort((a, b) => a.label.localeCompare(b.label, "fa"));
}

/**
 * Candidates for one service's operator select.
 *
 * - `none`-role services take anyone (the backend validates nothing).
 * - When no option carries any role at all (non-admin with no role source),
 *   everyone is offered and the backend's 400 ("X is a Y, but the service
 *   requires Z") is the backstop.
 * - Otherwise: the options whose known role matches, plus staff the backend
 *   already resolved onto a same-role service of this visit (their role is
 *   proven even when the option row itself carries none), plus whoever is
 *   currently assigned so the select can always show the truth.
 */
export function filterStaffOptionsForRole(
  options: OperatorStaffOption[],
  role: CompensationRole,
  operators: VisitOperator[],
  currentStaffId?: number | null
): OperatorStaffOption[] {
  if (role === "none") return sortOptions(options);

  const knownRoleOptions = options.filter((option) => option.compensationRole != null);
  if (knownRoleOptions.length === 0) return sortOptions(options);

  const byId = new Map<number, OperatorStaffOption>(
    knownRoleOptions
      .filter((option) => option.compensationRole === role)
      .map((option) => [option.id, option])
  );

  // Staff the backend resolved onto a same-role service of this visit: proof
  // of the role even for option rows that carry none.
  for (const op of operators) {
    if (op.compensationRole !== role || op.staff == null || byId.has(op.staff)) continue;
    byId.set(op.staff, {
      id: op.staff,
      label: (op.staffName ?? "").trim() || `پرسنل ${op.staff}`,
    });
  }

  // The current assignee stays listed so the select never shows a value with
  // no matching option — the backend is the authority on role mismatches.
  if (currentStaffId != null && !byId.has(currentStaffId)) {
    const fromOptions = options.find((option) => option.id === currentStaffId);
    byId.set(
      currentStaffId,
      fromOptions ?? { id: currentStaffId, label: `پرسنل ${currentStaffId}` }
    );
  }

  return sortOptions([...byId.values()]);
}
