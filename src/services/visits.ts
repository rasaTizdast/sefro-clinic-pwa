import { endpoints } from "../config/api";
import { apiClient } from "../lib/api-client";
import { apiDateTimeToMillis } from "../lib/date";
import { type PaginationParams, toPaginatedResponse } from "../lib/pagination";
import type { PaginatedResponse } from "../types/api";
import type {
  Appointment,
  ReserveVisitPayload,
  UpdateVisitPayload,
  VisitOperator,
} from "../types/appointment";
import type { CompensationRole } from "../types/finance";
import { fetchAllPages } from "./fetch-all-pages";

type RawAppointment = Record<string, unknown> & {
  id: number;
  customer?: number;
  staff?: number | null;
  services?: number[];
  serviceNames?: string[];
  operators?: unknown;
  startAt?: string;
  endAt?: string;
  status?: string;
  notes?: string;
};

const COMPENSATION_ROLES: readonly CompensationRole[] = ["none", "doctor", "facial", "laser"];

/**
 * Defensive parse of the serializer's read-only `operators` rows (already
 * camelCased by the api-client: `service_name` → `serviceName`, etc.).
 * Rows without a numeric `service` are dropped; unknown roles degrade to
 * `none` so a future backend role never blanks the whole list.
 */
function toVisitOperators(raw: unknown): VisitOperator[] {
  if (!Array.isArray(raw)) return [];
  const rows: VisitOperator[] = [];
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) continue;
    const row = entry as Record<string, unknown>;
    if (typeof row.service !== "number") continue;
    rows.push({
      service: row.service,
      serviceName: typeof row.serviceName === "string" ? row.serviceName : "",
      staff: typeof row.staff === "number" ? row.staff : null,
      staffName: typeof row.staffName === "string" ? row.staffName : null,
      compensationRole: COMPENSATION_ROLES.includes(row.compensationRole as CompensationRole)
        ? (row.compensationRole as CompensationRole)
        : "none",
    });
  }
  return rows;
}

function computeDuration(startAt: string, endAt: string): number {
  if (!startAt || !endAt) return 0;
  // API datetimes are Shamsi ("1405-07-25 18:11") — a native Date parse is NaN.
  const start = apiDateTimeToMillis(startAt);
  const end = apiDateTimeToMillis(endAt);
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.round((end - start) / 60000);
}

function extractDate(dateTime: string): string {
  if (!dateTime) return "";
  const datePart = dateTime.split(" ")[0];
  const parts = datePart.split("-").map(Number);
  if (parts.length !== 3) return datePart;
  return `${parts[0]}/${parts[1]}/${parts[2]}`;
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
  customerName: (raw.customerName as string) ?? "",
  customerMobile: (raw.customerMobile as string) ?? "",
  staff: raw.staff ?? null,
  services: raw.services ?? [],
  serviceNames: raw.serviceNames ?? [],
  operators: toVisitOperators(raw.operators),
  startAt: raw.startAt ?? "",
  endAt: raw.endAt ?? "",
  date: extractDate(raw.startAt ?? ""),
  time: extractTime(raw.startAt ?? ""),
  duration: computeDuration(raw.startAt ?? "", raw.endAt ?? ""),
  status: (raw.status as Appointment["status"]) ?? "pending",
  notes: raw.notes ?? "",
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
  const requestParams = { page, per_page: perPage, ...params };
  const { data } = await apiClient.get(endpoints.visits.list, {
    params: requestParams,
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

export type ListAllVisitsParams = {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  month?: number;
  year?: number;
};

/**
 * Every visit matching the filters, across all pages — the visits endpoint
 * ignores `per_page`, so a single large request still returns 20 rows.
 */
export const listAllVisits = async (params?: ListAllVisitsParams): Promise<Appointment[]> => {
  const query: Record<string, string | number> = {};
  if (params?.status) query.status = params.status;
  if (params?.dateFrom) query.dateFrom = params.dateFrom;
  if (params?.dateTo) query.dateTo = params.dateTo;
  if (params?.month != null) query.month = params.month;
  if (params?.year != null) query.year = params.year;
  const rows = await fetchAllPages<RawAppointment>(endpoints.visits.list, query);
  return rows.map(toAppointment);
};

export const confirmVisit = (id: number) => apiClient.post(endpoints.visits.confirm(id));

export const completeVisit = (id: number) => apiClient.post(endpoints.visits.complete(id));

export const cancelVisit = (id: number) => apiClient.post(endpoints.visits.cancel(id));

export const reserveVisit = (data: ReserveVisitPayload) => {
  return apiClient.post(endpoints.visits.reserve, data).then((res) => {
    return res;
  });
};

export const updateVisit = (id: number, data: UpdateVisitPayload) =>
  apiClient.patch(endpoints.visits.detail(id), data);

export const deleteVisit = (id: number) => apiClient.delete(endpoints.visits.detail(id));
