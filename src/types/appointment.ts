export type AppointmentStatus = "pending" | "confirmed" | "completed" | "canceled";

export interface Appointment {
  id: number;
  customer: number;
  customerName: string;
  customerMobile: string;
  staff: number | null;
  services: number[];
  serviceNames: string[];
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
}
