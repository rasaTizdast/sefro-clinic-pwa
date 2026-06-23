export type AppointmentStatus = "confirmed" | "pending" | "canceled" | "completed";

export interface Appointment {
  id: number;
  time: string;
  patient: string;
  service: string;
  serviceId: number;
  duration: number;
  date: string;
  status: AppointmentStatus;
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
