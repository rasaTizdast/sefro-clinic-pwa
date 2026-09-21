import { endpoints } from "../config/api";
import { apiClient } from "../lib/api-client";
import { jalaliToShamsiApiDate } from "../lib/date";
import { type PaginationParams, toPaginatedResponse } from "../lib/pagination";
import type { PaginatedResponse } from "../types/api";
import type { Patient, PatientFormData, PatientStatus } from "../types/patient";

type RawPatient = Record<string, unknown> & {
  id: number;
  firstName?: string;
  lastName?: string;
  mobileNumber?: string;
  nationalId?: string;
  bitmojiCode?: string;
  satisfaction?: number;
  notes?: string;
  lastVisitDate?: string;
  visitNumber?: number;
  isNewCustomer?: boolean;
  isLoyalCustomer?: boolean;
  totalPayments?: number;
  createdAt?: string;
  birthday?: string | null;
  fileSysId?: string | null;
  file_sys_id?: string | null;
};

const toStatus = (raw: RawPatient): PatientStatus => {
  if (raw.isNewCustomer) return "new";
  if (raw.isLoyalCustomer) return "loyal";
  const visitCount = raw.visitNumber ?? 0;
  if (visitCount === 0) return "inactive";
  return "active";
};

const toPatient = (raw: RawPatient): Patient => ({
  id: raw.id,
  firstName: raw.firstName ?? "",
  lastName: raw.lastName ?? "",
  mobileNumber: raw.mobileNumber ?? "",
  nationalId: raw.nationalId ?? "",
  bitmojiCode: raw.bitmojiCode ?? "",
  satisfaction: raw.satisfaction ?? 0,
  notes: raw.notes ?? "",
  lastVisit: raw.lastVisitDate ?? "",
  visitCount: raw.visitNumber ?? 0,
  status: toStatus(raw),
  isNewCustomer: raw.isNewCustomer ?? false,
  isLoyalCustomer: raw.isLoyalCustomer ?? false,
  totalPayments: Number(raw.totalPayments) || 0,
  createdAt: raw.createdAt ?? "",
  birthday: raw.birthday ?? null,
  fileSysId: raw.fileSysId ?? raw.file_sys_id ?? null,
});

/** Picker dates (`YYYY/MM/DD`) become Shamsi API dates (`YYYY-MM-DD`); cleared → null. */
const toCustomerPayload = (
  data: PatientFormData | Partial<PatientFormData>
): Record<string, unknown> => {
  const payload: Record<string, unknown> = { ...data };
  if (payload.birthday !== undefined) {
    const raw = String(payload.birthday ?? "").trim();
    payload.birthday = raw ? jalaliToShamsiApiDate(raw) : null;
  }
  return payload;
};

export const listCustomers = async (
  params?: PaginationParams
): Promise<PaginatedResponse<Patient>> => {
  const page = params?.page ?? 1;
  const perPage = params?.perPage ?? 20;
  const { data } = await apiClient.get(endpoints.customers.list, {
    params: {
      page,
      per_page: perPage,
      search: params?.search,
      ordering: params?.sort ? `${params.order === "desc" ? "-" : ""}${params.sort}` : undefined,
    },
  });
  const paginated = toPaginatedResponse<RawPatient>(data as never, page, perPage);
  return {
    ...paginated,
    data: paginated.data.map(toPatient),
  };
};

export const getCustomer = async (id: number): Promise<Patient> => {
  const { data } = await apiClient.get(endpoints.customers.detail(id));
  return toPatient(data as RawPatient);
};

export const createCustomer = (customer: PatientFormData) => {
  const payload = toCustomerPayload(customer);
  if (!payload.bitmojiCode) delete payload.bitmojiCode;
  return apiClient.post(endpoints.customers.list, payload);
};

export const updateCustomer = (id: number, customer: Partial<PatientFormData>) =>
  apiClient.put(endpoints.customers.detail(id), toCustomerPayload(customer));

export const deleteCustomer = (id: number) => apiClient.delete(endpoints.customers.detail(id));
