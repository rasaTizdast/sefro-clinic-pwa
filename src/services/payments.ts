import { endpoints } from "../config/api";
import { fetchAllPages } from "./fetch-all-pages";

export interface PaymentRow {
  id: number;
  customer: number | null;
  customerName: string;
  visit: number | null;
  amount: string;
  amountUsd: string;
  exchangeRate: string;
  paymentMethod: string;
  paidAt: string | null;
  notes: string;
}

type RawPayment = Record<string, unknown> & {
  id: number;
  customer?: number | null;
  customerName?: string;
  visit?: number | null;
  amount?: string;
  amountUsd?: string;
  exchangeRate?: string;
  paymentMethod?: string;
  paidAt?: string | null;
  notes?: string;
};

const toPaymentRow = (raw: RawPayment): PaymentRow => ({
  id: raw.id,
  customer: raw.customer ?? null,
  customerName: raw.customerName ?? "",
  visit: raw.visit ?? null,
  amount: raw.amount ?? "0",
  amountUsd: raw.amountUsd ?? "0",
  exchangeRate: raw.exchangeRate ?? "0",
  paymentMethod: raw.paymentMethod ?? "",
  paidAt: raw.paidAt ?? null,
  notes: raw.notes ?? "",
});

export const listAllPayments = async (): Promise<PaymentRow[]> => {
  const rows = await fetchAllPages<RawPayment>(endpoints.payments.list);
  return rows.map(toPaymentRow);
};
