import { endpoints } from "../config/api";
import { apiClient } from "../lib/api-client";
import { extractApiError } from "../lib/api-error";
import { type PaginationParams, toPaginatedResponse, toQueryParams } from "../lib/pagination";
import type { PaginatedResponse } from "../types/api";
import type { Package } from "../types/finance";
import { fetchAllPages } from "./fetch-all-pages";

const DEFAULT_PER_PAGE = 20;

/** Wire shape — camelCased by the api-client response interceptor. Money stays a string. */
type RawPackage = Record<string, unknown> & {
  id: number;
  name?: string;
  description?: string;
  priceUsd?: string;
  isActive?: boolean;
  priceToman?: string | null;
  exchangeRate?: string | null;
  services?: (number | string)[];
  items?: { product: number | string; quantity: string | number }[];
};

type RawPackageService = { id: number; package?: number; service?: number };
type RawPackageItem = { id: number; package?: number; product?: number; quantity?: string };

/** `services` (ids) and `items` (product + quantity) are read-only on the package serializer. */
export const toPackage = (raw: RawPackage): Package => ({
  id: raw.id,
  name: raw.name ?? "",
  description: raw.description ?? "",
  priceUsd: raw.priceUsd ?? "0.00",
  priceToman: raw.priceToman ?? null,
  exchangeRate: raw.exchangeRate ?? null,
  isActive: raw.isActive ?? true,
  services: (raw.services ?? []).map(Number),
  items: (raw.items ?? []).map((item) => ({
    product: Number(item.product),
    quantity: String(item.quantity),
  })),
});

export const listPackages = async (
  params?: PaginationParams
): Promise<PaginatedResponse<Package>> => {
  const page = params?.page ?? 1;
  const perPage = params?.perPage ?? DEFAULT_PER_PAGE;
  const { data } = await apiClient.get(endpoints.packages.list, {
    params: toQueryParams({ ...params, page, perPage }),
  });
  const paginated = toPaginatedResponse<RawPackage>(data as never, page, perPage);
  return { ...paginated, data: paginated.data.map(toPackage) };
};

export const getPackage = async (id: number): Promise<Package> => {
  const { data } = await apiClient.get(endpoints.packages.detail(id));
  return toPackage(data as RawPackage);
};

export const deletePackage = async (id: number): Promise<void> => {
  await apiClient.delete(endpoints.packages.detail(id));
};

export interface PackageInput {
  /** Absent → create, present → full update. */
  id?: number;
  name: string;
  description?: string;
  priceUsd: string;
  isActive?: boolean;
  serviceIds?: number[];
  items?: { product: number; quantity: string }[];
}

const syncPackageServices = async (packageId: number, serviceIds: number[]): Promise<void> => {
  const existing = await fetchAllPages<RawPackageService>(endpoints.packages.services, {
    package: packageId,
  });
  const stored = new Set(existing.map((row) => row.service ?? 0));
  const desired = new Set(serviceIds);

  for (const service of serviceIds) {
    if (!stored.has(service)) {
      await apiClient.post(endpoints.packages.services, { package: packageId, service });
    }
  }

  for (const row of existing) {
    if (row.service !== undefined && !desired.has(row.service)) {
      await apiClient.delete(endpoints.packages.serviceDetail(row.id));
    }
  }
};

const syncPackageItems = async (
  packageId: number,
  items: { product: number; quantity: string }[]
): Promise<void> => {
  const existing = await fetchAllPages<RawPackageItem>(endpoints.packages.items, {
    package: packageId,
  });
  const stored = new Map(existing.map((row) => [row.product ?? 0, row]));
  const desired = new Set(items.map((item) => item.product));

  for (const item of items) {
    const current = stored.get(item.product);
    if (!current) {
      await apiClient.post(endpoints.packages.items, {
        package: packageId,
        product: item.product,
        quantity: item.quantity,
      });
    } else if (current.quantity !== item.quantity) {
      await apiClient.patch(endpoints.packages.itemDetail(current.id), {
        quantity: item.quantity,
      });
    }
  }

  for (const row of existing) {
    if (row.product !== undefined && !desired.has(row.product)) {
      await apiClient.delete(endpoints.packages.itemDetail(row.id));
    }
  }
};

/**
 * Save a package, then reconcile its read-only nested rows sequentially:
 * create/update the package → sync `package-services` → sync `package-items`.
 * Any failure is re-thrown with the backend message so the UI can toast it.
 */
export const savePackage = async (input: PackageInput): Promise<Package> => {
  try {
    const payload = {
      name: input.name,
      description: input.description ?? "",
      priceUsd: input.priceUsd,
      isActive: input.isActive ?? true,
    };
    const { data } = input.id
      ? await apiClient.put(endpoints.packages.detail(input.id), payload)
      : await apiClient.post(endpoints.packages.list, payload);
    const pkg = toPackage(data as RawPackage);

    if (input.serviceIds) await syncPackageServices(pkg.id, input.serviceIds);
    if (input.items) await syncPackageItems(pkg.id, input.items);

    return pkg;
  } catch (error) {
    throw new Error(extractApiError(error), { cause: error });
  }
};
