import { endpoints } from "../config/api";
import { apiClient } from "../lib/api-client";
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
  lastVisitDate?: string;
  visitNumber?: number;
  isNewCustomer?: boolean;
  createdAt?: string;
};

const toStatus = (raw: RawPatient): PatientStatus => {
  if (raw.isNewCustomer) return "new";
  return "active";
};

const toPatient = (raw: RawPatient): Patient => ({
  id: raw.id,
  firstName: raw.firstName ?? "",
  lastName: raw.lastName ?? "",
  mobileNumber: raw.mobileNumber ?? "",
  nationalId: raw.nationalId ?? "",
  bitmojiCode: raw.bitmojiCode ?? "",
  lastVisit: raw.lastVisitDate ?? "",
  visitCount: raw.visitNumber ?? 0,
  status: toStatus(raw),
  createdAt: raw.createdAt ?? "",
  products: [],
  services: [],
});

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

export const createCustomer = (customer: PatientFormData) =>
  apiClient.post(endpoints.customers.list, customer);

export const updateCustomer = (id: number, customer: Partial<PatientFormData>) =>
  apiClient.put(endpoints.customers.detail(id), customer);

export const deleteCustomer = (id: number) => apiClient.delete(endpoints.customers.detail(id));
