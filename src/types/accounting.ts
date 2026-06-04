import type { ReactNode } from "react";
import type { Trend } from "./common";

export type TransactionStatus = "paid" | "pending" | "cancelled";

export interface Transaction {
  id: number;
  date: string;
  description: string;
  patient: string;
  amount: number;
  paymentMethod: string;
  status: TransactionStatus;
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
