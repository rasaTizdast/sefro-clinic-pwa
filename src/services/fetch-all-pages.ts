import { apiClient } from "../lib/api-client";
import type { DrfPaginatedResponse } from "../types/api";

/** Page size used when a caller needs a *whole* list; every page is followed until `next` is null. */
export const ALL_PER_PAGE = 100;

export interface FetchAllPagesOptions {
  /**
   * Per-page request timeout override in ms. The global axios timeout (10 s) aborts
   * endpoints that are legitimately slower than that; pass a higher budget here
   * instead of raising the timeout for every request in the app.
   */
  timeoutMs?: number;
}

/**
 * GET every page of a DRF list endpoint and return the raw rows.
 * Handles both paginated payloads (`{ count, next, results }`) and plain arrays.
 */
export async function fetchAllPages<T>(
  url: string,
  params: Record<string, string | number | boolean> = {},
  options: FetchAllPagesOptions = {}
): Promise<T[]> {
  const rows: T[] = [];
  let page = 1;

  for (;;) {
    const { data } = await apiClient.get(url, {
      params: { ...params, page, per_page: ALL_PER_PAGE },
      ...(options.timeoutMs != null ? { timeout: options.timeoutMs } : {}),
    });
    if (Array.isArray(data)) return [...rows, ...(data as T[])];

    const payload = data as DrfPaginatedResponse<T>;
    rows.push(...(payload.results ?? []));
    if (!payload.next) return rows;
    page += 1;
  }
}
