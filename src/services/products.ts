import { endpoints } from "../config/api";
import { apiClient } from "../lib/api-client";
import { type PaginationParams, toPaginatedResponse } from "../lib/pagination";
import type { PaginatedResponse } from "../types/api";
import type { ProductStatus, WarehouseItem } from "../types/warehouse";

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
  description: raw.description ?? "",
  status: (raw.status as ProductStatus) ?? "available",
  costUsd: raw.costUsd ?? null,
});

const toBackendPayload = (data: Record<string, unknown>) => ({
  name: data.name,
  count: Number(data.stock) || 0,
  unit: data.unit ?? "",
  unit_price: data.unitPrice ? Number(data.unitPrice) : 0,
  description: data.description ?? "",
  // cost_usd is only sent when the caller converted a Toman cost (else the backend keeps it)
  ...(data.costUsd !== undefined ? { cost_usd: data.costUsd } : {}),
});

export const listProducts = async (
  params?: PaginationParams
): Promise<PaginatedResponse<WarehouseItem>> => {
  const page = params?.page ?? 1;
  const perPage = params?.perPage ?? 20;
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

export const deleteProduct = (id: number) => apiClient.delete(endpoints.products.detail(id));
