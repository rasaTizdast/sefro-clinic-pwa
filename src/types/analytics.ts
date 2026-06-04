import type { ReactNode } from "react";
import type { Trend } from "./common";

export interface KpiStat {
  title: string;
  value: string;
  change: string;
  trend: Trend;
  icon: ReactNode;
}

export interface MonthlyRevenue {
  month: string;
  revenue: number;
}

export interface AppointmentStat {
  name: string;
  value: number;
  color: string;
}

export interface PatientVisit {
  month: string;
  visits: number;
}

export interface ServiceCategoryStat {
  name: string;
  value: number;
}
