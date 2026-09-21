import { endpoints } from "../config/api";
import { apiClient } from "../lib/api-client";
import type { ServiceItem } from "../types/finance";
import { fetchAllPages } from "./fetch-all-pages";

/** Wire shape — camelCased by the api-client response interceptor. Quantity stays a string. */
type RawServiceItem = Record<string, unknown> & {
  id: number;
  service?: number;
  product?: number;
  productName?: string;
  quantity?: string;
};

export type ServiceItemInput = { product: number; quantity: string };

export const toServiceItem = (raw: RawServiceItem): ServiceItem => ({
  id: raw.id,
  service: raw.service ?? 0,
  product: raw.product ?? 0,
  productName: raw.productName ?? "",
  quantity: raw.quantity ?? "0.00",
});

/** Every consumable row attached to a service (follows pagination). */
export const listServiceItems = async (serviceId: number): Promise<ServiceItem[]> => {
  const rows = await fetchAllPages<RawServiceItem>(endpoints.finance.serviceItems, {
    service: serviceId,
  });
  return rows.map(toServiceItem);
};

/**
 * Make the stored consumables match `items` exactly: POST the new products, PATCH the changed
 * quantities, DELETE the rows that are no longer selected, then return the refreshed list.
 */
export const syncServiceItems = async (
  serviceId: number,
  items: ServiceItemInput[]
): Promise<ServiceItem[]> => {
  const existing = await listServiceItems(serviceId);
  const desired = new Set(items.map((item) => item.product));

  for (const item of items) {
    const current = existing.find((row) => row.product === item.product);
    if (!current) {
      await apiClient.post(endpoints.finance.serviceItems, {
        service: serviceId,
        product: item.product,
        quantity: item.quantity,
      });
    } else if (current.quantity !== item.quantity) {
      await apiClient.patch(endpoints.finance.serviceItemDetail(current.id), {
        quantity: item.quantity,
      });
    }
  }

  for (const stale of existing) {
    if (!desired.has(stale.product)) {
      await apiClient.delete(endpoints.finance.serviceItemDetail(stale.id));
    }
  }

  return listServiceItems(serviceId);
};
