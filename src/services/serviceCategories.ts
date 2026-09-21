import { endpoints } from "../config/api";
import { apiClient } from "../lib/api-client";
import { extractApiError } from "../lib/api-error";
import type { ServiceCategory } from "../types/finance";
import { fetchAllPages } from "./fetch-all-pages";

/** Wire shape — camelCased by the api-client response interceptor. */
type RawServiceCategory = Record<string, unknown> & {
  id: number;
  name?: string;
  slug?: string;
  description?: string;
  isActive?: boolean;
  sortOrder?: number;
};

export type ServiceCategoryPayload = {
  name: string;
  slug?: string;
  description?: string;
  isActive?: boolean;
  sortOrder?: number;
};

export const toCategory = (raw: RawServiceCategory): ServiceCategory => ({
  id: raw.id,
  name: raw.name ?? "",
  slug: raw.slug ?? "",
  description: raw.description ?? "",
  isActive: raw.isActive ?? true,
  sortOrder: raw.sortOrder ?? 0,
});

/** The category list is paginated (20/page) — callers always get the full, ordered list. */
export const listCategories = async (): Promise<ServiceCategory[]> => {
  const rows = await fetchAllPages<RawServiceCategory>(endpoints.serviceCategories.list);
  return rows.map(toCategory);
};

export const createCategory = async (payload: ServiceCategoryPayload): Promise<ServiceCategory> => {
  const { data } = await apiClient.post(endpoints.serviceCategories.list, payload);
  return toCategory(data as RawServiceCategory);
};

export const updateCategory = async (
  id: number,
  payload: ServiceCategoryPayload
): Promise<ServiceCategory> => {
  const { data } = await apiClient.put(endpoints.serviceCategories.detail(id), payload);
  return toCategory(data as RawServiceCategory);
};

/** A category that still has services is rejected with a 400 — surface that message. */
export const deleteCategory = async (id: number): Promise<void> => {
  try {
    await apiClient.delete(endpoints.serviceCategories.detail(id));
  } catch (error) {
    throw new Error(extractApiError(error), { cause: error });
  }
};
