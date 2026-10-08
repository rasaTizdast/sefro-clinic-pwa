import type { DrfPaginatedResponse, PaginatedRequest, PaginatedResponse } from "../types/api";

export type PaginationParams = Pick<
  PaginatedRequest,
  "page" | "perPage" | "search" | "sort" | "order"
>;

/**
 * Page size every backend list endpoint actually uses. DRF's global
 * `PageNumberPagination` (PAGE_SIZE = 20) does not expose `page_size_query_param`,
 * so requests for any other `per_page` are ignored and pages always break on 20.
 * Deriving `totalPages` from the requested `perPage` would advertise pages the
 * server 404s on ("Invalid page."), which blanked the warehouse table.
 */
export const SERVER_PAGE_SIZE = 20;

export const toPaginatedResponse = <T>(
  drf: DrfPaginatedResponse<T>,
  page: number,
  perPage: number
): PaginatedResponse<T> => {
  const totalPages = Math.ceil(drf.count / SERVER_PAGE_SIZE) || 1;
  return {
    data: drf.results,
    total: drf.count,
    page,
    perPage,
    totalPages,
    hasNext: !!drf.next,
    hasPrev: !!drf.previous,
  };
};

export const toQueryParams = (params?: PaginationParams): Record<string, string | number> => {
  const query: Record<string, string | number> = {};
  if (params?.page) query.page = params.page;
  if (params?.perPage) query.per_page = params.perPage;
  if (params?.search) query.search = params.search;
  if (params?.sort) {
    const prefix = params.order === "desc" ? "-" : "";
    query.ordering = `${prefix}${params.sort}`;
  }
  return query;
};
