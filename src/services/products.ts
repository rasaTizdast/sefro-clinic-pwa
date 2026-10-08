import { endpoints } from "../config/api";
import { apiClient } from "../lib/api-client";
import { type PaginationParams, SERVER_PAGE_SIZE, toPaginatedResponse } from "../lib/pagination";
import type { PaginatedResponse } from "../types/api";
import type { ProductStatus, WarehouseItem } from "../types/warehouse";
import { fetchAllPages } from "./fetch-all-pages";

type RawProduct = Record<string, unknown> & {
  id: number;
  name?: string;
  count?: number;
  unit?: string;
  unitPrice?: string;
  description?: string;
  status?: string;
  costUsd?: string | null;
};

const toWarehouseItem = (raw: RawProduct): WarehouseItem => ({
  id: raw.id,
  name: raw.name ?? "",
  stock: raw.count ?? 0,
  unit: raw.unit ?? "",
  unitPrice: raw.unitPrice ?? "0",
  unitPriceUsd: raw.costUsd ?? null,
  description: raw.description ?? "",
  status: (raw.status as ProductStatus) ?? "available",
  costUsd: raw.costUsd ?? null,
});

const toBackendPayload = (data: Record<string, unknown>) => {
  // unitPriceUsd (warehouse form) and costUsd (service callers) both map to cost_usd
  const usd = data.unitPriceUsd !== undefined ? data.unitPriceUsd : data.costUsd;
  return {
    name: data.name,
    count: Number(data.stock) || 0,
    unit: data.unit ?? "",
    unit_price: data.unitPrice ? Number(data.unitPrice) : 0,
    description: data.description ?? "",
    // cost_usd is only sent when the caller provides a USD value (else the backend keeps it)
    ...(usd !== undefined && usd !== null && usd !== "" ? { cost_usd: usd } : {}),
  };
};

export const listProducts = async (
  params?: PaginationParams
): Promise<PaginatedResponse<WarehouseItem>> => {
  const page = params?.page ?? 1;
  const perPage = params?.perPage ?? SERVER_PAGE_SIZE;
  const { data } = await apiClient.get(endpoints.products.list, {
    params: {
      page,
      per_page: perPage,
      search: params?.search,
      ordering: params?.sort ? `${params.order === "desc" ? "-" : ""}${params.sort}` : undefined,
    },
  });
  const paginated = toPaginatedResponse<RawProduct>(data as never, page, perPage);
  return {
    ...paginated,
    data: paginated.data.map(toWarehouseItem),
  };
};

export const getProduct = async (id: number): Promise<WarehouseItem> => {
  const { data } = await apiClient.get(endpoints.products.detail(id));
  return toWarehouseItem(data as RawProduct);
};

export const createProduct = async (product: Record<string, unknown>) => {
  const payload = toBackendPayload(product);
  const { data } = await apiClient.post(endpoints.products.list, payload);
  return toWarehouseItem(data as RawProduct);
};

export const updateProduct = async (id: number, product: Record<string, unknown>) => {
  const payload = toBackendPayload(product);
  const { data } = await apiClient.put(endpoints.products.detail(id), payload);
  return toWarehouseItem(data as RawProduct);
};

/**
 * Partial update — only the fields you pass are sent (PATCH), so model-default
 * fields the payload omits (status, cost_usd, …) are left untouched by DRF.
 * Keys may be camelCase; the api-client request interceptor snake_cases them.
 */
export const patchProduct = async (id: number, data: Record<string, unknown>) => {
  const { data: raw } = await apiClient.patch(endpoints.products.detail(id), data);
  return toWarehouseItem(raw as RawProduct);
};

/**
 * Every product across all pages. The products endpoint uses DRF's default
 * PageNumberPagination (fixed page size, `per_page` ignored), so callers that
 * need the full catalog must walk the pages.
 */
export const listAllProducts = async (): Promise<WarehouseItem[]> => {
  const rows = await fetchAllPages<RawProduct>(endpoints.products.list);
  return rows.map(toWarehouseItem);
};

export const deleteProduct = (id: number) => apiClient.delete(endpoints.products.detail(id));
