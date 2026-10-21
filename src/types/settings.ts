import type { CompensationRole } from "./finance";

export type UserRole = "مدیر" | "پزشک" | "منشی";

export interface ClinicUser {
  id: number;
  username: string;
  role: UserRole;
  email: string;
  status: "active" | "inactive";
  compensationRole?: CompensationRole;
}

export interface DayHours {
  day: string;
  open: string;
  close: string;
}
