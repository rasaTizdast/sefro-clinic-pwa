import type { ReactNode } from "react";

import type { Trend } from "./common";

export type TransactionStatus = "paid" | "cancelled";

export type PaymentMethod = "cash" | "card" | "transfer";

export interface Transaction {
  id: number;
  date: string;
  description: string;
  patient: string;
  amount: number;
  paymentMethod: PaymentMethod;
  status: TransactionStatus;
  serviceId?: number;
  customerId?: number;
}

export interface TransactionFormData {
  date: string;
  patientId: number;
  patientName: string;
  serviceId: number;
  amount: number;
  paymentMethod: PaymentMethod;
  description: string;
}

export interface DailyRevenue {
  day: string;
  amount: number;
}

export interface AccountingStat {
  title: string;
  value: string;
  icon: ReactNode;
  trend: Trend;
  change: string;
}

export type PeriodFilter = "today" | "week" | "month" | "threeMonths" | "year";

export interface DateRange {
  from: string;
  to: string;
}
