import { endpoints } from "../config/api";
import { apiClient } from "../lib/api-client";
import { type PaginationParams, toPaginatedResponse } from "../lib/pagination";
import type { PaginatedResponse } from "../types/api";
import type { Appointment } from "../types/appointment";

export const listVisits = async (
  params?: PaginationParams & {
    dateFrom?: string;
    dateTo?: string;
    month?: number;
    year?: number;
    status?: string;
  }
): Promise<PaginatedResponse<Appointment>> => {
  const page = params?.page ?? 1;
  const perPage = params?.perPage ?? 50;
  const { data } = await apiClient.get(endpoints.visits.list, {
    params: { page, per_page: perPage, ...params },
  });
  return toPaginatedResponse<Appointment>(data as never, page, perPage);
};

export const getVisit = async (id: number): Promise<Appointment> => {
  const { data } = await apiClient.get(endpoints.visits.detail(id));
  return data as unknown as Appointment;
};

export const createVisit = (visit: Record<string, unknown>) =>
  apiClient.post(endpoints.visits.list, visit);

export const confirmVisit = (id: number) => apiClient.post(endpoints.visits.confirm(id));

export const completeVisit = (id: number) => apiClient.post(endpoints.visits.complete(id));

export const cancelVisit = (id: number) => apiClient.post(endpoints.visits.cancel(id));

export const reserveVisit = (data: Record<string, unknown>) =>
  apiClient.post(endpoints.visits.reserve, data);
