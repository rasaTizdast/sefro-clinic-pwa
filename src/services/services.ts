import { endpoints } from "../config/api";
import { apiClient } from "../lib/api-client";
import { type PaginationParams, toPaginatedResponse } from "../lib/pagination";
import type { PaginatedResponse } from "../types/api";
import type { Service } from "../types/service";

type RawService = Record<string, unknown> & {
  id: number;
  name?: string;
  time?: number;
  price?: string;
  description?: string;
  isActive?: boolean;
};

const toService = (raw: RawService): Service => ({
  id: raw.id,
  title: raw.name ?? "",
  category: "",
  duration: raw.time ?? 0,
  price: Number(raw.price) || 0,
  description: raw.description ?? "",
  isActive: raw.isActive ?? true,
});

const toBackendPayload = (data: Record<string, unknown>) => ({
  name: data.title,
  time: data.duration ? Number(data.duration) : 0,
  price: data.price ? Number(data.price) : 0,
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
