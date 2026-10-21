import { endpoints } from "../config/api";
import { apiClient } from "../lib/api-client";
import { snapshotToman, tomanToUsd } from "../lib/currency";
import { shamsiDayOf, toShamsiApiDay } from "../lib/date";
import { toLatinDigits } from "../lib/digits";
import { ceilUp } from "../lib/format";
import { type PaginationParams, toPaginatedResponse, toQueryParams } from "../lib/pagination";
import type { PaginatedResponse } from "../types/api";
import type {
  ConsumptionSelection,
  ProductCostHistory,
  ProductPurchase,
  ProductUsage,
} from "../types/finance";
import type { ConsumableSelection } from "../types/wizard";
import { fetchAllPages } from "./fetch-all-pages";

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

/** Purchase payload as the API expects it: USD money + a Shamsi (Jalali) date. */
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
  // The unit cost is already ceiled to cents (never rounds the entered Toman price
  // down); the total is unit × quantity, ceiled to cents the same way — matching
  // what the backend recomputes from unit_cost_usd × quantity.
  const totalCostUsd = (ceilUp(Number(unitCostUsd) * quantity * 100) / 100).toFixed(2);

  return {
    product: i.productId,
    ...purchaseFields(i),
    totalCostUsd,
  };
}

/**
 * The editable half of a purchase payload — shared by create and update.
 * `totalCostUsd` is deliberately absent: it is derived from unit × quantity and
 * is read-only on the backend, so a PATCH must not send it.
 */
function purchaseFields(i: Omit<PurchaseInput, "productId">) {
  const unitCostUsd = tomanToUsd(i.unitCostToman, i.rate);
  if (unitCostUsd === null) throw new Error("Exchange rate unavailable.");
  return {
    quantity: (Number(i.quantity) || 0).toFixed(3),
    unitCostUsd,
    supplier: (i.supplier ?? "").trim(),
    purchaseDate: toShamsiApiDay(i.purchaseDateJalali) ?? "",
  };
}

export type PurchasesListParams = PaginationParams & { product?: number };

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
 * Edit an existing purchase. The backend reverses the original receipt (stock,
 * `cost_usd` and the cost-history range) and re-applies it from these values, so
 * the row and the product stay in agreement.
 *
 * `totalCostUsd` / `exchangeRateSnapshot` are server-owned — sending them is
 * rejected as read-only, so only the editable fields go over the wire.
 */
export const updatePurchase = async (
  id: number,
  input: Omit<PurchaseInput, "productId">
): Promise<ProductPurchase> => {
  const { data } = await apiClient.patch(endpoints.finance.purchaseDetail(id), {
    ...purchaseFields(input),
  });
  return toProductPurchase(data as RawProductPurchase);
};

/**
 * Delete a purchase. The backend rolls back the stock it added and reopens the
 * previous cost range; it answers 400 when the quantity has since been consumed,
 * so the error text is surfaced rather than swallowed.
 */
export const deletePurchase = (id: number) =>
  apiClient.delete(endpoints.finance.purchaseDetail(id));

/**
 * Every purchase across all pages. `ProductPurchaseViewSet` declares no date
 * filters and the API paginates with a fixed page size, so callers that need
 * period totals (e.g. the analytics cost line) load the whole ledger once and
 * filter client-side — the same approach `listAllUsages` takes.
 */
export const listAllPurchases = async (): Promise<ProductPurchase[]> => {
  const rows = await fetchAllPages<RawProductPurchase>(endpoints.finance.purchases);
  return rows.map(toProductPurchase);
};

export interface PurchaseCostTotal {
  usd: number;
  toman: number;
  count: number;
}

/**
 * Purchases inside an inclusive Shamsi `YYYY-MM-DD` range, summed at the rate
 * each row snapshotted when it was recorded.
 *
 * This is cash that left the clinic to restock inventory — deliberately NOT the
 * same thing as `هزینه محصول` (COGS), which only counts stock actually consumed.
 * Adding the two together would double-count, so the UI shows them as separate
 * lines rather than folding purchases into the profit bridge.
 */
export function sumPurchasesInRange(
  purchases: ProductPurchase[],
  range: { start: string; end: string }
): PurchaseCostTotal {
  let usd = 0;
  let toman = 0;
  let count = 0;
  for (const purchase of purchases) {
    const date = shamsiDayOf(purchase.purchaseDate);
    if (!date) continue;
    if (date < range.start || date > range.end) continue;
    usd += Number(purchase.totalCostUsd) || 0;
    toman += snapshotToman(purchase.totalCostUsd, purchase.exchangeRateSnapshot) ?? 0;
    count += 1;
  }
  return { usd, toman, count };
}

/**
 * Every usage row across all pages. `ProductUsageViewSet.get_queryset` honours only `visit`,
 * `service`, `product` and `package_sale` (its `date_from`/`date_to` params are ignored), and
 * the API paginates with a fixed page size (`per_page` is ignored) — so the usage tab loads the
 * whole log once and filters (including by date) client-side over complete totals.
 */
export const listAllUsages = async (): Promise<ProductUsage[]> => {
  const rows = await fetchAllPages<RawProductUsage>(endpoints.finance.usages);
  return rows.map(toProductUsage);
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

/** Flatten a per-service `ConsumptionSelection` into the row list for display/tests. */
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
 * Backend contract: POST /finance/visits/:id/record-consumption/
 * body { selected_products: { "<serviceId>": [[productId, "qty"], ...] },
 *        zero_consumption?: { "<serviceId>": "reason" },
 *        extra_products?: [[productId, "qty"], ...] }.
 * Every non-group recipe product of a listed service must carry its actual
 * quantity — the backend 400s when one is missing instead of falling back to
 * the recipe defaults. Selection groups pick exactly one product. A service
 * whose products were all unused goes into `zero_consumption`, not here.
 * Rows with a non-positive quantity are dropped (the backend rejects a 0 in
 * `selected_products`), and Persian digits are folded to Latin so the decimal
 * parses server-side.
 */
export function toSelectedProductsPayload(
  selection: ConsumptionSelection
): Record<string, [number, string][]> {
  const payload: Record<string, [number, string][]> = {};
  for (const [serviceId, rows] of Object.entries(selection)) {
    const typedRows = rows as { product: number; quantity: string }[];
    const pairs = typedRows
      .map((row: { product: number; quantity: string }) => ({
        product: row.product,
        quantity: toLatinDigits(String(row.quantity)).trim(),
      }))
      .filter((row) => row.product > 0 && Number(row.quantity) > 0)
      .map((row) => [row.product, row.quantity] as [number, string]);
    if (pairs.length > 0) payload[String(Number(serviceId))] = pairs;
  }
  return payload;
}

/**
 * `zero_consumption: { "<serviceId>": "reason" }` wire shape — service ids as
 * strings (JSON object keys) and a non-empty reason per service, since the
 * backend 400s on a blank one.
 */
export function toZeroConsumptionPayload(
  zeroConsumption?: Record<number, string>
): Record<string, string> {
  const payload: Record<string, string> = {};
  for (const [serviceId, reason] of Object.entries(zeroConsumption ?? {})) {
    const id = Number(serviceId);
    const trimmed = (reason ?? "").trim();
    if (!Number.isInteger(id) || id <= 0 || trimmed === "") continue;
    payload[String(id)] = trimmed;
  }
  return payload;
}

/**
 * Split per-service recipe rows into what record-consumption must receive:
 * a service with at least one positive quantity keeps only those rows, while a
 * service whose every row is zero (or invalid) becomes `zeroConsumption` so its
 * recipe is still explicitly recorded as unused. Empty services are skipped —
 * without recipe data the caller cannot know whether they need a record at all.
 * Quantities are parsed after folding Persian digits, matching the wire format.
 */
export function splitRecipeRowsByQuantity(
  rowsByService: Record<string, { product: number; quantity: string }[]>,
  zeroReason = "استفاده نشد"
): { selection: ConsumptionSelection; zeroConsumption: Record<number, string> } {
  const selection: ConsumptionSelection = {};
  const zeroConsumption: Record<number, string> = {};
  for (const [serviceId, rows] of Object.entries(rowsByService)) {
    const id = Number(serviceId);
    if (!Number.isInteger(id) || id <= 0 || rows.length === 0) continue;
    const positive = rows.filter((row) => {
      const quantity = Number(toLatinDigits(String(row.quantity)));
      return row.product > 0 && Number.isFinite(quantity) && quantity > 0;
    });
    if (positive.length > 0) selection[id] = positive;
    else zeroConsumption[id] = zeroReason;
  }
  return { selection, zeroConsumption };
}

export interface RecordConsumptionOptions {
  /**
   * Send the request even when nothing else is included. The backend no longer
   * applies recipe defaults for an empty body: a recipe service is only
   * recorded when it appears in `selected_products` with every mandatory
   * quantity, or in `zeroConsumption`. The flag therefore only forces the POST
   * itself — it never substitutes for quantities.
   */
  includeMandatoryOnly?: boolean;
  /**
   * Services explicitly recorded as unused: serviceId → reason. The backend
   * writes quantity-0 usage rows carrying that reason (`ProductUsage.zero_reason`)
   * for every recipe product of the service — the way to say «این خدمت استفاده
   * نشد». Blank reasons are dropped here (the backend rejects them with a 400).
   */
  zeroConsumption?: Record<number, string>;
  /**
   * Billable non-recipe products added to the invoice manually («محصولات این
   * صورتحساب»). The backend deducts their stock and writes a cost snapshot so
   * reports count them — sent as `extra_products: [[productId, "qty"], ...]`.
   */
  extraProducts?: ConsumableSelection[];
}

/** Flatten manual extras into the `[[productId, "qty"], ...]` wire pairs. */
export function toExtraProductsPayload(extraProducts?: ConsumableSelection[]): [number, string][] {
  return (extraProducts ?? [])
    .map((row) => ({ product: row.product, quantity: toLatinDigits(String(row.quantity)).trim() }))
    .filter((row) => row.product > 0 && Number(row.quantity) > 0)
    .map((row) => [row.product, row.quantity] as [number, string]);
}

/**
 * Record the consumables used during a visit (checkout consumption step).
 * Every recipe product's actual quantity must be present in `selection`, or the
 * service must be listed in `options.zeroConsumption` — the backend rejects an
 * omitted recipe product and, per service, refuses to complete the visit until
 * one of the two arrived. Rows with a non-positive quantity never reach the
 * wire, so a fully unused service is only valid through `zeroConsumption`.
 * No-op when the request would record nothing, unless `includeMandatoryOnly`
 * forces the POST.
 */
export const recordConsumption = async (
  visitId: number,
  selection: ConsumptionSelection,
  options?: RecordConsumptionOptions
): Promise<void> => {
  const selectedProducts = toSelectedProductsPayload(selection);
  const extraProducts = toExtraProductsPayload(options?.extraProducts);
  const zeroConsumption = toZeroConsumptionPayload(options?.zeroConsumption);
  // A service marked unused must not also carry quantities — the backend reads
  // zero_consumption for it and would contradict the selection.
  for (const serviceId of Object.keys(zeroConsumption)) delete selectedProducts[serviceId];
  if (
    Object.keys(selectedProducts).length === 0 &&
    Object.keys(zeroConsumption).length === 0 &&
    extraProducts.length === 0 &&
    !options?.includeMandatoryOnly
  ) {
    return;
  }
  await apiClient.post(endpoints.finance.recordConsumption(visitId), {
    selected_products: selectedProducts,
    ...(Object.keys(zeroConsumption).length > 0 ? { zero_consumption: zeroConsumption } : {}),
    ...(extraProducts.length > 0 ? { extra_products: extraProducts } : {}),
  });
};

/**
 * How many consumption rows a visit already has.
 * The backend rejects re-recording a service that already has usage, so
 * checkout needs this to know whether it should record at all or leave an
 * existing record alone.
 */
export const countVisitConsumptions = async (visitId: number): Promise<number> => {
  const { data } = await apiClient.get(endpoints.finance.usages, {
    params: { visit: visitId },
  });
  const payload = data as { count?: number } | null;
  return typeof payload?.count === "number" ? payload.count : 0;
};
