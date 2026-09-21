import { endpoints } from "../config/api";
import { apiClient } from "../lib/api-client";
import { tomanToUsd } from "../lib/currency";
import { jalaliToGregorianISO } from "../lib/date";
import { type PaginationParams, toPaginatedResponse, toQueryParams } from "../lib/pagination";
import type { PaginatedResponse } from "../types/api";
import type {
  ConsumptionSelection,
  ProductCostHistory,
  ProductPurchase,
  ProductUsage,
} from "../types/finance";

const DEFAULT_PER_PAGE = 20;

/** Decimal defaults; a 3dp one for quantities (the backend stores quantities with 3 decimals). */
const USD = "0.00";
const QTY = "0.000";

/**
 * Wire shapes. The axios client camelCases response keys before services see them, so the
 * camelCase aliases below are the ones used at runtime. Money/quantity always stay strings.
 */
type RawProductPurchase = Record<string, unknown> & {
  id: number;
  product?: number;
  quantity?: string;
  unitCostUsd?: string;
  totalCostUsd?: string;
  supplier?: string;
  purchaseDate?: string;
  exchangeRateSnapshot?: string | null;
  createdAt?: string;
};

type RawProductUsage = Record<string, unknown> & {
  id: number;
  product?: number;
  visit?: number | null;
  service?: number | null;
  packageSale?: number | null;
  quantity?: string;
  unitCostUsdSnapshot?: string;
  totalCostUsdSnapshot?: string;
  exchangeRateSnapshot?: string;
  createdAt?: string;
};

type RawProductCostHistory = Record<string, unknown> & {
  id: number;
  product?: number;
  costUsd?: string;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  createdAt?: string;
};

export const toProductPurchase = (raw: RawProductPurchase): ProductPurchase => ({
  id: raw.id,
  product: raw.product ?? 0,
  quantity: raw.quantity ?? QTY,
  unitCostUsd: raw.unitCostUsd ?? USD,
  totalCostUsd: raw.totalCostUsd ?? USD,
  supplier: raw.supplier ?? "",
  purchaseDate: raw.purchaseDate ?? "",
  exchangeRateSnapshot: raw.exchangeRateSnapshot ?? null,
  createdAt: raw.createdAt ?? "",
});

export const toProductUsage = (raw: RawProductUsage): ProductUsage => ({
  id: raw.id,
  product: raw.product ?? 0,
  visit: raw.visit ?? null,
  service: raw.service ?? null,
  packageSale: raw.packageSale ?? null,
  quantity: raw.quantity ?? QTY,
  unitCostUsdSnapshot: raw.unitCostUsdSnapshot ?? USD,
  totalCostUsdSnapshot: raw.totalCostUsdSnapshot ?? USD,
  exchangeRateSnapshot: raw.exchangeRateSnapshot ?? "",
  createdAt: raw.createdAt ?? "",
});

export const toProductCostHistory = (raw: RawProductCostHistory): ProductCostHistory => ({
  id: raw.id,
  product: raw.product ?? 0,
  costUsd: raw.costUsd ?? USD,
  effectiveFrom: raw.effectiveFrom ?? "",
  effectiveTo: raw.effectiveTo ?? null,
  createdAt: raw.createdAt ?? "",
});

/** Purchase as entered in the UI: Toman money + a Shamsi date. */
export interface PurchaseInput {
  productId: number;
  quantity: number | string;
  unitCostToman: number;
  rate: number | null;
  supplier?: string;
  purchaseDateJalali: string;
}

/** Purchase payload as the API expects it: USD money + a Gregorian date. */
export interface PurchasePayload {
  product: number;
  quantity: string;
  unitCostUsd: string;
  totalCostUsd: string;
  supplier: string;
  purchaseDate: string;
}

/**
 * Turn a Toman purchase into the USD payload; the backend then updates the product's cost and
 * appends a cost-history row. Throws when no exchange rate is available.
 */
export function buildPurchasePayload(i: PurchaseInput): PurchasePayload {
  const unitCostUsd = tomanToUsd(i.unitCostToman, i.rate);
  if (unitCostUsd === null) throw new Error("Exchange rate unavailable.");

  const quantity = Number(i.quantity) || 0;
  // Single rounding from Toman values avoids double-rounding float drift
  // (e.g. 333333 × 2.5 / 100000 → "8.33", not "8.32").
  const totalCostUsd = ((i.unitCostToman * quantity) / (i.rate as number)).toFixed(2);

  return {
    product: i.productId,
    quantity: quantity.toFixed(3),
    unitCostUsd,
    totalCostUsd,
    supplier: i.supplier ?? "",
    purchaseDate: jalaliToGregorianISO(i.purchaseDateJalali),
  };
}

export type PurchasesListParams = PaginationParams & { product?: number };

export type UsagesListParams = PaginationParams & {
  product?: number;
  visit?: number;
  service?: number;
  packageSale?: number;
};

export type CostHistoryParams = PaginationParams;

export const listPurchases = async (
  params?: PurchasesListParams
): Promise<PaginatedResponse<ProductPurchase>> => {
  const page = params?.page ?? 1;
  const perPage = params?.perPage ?? DEFAULT_PER_PAGE;
  const query: Record<string, string | number> = toQueryParams({ ...params, page, perPage });
  if (params?.product !== undefined) query.product = params.product;

  const { data } = await apiClient.get(endpoints.finance.purchases, { params: query });
  const paginated = toPaginatedResponse<RawProductPurchase>(data as never, page, perPage);
  return {
    ...paginated,
    data: paginated.data.map(toProductPurchase),
  };
};

export const createPurchase = async (input: PurchaseInput): Promise<ProductPurchase> => {
  const { data } = await apiClient.post(endpoints.finance.purchases, buildPurchasePayload(input));
  return toProductPurchase(data as RawProductPurchase);
};

/**
 * Read-only usage log. `ProductUsageViewSet.get_queryset` only honours `visit`, `service`,
 * `product` and `package_sale` (alongside DRF pagination) — other params are ignored by the API.
 */
export const listUsages = async (
  params?: PaginationParams & {
    product?: number;
    visit?: number;
    service?: number;
    packageSale?: number;
  }
): Promise<PaginatedResponse<ProductUsage>> => {
  const page = params?.page ?? 1;
  const perPage = params?.perPage ?? DEFAULT_PER_PAGE;
  const query: Record<string, string | number> = toQueryParams({ ...params, page, perPage });
  if (params?.product !== undefined) query.product = params.product;
  if (params?.visit !== undefined) query.visit = params.visit;
  if (params?.service !== undefined) query.service = params.service;
  if (params?.packageSale !== undefined) query.package_sale = params.packageSale;

  const { data } = await apiClient.get(endpoints.finance.usages, { params: query });
  const paginated = toPaginatedResponse<RawProductUsage>(data as never, page, perPage);
  return {
    ...paginated,
    data: paginated.data.map(toProductUsage),
  };
};

/**
 * Read-only cost snapshots of one product. `ProductCostHistoryViewSet` declares no filters today,
 * so `product` is sent for forward compatibility; until the API filters server-side the response
 * may include every product's rows.
 */
export const listCostHistory = async (
  productId: number,
  params?: PaginationParams
): Promise<PaginatedResponse<ProductCostHistory>> => {
  const page = params?.page ?? 1;
  const perPage = params?.perPage ?? DEFAULT_PER_PAGE;
  const query: Record<string, string | number> = toQueryParams({ ...params, page, perPage });
  query.product = productId;

  const { data } = await apiClient.get(endpoints.finance.costHistory, { params: query });
  const paginated = toPaginatedResponse<RawProductCostHistory>(data as never, page, perPage);
  return {
    ...paginated,
    data: paginated.data.map(toProductCostHistory),
  };
};

export interface ConsumptionRecord {
  service: number;
  product: number;
  quantity: string;
}

/** Flatten a per-service `ConsumptionSelection` into the row list the API records. */
export function toConsumptionRecords(selection: ConsumptionSelection): ConsumptionRecord[] {
  return Object.entries(selection).flatMap(
    ([serviceId, rows]: [string, { product: number; quantity: string }[]]) =>
      rows.map((row) => ({
        service: Number(serviceId),
        product: row.product,
        quantity: String(row.quantity),
      }))
  );
}

/**
 * Record the consumables used during a visit (checkout consumption step).
 * No-op when the selection is empty — there is nothing to record.
 */
export const recordConsumption = async (
  visitId: number,
  selection: ConsumptionSelection
): Promise<void> => {
  const consumptions = toConsumptionRecords(selection);
  if (consumptions.length === 0) return;
  await apiClient.post(endpoints.finance.recordConsumption(visitId), { consumptions });
};
