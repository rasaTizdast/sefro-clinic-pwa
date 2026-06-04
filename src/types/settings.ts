export type UserRole = "مدیر" | "پزشک" | "منشی";

export interface ClinicUser {
  id: number;
  username: string;
  role: UserRole;
  email: string;
  status: "active" | "inactive";
}

export interface DayHours {
  day: string;
  open: string;
  close: string;
}
