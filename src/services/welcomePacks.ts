import { endpoints } from "../config/api";
import { apiClient } from "../lib/api-client";
import { type PaginationParams, toPaginatedResponse, toQueryParams } from "../lib/pagination";
import type { PaginatedResponse } from "../types/api";
import type {
  IssueWelcomePackInput,
  ReportPeriod,
  WelcomePack,
  WelcomePackItem,
  WelcomePackReport,
  WelcomePackUsage,
} from "../types/finance";
import { fetchAllPages } from "./fetch-all-pages";

const DEFAULT_PER_PAGE = 20;

type RawWelcomePackItem = Record<string, unknown> & {
  id: number;
  welcomePack?: number;
  product?: number;
  productName?: string;
  quantity?: string;
  createdAt?: string;
  updatedAt?: string;
};

type RawWelcomePack = Record<string, unknown> & {
  id: number;
  name?: string;
  description?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: number | null;
  createdByName?: string | null;
  totalCostUsd?: string;
  totalCostToman?: string | null;
  exchangeRate?: string | null;
  items?: RawWelcomePackItem[];
};

type RawWelcomePackUsage = Record<string, unknown> & {
  id: number;
  welcomePack?: number;
  welcomePackName?: string;
  customer?: number;
  customerName?: string | null;
  visit?: number | null;
  issuedBy?: number | null;
  issuedByName?: string | null;
  quantity?: string;
  totalCostUsdSnapshot?: string;
  exchangeRateSnapshot?: string;
  totalCostTomanSnapshot?: string;
  issuedAt?: string;
  createdAt?: string;
};

export const toWelcomePackItem = (raw: RawWelcomePackItem): WelcomePackItem => ({
  id: raw.id,
  welcomePack: raw.welcomePack ?? 0,
  product: raw.product ?? 0,
  productName: raw.productName ?? "",
  quantity: raw.quantity ?? "0.000",
  createdAt: raw.createdAt ?? "",
  updatedAt: raw.updatedAt ?? "",
});

export const toWelcomePack = (raw: RawWelcomePack): WelcomePack => ({
  id: raw.id,
  name: raw.name ?? "",
  description: raw.description ?? "",
  isActive: raw.isActive ?? true,
  createdAt: raw.createdAt ?? "",
  updatedAt: raw.updatedAt ?? "",
  createdBy: raw.createdBy ?? null,
  createdByName: raw.createdByName ?? null,
  totalCostUsd: raw.totalCostUsd ?? "0.00",
  totalCostToman: raw.totalCostToman ?? null,
  exchangeRate: raw.exchangeRate ?? null,
  items: (raw.items ?? []).map(toWelcomePackItem),
});

export const toWelcomePackUsage = (raw: RawWelcomePackUsage): WelcomePackUsage => ({
  id: raw.id,
  welcomePack: raw.welcomePack ?? 0,
  welcomePackName: raw.welcomePackName ?? "",
  customer: raw.customer ?? 0,
  customerName: raw.customerName ?? null,
  visit: raw.visit ?? null,
  issuedBy: raw.issuedBy ?? null,
  issuedByName: raw.issuedByName ?? null,
  quantity: raw.quantity ?? "1.000",
  totalCostUsdSnapshot: raw.totalCostUsdSnapshot ?? "0.00",
  exchangeRateSnapshot: raw.exchangeRateSnapshot ?? "",
  totalCostTomanSnapshot: raw.totalCostTomanSnapshot ?? "0",
  issuedAt: raw.issuedAt ?? "",
  createdAt: raw.createdAt ?? "",
});

export type WelcomePacksListParams = PaginationParams & {
  search?: string;
  isActive?: boolean;
};

export const listWelcomePacks = async (
  params?: WelcomePacksListParams
): Promise<PaginatedResponse<WelcomePack>> => {
  const page = params?.page ?? 1;
  const perPage = params?.perPage ?? DEFAULT_PER_PAGE;
  const query: Record<string, string | number | boolean> = toQueryParams({
    ...params,
    page,
    perPage,
  }) as Record<string, string | number | boolean>;
  if (params?.isActive !== undefined) query.is_active = params.isActive;
  const { data } = await apiClient.get(endpoints.finance.welcomePacks, { params: query });
  const paginated = toPaginatedResponse<RawWelcomePack>(data as never, page, perPage);
  return { ...paginated, data: paginated.data.map(toWelcomePack) };
};

export const getWelcomePack = async (id: number): Promise<WelcomePack> => {
  const { data } = await apiClient.get(endpoints.finance.welcomePackDetail(id));
  return toWelcomePack(data as RawWelcomePack);
};

/** Every welcome pack matching the filters, across all pages. */
export const listAllWelcomePacks = async (
  params?: Omit<WelcomePacksListParams, "page" | "perPage">
): Promise<WelcomePack[]> => {
  const query: Record<string, string | number | boolean> = {};
  if (params?.search) query.search = params.search;
  if (params?.isActive !== undefined) query.is_active = params.isActive;
  const rows = await fetchAllPages<RawWelcomePack>(endpoints.finance.welcomePacks, query);
  return rows.map(toWelcomePack);
};

export type WelcomePackUsagesListParams = PaginationParams & {
  welcomePack?: number;
  customer?: number;
  visit?: number;
};

export const listWelcomePackUsages = async (
  params?: WelcomePackUsagesListParams
): Promise<PaginatedResponse<WelcomePackUsage>> => {
  const page = params?.page ?? 1;
  const perPage = params?.perPage ?? DEFAULT_PER_PAGE;
  const query: Record<string, string | number> = toQueryParams({ ...params, page, perPage });
  if (params?.welcomePack !== undefined) query.welcome_pack = params.welcomePack;
  if (params?.customer !== undefined) query.customer = params.customer;
  if (params?.visit !== undefined) query.visit = params.visit;
  const { data } = await apiClient.get(endpoints.finance.welcomePackUsages, { params: query });
  const paginated = toPaginatedResponse<RawWelcomePackUsage>(data as never, page, perPage);
  return { ...paginated, data: paginated.data.map(toWelcomePackUsage) };
};

/**
 * Issue a welcome pack to a customer (the only financial event for packs).
 * Creating/selecting a pack definition never creates a transaction by itself.
 */
export const issueWelcomePack = async (input: IssueWelcomePackInput): Promise<WelcomePackUsage> => {
  const { data } = await apiClient.post(endpoints.finance.welcomePackIssue(input.packId), {
    customer: input.customer,
    quantity: input.quantity ?? "1",
    ...(input.visit != null ? { visit: input.visit } : {}),
  });
  return toWelcomePackUsage(data as RawWelcomePackUsage);
};

export interface WelcomePackItemInput {
  product: number;
  quantity: string;
}

export interface WelcomePackInput {
  /** Absent → create, present → full update. Items go nested in the same request. */
  id?: number;
  name: string;
  description?: string;
  isActive?: boolean;
  items: WelcomePackItemInput[];
}

/**
 * Save a welcome-pack definition WITH its items in a single request to the
 * backend welcome-pack API (`POST/PUT /finance/welcome-packs/` with nested
 * `items`). The backend creates/updates everything atomically server-side.
 * This never creates a financial transaction — only `issue` does.
 */
export const saveWelcomePack = async (input: WelcomePackInput): Promise<WelcomePack> => {
  const payload = {
    name: input.name,
    description: input.description ?? "",
    isActive: input.isActive ?? true,
    items: input.items.map((item) => ({
      product: item.product,
      quantity: item.quantity,
    })),
  };
  const { data } =
    input.id == null
      ? await apiClient.post(endpoints.finance.welcomePacks, payload)
      : await apiClient.put(endpoints.finance.welcomePackDetail(input.id), payload);
  return toWelcomePack(data as RawWelcomePack);
};

export const deleteWelcomePack = async (id: number): Promise<void> => {
  await apiClient.delete(endpoints.finance.welcomePackDetail(id));
};

type RawWelcomePackReport = Record<string, unknown> & {
  period?: { start?: string; end?: string };
  totalUsageCount?: number;
  totalPacksIssued?: string;
  totalCostUsd?: string;
  totalCostToman?: string;
  byPack?: {
    welcomePackId?: number;
    // The backend groups on `welcome_pack__name`; the camelCase transform leaves
    // the double underscore half-converted, so both spellings are accepted here.
    welcomePackName?: string;
    welcomePack_Name?: string;
    count?: number;
    usageCount?: number;
    costUsd?: string;
    costToman?: string;
  }[];
};

export const toWelcomePackReport = (raw: RawWelcomePackReport): WelcomePackReport => ({
  period: { start: raw.period?.start ?? "", end: raw.period?.end ?? "" },
  totalUsageCount: raw.totalUsageCount ?? 0,
  totalPacksIssued: raw.totalPacksIssued ?? "0",
  totalCostUsd: raw.totalCostUsd ?? "0.00",
  totalCostToman: raw.totalCostToman ?? "0",
  byPack: (raw.byPack ?? []).map((row) => ({
    welcomePackId: row.welcomePackId ?? 0,
    name: row.welcomePackName ?? row.welcomePack_Name ?? "—",
    count: row.count ?? 0,
    usageCount: row.usageCount ?? 0,
    costUsd: row.costUsd ?? "0.00",
    costToman: row.costToman ?? "0",
  })),
});

/** Issued-pack counts and cost for a named period — the pack counterpart to the financial summary. */
export const getWelcomePackReport = async (query: {
  period?: ReportPeriod;
  startDate?: string;
  endDate?: string;
}): Promise<WelcomePackReport> => {
  const params: Record<string, string> = {};
  if (query.startDate || query.endDate) {
    if (query.startDate) params.start_date = query.startDate;
    if (query.endDate) params.end_date = query.endDate;
  } else if (query.period) {
    params.period = query.period;
  }
  const { data } = await apiClient.get(endpoints.finance.welcomePackReport, { params });
  return toWelcomePackReport(data as RawWelcomePackReport);
};
