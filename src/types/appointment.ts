import type { CompensationRole } from "./finance";

export type AppointmentStatus = "pending" | "confirmed" | "completed" | "canceled";

/**
 * One per-service operator row from the visit serializer's read-only
 * `operators` — explicit `service_operators` first, auto-resolution fallback.
 * `staff`/`staffName` are null when no one covers the service's role yet
 * (the visit cannot be completed until that is fixed).
 */
export interface VisitOperator {
  service: number;
  serviceName: string;
  staff: number | null;
  staffName: string | null;
  /** The service's compensation role: doctor / facial / laser / none. */
  compensationRole: CompensationRole;
}

export interface Appointment {
  id: number;
  customer: number;
  customerName: string;
  customerMobile: string;
  staff: number | null;
  services: number[];
  serviceNames: string[];
  /** Resolved per-service operators, one row per visit service. */
  operators: VisitOperator[];
  startAt: string;
  endAt: string;
  date: string;
  time: string;
  duration: number;
  status: AppointmentStatus;
  notes: string;
}

export interface DayCell {
  day: number;
  isToday: boolean;
  isSelected: boolean;
  date: string;
  appointments: Appointment[];
}

export type WizardStep = "patient" | "service" | "time";

export interface WizardFormData {
  patientId: number | null;
  /** Multiple services may be booked in one visit; order = selection order. */
  serviceIds: number[];
  date: string;
  time: string;
  notes: string;
  /** Operator the visit is booked under. Null leaves it unassigned. */
  staffId: number | null;
}

export interface ReserveVisitPayload {
  customer: number;
  services: number[];
  date: string;
  time: string;
  notes?: string;
  /**
   * The operator who runs the visit. Required by the backend to settle the
   * compensation payout on a visit carrying a compensable service — completing
   * such a visit without it returns a 400.
   */
  staff?: number;
}

export interface UpdateVisitPayload {
  services?: number[];
  date?: string;
  time?: string;
  notes?: string;
  /**
   * The visit operator, or `null` to clear it. The backend rejects a change on
   * a visit that already has a compensation payout — reassignment after the
   * payout is booked is a 400.
   */
  staff?: number | null;
  /**
   * Explicit per-service operator assignments (`{service, staff}`). Each staff
   * must hold the service's compensation role (or the role must be `none`);
   * the backend 400s on a mismatch. Entries replace that service's assignment;
   * services left out keep their current operator. The API cannot clear an
   * assignment once set (staff is not nullable there).
   */
  service_operators?: { service: number; staff: number }[];
}
