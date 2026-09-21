import { endpoints } from "../config/api";
import { apiClient } from "../lib/api-client";
import { type PaginationParams, toPaginatedResponse } from "../lib/pagination";
import type { PaginatedResponse } from "../types/api";
import type { CompensationRole, ServiceCategory } from "../types/finance";
import type { Service, ServiceConsumable } from "../types/service";

type RawServiceConsumable = {
  product?: number;
  name?: string;
  quantity?: string;
  unitCostUsd?: string;
  totalCostUsd?: string;
};

type RawServiceCategory = {
  id: number;
  name?: string;
  slug?: string;
  description?: string;
  isActive?: boolean;
  sortOrder?: number;
};

type RawService = Record<string, unknown> & {
  id: number;
  name?: string;
  time?: number;
  price?: string;
  description?: string;
  isActive?: boolean;
  priceUsd?: string;
  priceToman?: string | null;
  exchangeRate?: string | null;
  category?: RawServiceCategory | null;
  compensationRole?: CompensationRole;
  products?: RawServiceConsumable[];
  estimatedCostUsd?: string;
  estimatedCostToman?: string | null;
  estimatedGrossProfitUsd?: string;
  estimatedGrossProfitToman?: string | null;
  estimatedMarginPercent?: string;
};

const USD = "0.00";

const toCategory = (raw: RawServiceCategory | null | undefined): ServiceCategory | null =>
  raw == null
    ? null
    : {
        id: raw.id,
        name: raw.name ?? "",
        slug: raw.slug ?? "",
        description: raw.description ?? "",
        isActive: raw.isActive ?? true,
        sortOrder: raw.sortOrder ?? 0,
      };

const toConsumable = (raw: RawServiceConsumable): ServiceConsumable => ({
  product: raw.product ?? 0,
  name: raw.name ?? "",
  quantity: raw.quantity ?? "0.000",
  unitCostUsd: raw.unitCostUsd ?? USD,
  totalCostUsd: raw.totalCostUsd ?? USD,
});

const toService = (raw: RawService): Service => ({
  id: raw.id,
  title: raw.name ?? "",
  duration: raw.time ?? 0,
  price: Number(raw.price) || 0,
  description: raw.description ?? "",
  isActive: raw.isActive ?? true,
  priceUsd: raw.priceUsd ?? USD,
  priceToman: raw.priceToman ?? null,
  exchangeRate: raw.exchangeRate ?? null,
  category: toCategory(raw.category),
  compensationRole: raw.compensationRole ?? "none",
  products: (raw.products ?? []).map(toConsumable),
  estimatedCostUsd: raw.estimatedCostUsd ?? USD,
  estimatedCostToman: raw.estimatedCostToman ?? null,
  estimatedGrossProfitUsd: raw.estimatedGrossProfitUsd ?? USD,
  estimatedGrossProfitToman: raw.estimatedGrossProfitToman ?? null,
  estimatedMarginPercent: raw.estimatedMarginPercent ?? "0",
});

const toBackendPayload = (data: Record<string, unknown>) => ({
  name: data.title,
  time: data.duration ? Number(data.duration) : 0,
  price: data.price ? Number(data.price) : 0,
  // USD pricing converted from the Toman input; the backend derives price_toman from it
  price_usd: data.priceUsd ?? null,
  category_id: data.categoryId ?? null,
  compensation_role: data.compensationRole ?? "none",
  description: data.description ?? "",
  is_active: data.isActive ?? true,
});

export const listServices = async (
  params?: PaginationParams
): Promise<PaginatedResponse<Service>> => {
  const page = params?.page ?? 1;
  const perPage = params?.perPage ?? 20;
  const { data } = await apiClient.get(endpoints.services.list, {
    params: { page, per_page: perPage, search: params?.search },
  });
  const paginated = toPaginatedResponse<RawService>(data as never, page, perPage);
  return {
    ...paginated,
    data: paginated.data.map(toService),
  };
};

export const getService = async (id: number): Promise<Service> => {
  const { data } = await apiClient.get(endpoints.services.detail(id));
  return toService(data as RawService);
};

export const createService = async (service: Record<string, unknown>) => {
  const payload = toBackendPayload(service);
  const { data } = await apiClient.post(endpoints.services.list, payload);
  return toService(data as RawService);
};

export const updateService = async (id: number, service: Record<string, unknown>) => {
  const payload = toBackendPayload(service);
  const { data } = await apiClient.put(endpoints.services.detail(id), payload);
  return toService(data as RawService);
};

export const deleteService = (id: number) => apiClient.delete(endpoints.services.detail(id));
