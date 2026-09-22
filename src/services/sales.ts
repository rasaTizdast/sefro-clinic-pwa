import { endpoints } from "../config/api";
import { apiClient } from "../lib/api-client";
import { tomanToUsd } from "../lib/currency";
import { type PaginationParams, toPaginatedResponse, toQueryParams } from "../lib/pagination";
import type { PaginatedResponse } from "../types/api";
import type { CheckoutPayload, PaymentComponentInput, Sale, SaleStatus } from "../types/finance";

const DEFAULT_PER_PAGE = 20;

/** Wire shape (already camelCased by the api-client response interceptor). Money stays a string. */
type RawSale = Record<string, unknown> & {
  id: number;
  customer?: number;
  visit?: number | null;
  package?: number | null;
  amountUsd?: string;
  discountUsd?: string;
  exchangeRate?: string | null;
  amountToman?: string;
  status?: SaleStatus;
  idempotencyKey?: string | null;
  createdAt?: string;
};

export const toSale = (raw: RawSale): Sale => ({
  id: raw.id,
  customer: raw.customer ?? 0,
  visit: raw.visit ?? null,
  package: raw.package ?? null,
  amountUsd: raw.amountUsd ?? "0.00",
  discountUsd: raw.discountUsd ?? "0.00",
  exchangeRate: raw.exchangeRate ?? null,
  amountToman: raw.amountToman ?? "0",
  status: raw.status ?? "pending",
  idempotencyKey: raw.idempotencyKey ?? null,
  createdAt: raw.createdAt ?? "",
});

export interface CheckoutInput {
  customerId: number;
  totalToman: number;
  rate: number | null;
  cashToman: number;
  cardToman: number;
  visitId?: number | null;
  packageId?: number | null;
  discountToman?: number;
  description?: string;
}

/**
 * Turn a Toman cash/card split into the USD checkout payload.
 * Throws when the split does not add up or when no exchange rate is available.
 */
export function buildCheckoutPayload(i: CheckoutInput): CheckoutPayload {
  if (i.cashToman + i.cardToman !== i.totalToman) {
    throw new Error("Payment components must sum to the sale amount.");
  }

  const amountUsd = tomanToUsd(i.totalToman, i.rate);
  if (amountUsd === null) throw new Error("Exchange rate unavailable.");

  const components: PaymentComponentInput[] = [];
  if (i.cashToman > 0) {
    // NOTE: for "cash_toman" the backend expects the wire key amount_usd but
    // interprets its value as a TOMAN amount and converts it server-side.
    components.push({ method: "cash_toman", amountUsd: String(i.cashToman) });
  }

  if (i.cardToman > 0) {
    const cashUsd = tomanToUsd(i.cashToman, i.rate);
    if (cashUsd === null) throw new Error("Exchange rate unavailable.");
    // the remainder goes to the last component so the components sum exactly to amountUsd
    const cardUsd = i.cashToman > 0 ? (Number(amountUsd) - Number(cashUsd)).toFixed(2) : amountUsd;
    components.push({ method: "card", amountUsd: cardUsd });
  }

  const discountUsd = i.discountToman ? tomanToUsd(i.discountToman, i.rate) : null;

  return {
    customer: i.customerId,
    amountUsd,
    components,
    ...(discountUsd ? { discountUsd } : {}),
    visit: i.visitId ?? null,
    package: i.packageId ?? null,
    idempotencyKey: crypto.randomUUID(),
    description: i.description ?? "",
  };
}

export async function checkout(payload: CheckoutPayload): Promise<Sale> {
  const { data } = await apiClient.post(endpoints.sales.checkout, payload);
  return toSale(data as RawSale);
}

export type SalesListParams = PaginationParams & {
  customer?: number;
  status?: SaleStatus;
  package?: number;
};

export const listSales = async (params?: SalesListParams): Promise<PaginatedResponse<Sale>> => {
  const page = params?.page ?? 1;
  const perPage = params?.perPage ?? DEFAULT_PER_PAGE;
  const query: Record<string, string | number> = toQueryParams({ ...params, page, perPage });
  if (params?.customer !== undefined) query.customer = params.customer;
  if (params?.status) query.status = params.status;
  if (params?.package !== undefined) query.package = params.package;

  const { data } = await apiClient.get(endpoints.sales.list, { params: query });
  const paginated = toPaginatedResponse<RawSale>(data as never, page, perPage);
  return {
    ...paginated,
    data: paginated.data.map(toSale),
  };
};

export const getSale = async (id: number): Promise<Sale> => {
  const { data } = await apiClient.get(endpoints.sales.detail(id));
  return toSale(data as RawSale);
};

export const refundSale = async (
  id: number,
  payload: { refundAmountUsd?: string; reason?: string }
): Promise<Sale> => {
  const { data } = await apiClient.post(endpoints.sales.refund(id), payload);
  return toSale(data as RawSale);
};
