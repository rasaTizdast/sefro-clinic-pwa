import { endpoints } from "../config/api";
import { apiClient } from "../lib/api-client";
import { type PaginationParams, toPaginatedResponse } from "../lib/pagination";
import type { BackendPaymentMethod, Transaction } from "../types/accounting";
import type { PaginatedResponse } from "../types/api";

const VALID_PAYMENT_METHODS: BackendPaymentMethod[] = ["cash", "card", "transfer"];

type RawPayment = Record<string, unknown> & {
  id: number;
  customerName?: string;
  amount?: string;
  paymentMethod?: string;
  paidAt?: string;
  notes?: string;
  customer?: number;
};

const toTransaction = (raw: RawPayment): Transaction => ({
  id: raw.id,
  date: raw.paidAt ?? "",
  description: raw.notes ?? "",
  patient: raw.customerName ?? "",
  amount: Number(raw.amount) || 0,
  paymentMethod: raw.paymentMethod ?? "cash",
  status: "paid",
});

const toBackendPayload = (data: Record<string, unknown>) => {
  let method = String(data.paymentMethod ?? "cash");
  if (!VALID_PAYMENT_METHODS.includes(method as BackendPaymentMethod)) {
    method = "cash";
  }
  return {
    customer: data.patientId,
    amount: Number(data.amount) || 0,
    payment_method: method,
    paid_at: data.date,
    notes: data.description ?? "",
  };
};

export const listPayments = async (
  params?: PaginationParams & { dateFrom?: string; dateTo?: string }
): Promise<PaginatedResponse<Transaction>> => {
  const page = params?.page ?? 1;
  const perPage = params?.perPage ?? 20;
  const { data } = await apiClient.get(endpoints.payments.list, {
    params: {
      page,
      per_page: perPage,
      search: params?.search,
      ordering: params?.sort ? `${params.order === "desc" ? "-" : ""}${params.sort}` : undefined,
      dateFrom: params?.dateFrom,
      dateTo: params?.dateTo,
    },
  });
  const paginated = toPaginatedResponse<RawPayment>(data as never, page, perPage);
  return {
    ...paginated,
    data: paginated.data.map(toTransaction),
  };
};

export const getPayment = async (id: number): Promise<Transaction> => {
  const { data } = await apiClient.get(endpoints.payments.detail(id));
  return toTransaction(data as RawPayment);
};

export const createPayment = async (payment: Record<string, unknown>) => {
  const payload = toBackendPayload(payment);
  const { data } = await apiClient.post(endpoints.payments.list, payload);
  return toTransaction(data as RawPayment);
};

export const getPaymentsByService = async (dateFrom?: string, dateTo?: string) => {
  const { data } = await apiClient.get(endpoints.payments.byService, {
    params: { dateFrom, dateTo },
  });
  return data;
};
