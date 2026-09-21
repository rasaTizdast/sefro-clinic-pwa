import { endpoints } from "../config/api";
import { apiClient } from "../lib/api-client";
import { toPaginatedResponse } from "../lib/pagination";
import type { PaginatedResponse } from "../types/api";
import type { CurrentRate, ExchangeRate } from "../types/finance";

const DEFAULT_PER_PAGE = 20;

/**
 * Raw payloads. The axios client camelCases response keys before services see them, so the
 * camelCase aliases are the ones used at runtime; the snake_case aliases are kept as a fallback
 * (DRF-shaped mocks, endpoints that bypass the interceptor).
 */
type RawRate = {
  id: number;
  rate: string;
  currency_from?: string;
  currency_to?: string;
  effective_at?: string;
  source?: string;
  is_active?: boolean;
  created_at?: string;
  currencyFrom?: string;
  currencyTo?: string;
  effectiveAt?: string;
  isActive?: boolean;
  createdAt?: string;
};

type RawCurrentRate = {
  rate: string;
  source?: string;
  provider?: string;
  rate_toman_per_usd?: string;
  effective_at?: string | null;
  rateTomanPerUsd?: string;
  effectiveAt?: string | null;
};

const toRate = (raw: RawRate): ExchangeRate => ({
  id: raw.id,
  currencyFrom: raw.currencyFrom ?? raw.currency_from ?? "",
  currencyTo: raw.currencyTo ?? raw.currency_to ?? "",
  rate: raw.rate,
  effectiveAt: raw.effectiveAt ?? raw.effective_at ?? "",
  source: raw.source ?? "",
  isActive: raw.isActive ?? raw.is_active ?? true,
  createdAt: raw.createdAt ?? raw.created_at ?? "",
});

const toCurrentRate = (raw: RawCurrentRate): CurrentRate => ({
  rate: raw.rate,
  rateTomanPerUsd: raw.rateTomanPerUsd ?? raw.rate_toman_per_usd ?? raw.rate,
  effectiveAt: raw.effectiveAt ?? raw.effective_at ?? null,
  source: raw.source ?? "",
});

export const listExchangeRates = async (params?: {
  page?: number;
}): Promise<PaginatedResponse<ExchangeRate>> => {
  const page = params?.page ?? 1;
  const perPage = DEFAULT_PER_PAGE;
  const { data } = await apiClient.get(endpoints.finance.exchangeRates, {
    params: { page, per_page: perPage },
  });
  const paginated = toPaginatedResponse<RawRate>(data as never, page, perPage);
  return {
    ...paginated,
    data: paginated.data.map(toRate),
  };
};

/** Current USD→Toman rate; a 503 from the backend rejects (caller shows «نرخ ارز در دسترس نیست»). */
export const getCurrentRate = async (): Promise<CurrentRate> => {
  const { data } = await apiClient.get(endpoints.finance.exchangeDollar);
  return toCurrentRate(data as RawCurrentRate);
};

/** Fallback provider rate used when the primary source is unavailable. */
export const getBackupRate = async (): Promise<CurrentRate & { provider: string }> => {
  const { data } = await apiClient.get(endpoints.finance.backupExchange);
  const raw = data as RawCurrentRate;
  return { ...toCurrentRate(raw), provider: raw.provider ?? "" };
};

export const createExchangeRate = async (payload: {
  rate: string;
  source?: string;
}): Promise<ExchangeRate> => {
  const { data } = await apiClient.post(endpoints.finance.exchangeRates, payload);
  return toRate(data as RawRate);
};
