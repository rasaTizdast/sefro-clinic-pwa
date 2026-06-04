import type { ReactNode } from "react";

import type { Trend } from "./common";

export interface DashboardStat {
  title: string;
  value: string;
  change: string;
  trend: Trend;
  icon: ReactNode;
  variant: "default" | "success" | "warning" | "danger" | "info";
}

export type AppointmentStatusVariant = "success" | "warning" | "danger" | "info";

export interface AppointmentStatusConfig {
  label: string;
  variant: AppointmentStatusVariant;
}

export type PatientStatusVariant = "success" | "warning" | "info";

export interface PatientStatusConfig {
  label: string;
  variant: PatientStatusVariant;
}
