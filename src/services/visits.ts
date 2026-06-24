import { endpoints } from "../config/api";
import { apiClient } from "../lib/api-client";
import { type PaginationParams, toPaginatedResponse } from "../lib/pagination";
import type { PaginatedResponse } from "../types/api";
import type { Appointment, ReserveVisitPayload } from "../types/appointment";

type RawAppointment = Record<string, unknown> & {
  id: number;
  customer?: number;
  staff?: number | null;
  services?: number[];
  serviceNames?: string[];
  startAt?: string;
  endAt?: string;
  status?: string;
  notes?: string;
};

function computeDuration(startAt: string, endAt: string): number {
  if (!startAt || !endAt) return 0;
  const start = new Date(startAt.replace(" ", "T"));
  const end = new Date(endAt.replace(" ", "T"));
  const diffMs = end.getTime() - start.getTime();
  return Math.round(diffMs / 60000);
}

function extractDate(dateTime: string): string {
  if (!dateTime) return "";
  return dateTime.split(" ")[0];
}

function extractTime(dateTime: string): string {
  if (!dateTime) return "";
  const parts = dateTime.split(" ");
  if (parts.length < 2) return "";
  return parts[1].slice(0, 5);
}

const toAppointment = (raw: RawAppointment): Appointment => ({
  id: raw.id,
  customer: raw.customer ?? 0,
  customerName: "",
  staff: raw.staff ?? null,
  services: raw.services ?? [],
  serviceNames: raw.serviceNames ?? [],
  startAt: raw.startAt ?? "",
  endAt: raw.endAt ?? "",
  date: extractDate(raw.startAt ?? ""),
  time: extractTime(raw.startAt ?? ""),
  duration: computeDuration(raw.startAt ?? "", raw.endAt ?? ""),
  status: (raw.status as Appointment["status"]) ?? "pending",
  notes: raw.notes ?? "",
  patient: undefined,
  service: undefined,
});

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
  const paginated = toPaginatedResponse<RawAppointment>(data as never, page, perPage);
  return {
    ...paginated,
    data: paginated.data.map(toAppointment),
  };
};

export const getVisit = async (id: number): Promise<Appointment> => {
  const { data } = await apiClient.get(endpoints.visits.detail(id));
  return toAppointment(data as RawAppointment);
};

export const createVisit = (visit: Record<string, unknown>) =>
  apiClient.post(endpoints.visits.list, visit);

export const confirmVisit = (id: number) => apiClient.post(endpoints.visits.confirm(id));

export const completeVisit = (id: number) => apiClient.post(endpoints.visits.complete(id));

export const cancelVisit = (id: number) => apiClient.post(endpoints.visits.cancel(id));

export const reserveVisit = (data: ReserveVisitPayload) =>
  apiClient.post(endpoints.visits.reserve, data);
