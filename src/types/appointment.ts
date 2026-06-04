export type AppointmentStatus = "confirmed" | "waiting" | "cancelled" | "completed";

export interface Appointment {
  id: number;
  time: string;
  patient: string;
  doctor: string;
  service: string;
  date: string;
  status: AppointmentStatus;
}

export interface NewAppointmentFormData {
  patient: string;
  doctor: string;
  service: string;
  date: string;
  time: string;
  notes: string;
}

export interface DayCell {
  day: number;
  isToday: boolean;
  isSelected: boolean;
  date: string;
  appointments: Appointment[];
}
