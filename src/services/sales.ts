import { endpoints } from "../config/api";
import { apiClient } from "../lib/api-client";
import { tomanToUsd, tomanToUsdHalfEven } from "../lib/currency";
import { type PaginationParams, toPaginatedResponse, toQueryParams } from "../lib/pagination";
import type { PaginatedResponse } from "../types/api";
import type { CheckoutPayload, PaymentComponentInput, Sale, SaleStatus } from "../types/finance";
import { fetchAllPages } from "./fetch-all-pages";

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
  /** Cash in USD (dollar). Optional for backward compatibility — defaults to 0. */
  cashUsd?: string | number;
  visitId?: number | null;
  packageId?: number | null;
  discountToman?: number;
  description?: string;
}

/**
 * Turn a cash-toman / cash-dollar / card split into the USD checkout payload.
 * The card component always takes the remainder so the USD components sum
 * exactly to amountUsd (avoids 2-decimal rounding drift).
 * Throws when the split does not add up or when no exchange rate is available.
 */
export function buildCheckoutPayload(i: CheckoutInput): CheckoutPayload {
  if (!i.rate || i.rate <= 0) throw new Error("Exchange rate unavailable.");

  // Normalize to 2dp so the value we *send* (wire) and the value we *sum* (math) are identical.
  const cashUsdNum = Math.round((Number(i.cashUsd ?? 0) || 0) * 100) / 100;
  if (cashUsdNum < 0) throw new Error("Payment components must sum to the sale amount.");
  const cashUsd = cashUsdNum > 0 ? cashUsdNum.toFixed(2) : null;

  // Toman-level check: cash-toman + card-toman + rounded dollar-toman must equal total.
  const dollarToman = cashUsdNum > 0 ? Math.ceil(cashUsdNum * i.rate) : 0;
  if (i.cashToman + i.cardToman + dollarToman !== i.totalToman) {
    throw new Error("Payment components must sum to the sale amount.");
  }

  // The backend re-derives cash_toman with round-half-even 2dp and rejects the sale
  // unless amountUsd equals that component sum — so build amountUsd from the exact
  // same conversions the server will apply (ceil vs half-even drift caused 400s).
  const cashTomanUsd = tomanToUsdHalfEven(i.cashToman, i.rate);
  const cardTomanUsd = tomanToUsdHalfEven(i.cardToman, i.rate);
  if (cashTomanUsd === null || cardTomanUsd === null) throw new Error("Exchange rate unavailable.");

  const amountUsd = (
    (Math.round(cashTomanUsd * 100) +
      Math.round(cardTomanUsd * 100) +
      Math.round(cashUsdNum * 100)) /
    100
  ).toFixed(2);

  const components: PaymentComponentInput[] = [];
  if (i.cashToman > 0) {
    // NOTE: for "cash_toman" the backend expects the wire key amount_usd but
    // interprets its value as a TOMAN amount and converts it server-side.
    components.push({ method: "cash_toman", amountUsd: String(i.cashToman) });
  }

  if (cashUsd !== null) {
    components.push({ method: "cash_usd", amountUsd: cashUsd });
  }

  if (i.cardToman > 0) {
    // The card component carries the card Toman converted with the same half-even
    // rule, so the three components sum to amountUsd by construction.
    components.push({ method: "card", amountUsd: cardTomanUsd.toFixed(2) });
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

export interface PaymentParts {
  cashToman: number;
  cardToman: number;
  cashUsd: number;
}

export interface VisitSplitInput {
  serviceFeeToman: number;
  totalToman: number;
  rate: number;
  cashToman: number;
  cardToman: number;
  cashUsd: number;
}

/**
 * Split a visit's payment between the SERVICE sale (visit-bound — the only
 * money staff compensation is computed from) and the GOODS sale (visit-less —
 * products must never inflate an operator's share). Both parts fill cash first,
 * then card, and keep the whole USD leg on one side so each sale's components
 * still sum exactly to its amount (buildCheckoutPayload throws otherwise).
 * Returns null when the payment methods cannot be partitioned exactly
 * (typically heavy-USD bills) — callers then fall back to one combined sale.
 */
export function partitionVisitPayment(
  i: VisitSplitInput
): { service: PaymentParts; goods: PaymentParts } | null {
  const cashUsd = Math.round(i.cashUsd * 100) / 100;
  const dollarToman = cashUsd > 0 ? Math.ceil(cashUsd * i.rate) : 0;
  const toman = i.cashToman + i.cardToman;
  const fee = i.serviceFeeToman;
  const goods = i.totalToman - fee;
  if (fee <= 0 || goods <= 0) return null;

  const take = (tomanShare: number, usdShare: number): PaymentParts | null => {
    if (tomanShare < 0) return null;
    const cash = Math.min(i.cashToman, tomanShare);
    const card = tomanShare - cash;
    if (card > i.cardToman) return null;
    return { cashToman: cash, cardToman: card, cashUsd: usdShare };
  };

  // Case 1: the whole USD leg rides on the service sale.
  if (dollarToman <= fee && fee - dollarToman <= toman) {
    const service = take(fee - dollarToman, cashUsd);
    if (service) {
      return {
        service,
        goods: {
          cashToman: i.cashToman - service.cashToman,
          cardToman: i.cardToman - service.cardToman,
          cashUsd: 0,
        },
      };
    }
  }
  // Case 2: the whole USD leg rides on the goods sale.
  if (dollarToman <= goods && goods - dollarToman <= toman) {
    const goodsParts = take(goods - dollarToman, cashUsd);
    if (goodsParts) {
      return {
        service: {
          cashToman: i.cashToman - goodsParts.cashToman,
          cardToman: i.cardToman - goodsParts.cardToman,
          cashUsd: 0,
        },
        goods: goodsParts,
      };
    }
  }
  return null;
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

/**
 * Every visit that has a paid sale (across all pages), used by the calendar to
 * hide the "تمام شدن و تسویه" button once a visit has been settled.
 */
export async function listPaidVisitIds(): Promise<number[]> {
  const rows = await fetchAllPages<RawSale>(endpoints.sales.list, { status: "paid" });
  const ids = new Set<number>();
  for (const row of rows) {
    if (row.visit) ids.add(row.visit);
  }
  return [...ids];
}
