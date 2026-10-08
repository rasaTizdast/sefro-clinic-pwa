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

const toPositiveRate = (raw: string | null | undefined): number | null => {
  const parsed = Number(raw);
  return raw != null && Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

/**
 * Client-side mirror of the backend's `get_rate()`: the newest *active* row that
 * has already become effective. Checkout re-derives every cash component from
 * `get_rate()`, so this is the value a sale must be priced with.
 */
const pickEffectiveRate = (rows: ExchangeRate[]): number | null => {
  const now = Date.now();
  for (const row of rows) {
    if (!row.isActive) continue;
    const effectiveAt = Date.parse(row.effectiveAt);
    if (Number.isNaN(effectiveAt) || effectiveAt > now) continue;
    const value = toPositiveRate(row.rate);
    if (value !== null) return value;
  }
  return null;
};

/**
 * The USD→Toman rate a checkout must be built with.
 *
 * `POST /checkout/` re-derives every `cash_toman` component with the server's own
 * `get_rate()` and rejects the sale when the components stop adding up, so the
 * client must quote a rate that matches the server *at submit time*: never a
 * cached value (the rate query is 5 min stale) and never the BrsApi display
 * fallback, whose provider differs from the one that seeds the DB.
 *
 * Reads the primary quote first — that call can insert a freshly fetched row —
 * then mirrors `get_rate()` over the DB rows, which is exactly what the server
 * will use. Returns null when neither source answers; callers must block the
 * submit in that case instead of guessing.
 */
export const getBillingRate = async (): Promise<number | null> => {
  let primaryRate: number | null = null;
  try {
    const current = await getCurrentRate();
    primaryRate = toPositiveRate(current.rateTomanPerUsd ?? current.rate);
  } catch {
    // Primary down (timeout / 5xx / expired session) — the DB rows may still answer.
  }
  try {
    const mirrored = pickEffectiveRate((await listExchangeRates({ page: 1 })).data);
    if (mirrored !== null) return mirrored;
  } catch {
    // Mirror unavailable — fall through to the primary quote.
  }
  return primaryRate;
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
  /** Backend-required: ExchangeRate.effective_at is a plain DateTimeField with no default. */
  effective_at: string;
}): Promise<ExchangeRate> => {
  const { data } = await apiClient.post(endpoints.finance.exchangeRates, payload);
  return toRate(data as RawRate);
};
