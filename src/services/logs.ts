import { endpoints } from "../config/api";
import { apiClient } from "../lib/api-client";
import { type PaginationParams, toPaginatedResponse } from "../lib/pagination";
import type { PaginatedResponse } from "../types/api";

export interface AuditLog {
  id: number;
  user: number;
  username: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  modelName: string;
  objectId: number | null;
  objectRepr: string;
  changes: Record<string, unknown> | null;
  timestamp: string;
}

export const listLogs = async (
  params?: PaginationParams & { search?: string }
): Promise<PaginatedResponse<AuditLog>> => {
  const page = params?.page ?? 1;
  const perPage = params?.perPage ?? 30;
  const { data } = await apiClient.get(endpoints.logs.list, {
    params: {
      page,
      per_page: perPage,
      search: params?.search,
    },
  });
  return toPaginatedResponse<AuditLog>(data as never, page, perPage);
};

export const getLog = async (id: number): Promise<AuditLog> => {
  const { data } = await apiClient.get(endpoints.logs.detail(id));
  return data as AuditLog;
};
