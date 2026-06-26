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
  serviceId: number | null;
  date: string;
  time: string;
  notes: string;
}

export interface ReserveVisitPayload {
  customer: number;
  services: number[];
  date: string;
  time: string;
  notes?: string;
}

export interface UpdateVisitPayload {
  services?: number[];
  date?: string;
  time?: string;
  notes?: string;
}
