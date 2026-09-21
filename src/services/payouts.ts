import { endpoints } from "../config/api";
import { apiClient } from "../lib/api-client";
import { type PaginationParams, toPaginatedResponse, toQueryParams } from "../lib/pagination";
import type { PaginatedResponse } from "../types/api";
import type {
  CompensationRole,
  PayoutStatus,
  ReportPeriod,
  StaffCompensationRule,
  StaffPayout,
  StaffPayoutSummary,
} from "../types/finance";

const DEFAULT_PER_PAGE = 20;

/** A decimal string from the backend; defaults keep money fields non-nullable. */
const USD = "0.00";
const TOMAN = "0";

/**
 * Wire shapes. The axios client camelCases response keys before services see them, so the
 * camelCase aliases below are the ones used at runtime. Money always stays a string (DRF decimals).
 */
type RawStaffPayout = Record<string, unknown> & {
  id: number;
  staff?: number;
  staffName?: string;
  visit?: number;
  service?: number;
  serviceName?: string | null;
  role?: CompensationRole;
  revenueUsd?: string;
  revenueToman?: string;
  productCostUsd?: string;
  productCostToman?: string;
  profitUsd?: string;
  profitToman?: string;
  payoutCashUsd?: string;
  payoutCashToman?: string;
  payoutProduct?: number | null;
  productName?: string | null;
  payoutProductQty?: string;
  payoutProductValueUsd?: string;
  payoutProductValueToman?: string;
  totalPayoutUsd?: string;
  totalPayoutToman?: string;
  exchangeRate?: string;
  status?: PayoutStatus;
  payoutMode?: "cash" | "product";
  notes?: string;
  approvedBy?: number | null;
  approvedAt?: string | null;
  paidAt?: string | null;
  createdAt?: string;
};

type RawStaffPayoutSummary = {
  totalCashUsd?: string;
  totalCashToman?: string;
  totalProductValueUsd?: string;
  totalProductValueToman?: string;
  totalPayoutUsd?: string;
  totalPayoutToman?: string;
  payoutCount?: number;
};

type RawCompensationRule = Record<string, unknown> & {
  id: number;
  role?: Exclude<CompensationRole, "none">;
  payoutType?: StaffCompensationRule["payoutType"];
  calculationType?: StaffCompensationRule["calculationType"];
  percentProfit?: string | null;
  fixedAmountUsd?: string | null;
  fixedAmountToman?: string | null;
  transportUsd?: string;
  transportToman?: string;
  product?: number | null;
  productQty?: string;
  isActive?: boolean;
};

export const toStaffPayout = (raw: RawStaffPayout): StaffPayout => ({
  id: raw.id,
  staff: raw.staff ?? 0,
  staffName: raw.staffName ?? "",
  visit: raw.visit ?? 0,
  service: raw.service ?? 0,
  serviceName: raw.serviceName ?? null,
  role: raw.role ?? "none",
  revenueUsd: raw.revenueUsd ?? USD,
  revenueToman: raw.revenueToman ?? TOMAN,
  productCostUsd: raw.productCostUsd ?? USD,
  productCostToman: raw.productCostToman ?? TOMAN,
  profitUsd: raw.profitUsd ?? USD,
  profitToman: raw.profitToman ?? TOMAN,
  payoutCashUsd: raw.payoutCashUsd ?? USD,
  payoutCashToman: raw.payoutCashToman ?? TOMAN,
  payoutProduct: raw.payoutProduct ?? null,
  productName: raw.productName ?? null,
  payoutProductQty: raw.payoutProductQty ?? USD,
  payoutProductValueUsd: raw.payoutProductValueUsd ?? USD,
  payoutProductValueToman: raw.payoutProductValueToman ?? TOMAN,
  totalPayoutUsd: raw.totalPayoutUsd ?? USD,
  totalPayoutToman: raw.totalPayoutToman ?? TOMAN,
  exchangeRate: raw.exchangeRate ?? USD,
  status: raw.status ?? "pending",
  payoutMode: raw.payoutMode ?? "cash",
  notes: raw.notes ?? "",
  approvedBy: raw.approvedBy ?? null,
  approvedAt: raw.approvedAt ?? null,
  paidAt: raw.paidAt ?? null,
  createdAt: raw.createdAt ?? "",
});

export const toStaffPayoutSummary = (raw: RawStaffPayoutSummary): StaffPayoutSummary => ({
  totalCashUsd: raw.totalCashUsd ?? USD,
  totalCashToman: raw.totalCashToman ?? TOMAN,
  totalProductValueUsd: raw.totalProductValueUsd ?? USD,
  totalProductValueToman: raw.totalProductValueToman ?? TOMAN,
  totalPayoutUsd: raw.totalPayoutUsd ?? USD,
  totalPayoutToman: raw.totalPayoutToman ?? TOMAN,
  payoutCount: raw.payoutCount ?? 0,
});

export const toCompensationRule = (raw: RawCompensationRule): StaffCompensationRule => ({
  id: raw.id,
  role: raw.role ?? "doctor",
  payoutType: raw.payoutType ?? "cash",
  calculationType: raw.calculationType ?? "percent_profit",
  percentProfit: raw.percentProfit ?? null,
  fixedAmountUsd: raw.fixedAmountUsd ?? null,
  fixedAmountToman: raw.fixedAmountToman ?? null,
  transportUsd: raw.transportUsd ?? USD,
  transportToman: raw.transportToman ?? TOMAN,
  product: raw.product ?? null,
  productQty: raw.productQty ?? USD,
  isActive: raw.isActive ?? true,
});

export type PayoutsListParams = PaginationParams & {
  staff?: number;
  role?: CompensationRole;
  status?: PayoutStatus;
  visit?: number;
};

/**
 * Gregorian `startDate`/`endDate` (YYYY-MM-DD) or a named `period`; an explicit range wins
 * over the period so the caller's choice is always honoured.
 */
export type PayoutSummaryParams = {
  staff?: number;
  role?: CompensationRole;
  period?: ReportPeriod;
  startDate?: string;
  endDate?: string;
};

export type CompensationRulesParams = PaginationParams & {
  role?: CompensationRole;
};

export type CompensationRulePayload = Partial<Omit<StaffCompensationRule, "id">> & {
  role: Exclude<CompensationRole, "none">;
};

export const listPayouts = async (
  params?: PayoutsListParams
): Promise<PaginatedResponse<StaffPayout>> => {
  const page = params?.page ?? 1;
  const perPage = params?.perPage ?? DEFAULT_PER_PAGE;
  const query: Record<string, string | number> = toQueryParams({ ...params, page, perPage });
  if (params?.staff !== undefined) query.staff = params.staff;
  if (params?.role) query.role = params.role;
  if (params?.status) query.status = params.status;
  if (params?.visit !== undefined) query.visit = params.visit;

  const { data } = await apiClient.get(endpoints.payouts.list, { params: query });
  const paginated = toPaginatedResponse<RawStaffPayout>(data as never, page, perPage);
  return {
    ...paginated,
    data: paginated.data.map(toStaffPayout),
  };
};

/** Unpaginated aggregate for the payouts report header. */
export const listPayoutSummary = async (
  params?: PayoutSummaryParams
): Promise<StaffPayoutSummary> => {
  const query: Record<string, string | number> = {};
  if (params?.staff !== undefined) query.staff = params.staff;
  if (params?.role) query.role = params.role;
  if (params?.startDate || params?.endDate) {
    if (params.startDate) query.start_date = params.startDate;
    if (params.endDate) query.end_date = params.endDate;
  } else if (params?.period) {
    query.period = params.period;
  }

  const { data } = await apiClient.get(endpoints.payouts.summary, { params: query });
  return toStaffPayoutSummary(data as RawStaffPayoutSummary);
};

export const listCompensationRules = async (
  params?: CompensationRulesParams
): Promise<PaginatedResponse<StaffCompensationRule>> => {
  const page = params?.page ?? 1;
  const perPage = params?.perPage ?? DEFAULT_PER_PAGE;
  const query: Record<string, string | number> = toQueryParams({ ...params, page, perPage });
  if (params?.role) query.role = params.role;

  const { data } = await apiClient.get(endpoints.payouts.rules, { params: query });
  const paginated = toPaginatedResponse<RawCompensationRule>(data as never, page, perPage);
  return {
    ...paginated,
    data: paginated.data.map(toCompensationRule),
  };
};

/** Create (no id) or fully update (id given) the rule for a compensation role. */
export const upsertCompensationRule = async (
  payload: CompensationRulePayload,
  id?: number
): Promise<StaffCompensationRule> => {
  const { data } = id
    ? await apiClient.put(endpoints.payouts.ruleDetail(id), payload)
    : await apiClient.post(endpoints.payouts.rules, payload);
  return toCompensationRule(data as RawCompensationRule);
};
