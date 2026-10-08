import type { ConsumableSelection } from "../types/wizard";
import { toLatinDigits } from "./digits";

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("fa-IR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Persian percentage label for a ratio expressed in percent (12.5 → "۱۲٫۵٪").
 * Non-finite input degrades to an em dash instead of showing "NaN٪".
 */
export function formatPercent(percent: number, fractionDigits = 1): string {
  if (!Number.isFinite(percent)) return "—";
  return (
    new Intl.NumberFormat("fa-IR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: fractionDigits,
    }).format(percent) + "٪"
  );
}

/**
 * Ceil to a whole money unit — a price never rounds DOWN anywhere in the app.
 * `toPrecision(12)` first so binary float noise (0.1 × 100000 → 10000.000000000002)
 * cannot bump the value up a whole unit on its own.
 */
export function ceilUp(value: number): number {
  return Math.ceil(Number(value.toPrecision(12)));
}

/**
 * Parse a Toman amount from API/user strings into an integer.
 * Handles Persian digits, thousand separators (٬ , and multi-dot 1.000.000),
 * and decimal cents from the backend ("998913.20" → 998913).
 */
export function parseTomanAmount(value: string | number | null | undefined): number {
  if (value == null || value === "") return 0;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value <= 0) return 0;
    return Math.ceil(value);
  }
  let s = toLatinDigits(String(value)).trim();
  s = s.replace(/[٬,\s\u00A0]/g, "");
  if ((s.match(/\./g) ?? []).length > 1) {
    s = s.replace(/\./g, "");
  }
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.ceil(n);
}

/**
 * Exact customer-facing Toman price for a service: the legacy `price` field
 * stores what the user entered; `priceToman` is derived from price_usd × rate
 * and can drift (USD round-trip). Prefer `price` when set.
 */
export function serviceDisplayToman(service: {
  price?: number | null;
  priceToman?: string | null;
}): number {
  if (service.price != null && service.price > 0) return ceilUp(service.price);
  return parseTomanAmount(service.priceToman);
}

/**
 * Laser pays a static salary, so a laser service's price is fixed and must NOT
 * float with the dollar. Every other service is USD-anchored and reprices with
 * the live exchange rate.
 */
export function isStaticPricedService(service: { compensationRole?: string | null }): boolean {
  return service.compensationRole === "laser";
}

/**
 * Customer-facing Toman price at the CURRENT exchange rate — the single source
 * every surface (services table, wizard picker, calendar, checkout) must quote:
 * - floating services: ceil(priceUsd × rate), the same math as PriceCell;
 * - laser services / missing rate / missing USD anchor: the stored price.
 */
export function serviceLiveToman(
  service: {
    price?: number | null;
    priceUsd?: string | number | null;
    priceToman?: string | null;
    compensationRole?: string | null;
  },
  rate: number | null
): number {
  if (!isStaticPricedService(service) && rate != null && rate > 0) {
    const usd = Number(String(service.priceUsd ?? "").trim());
    if (Number.isFinite(usd) && usd > 0) return ceilUp(usd * rate);
  }
  return serviceDisplayToman(service);
}

/** Subtotal for one billable consumable row: quantity × unit customer price (Toman). */
export function consumableLineToman(row: ConsumableSelection): number {
  const qty = Number(toLatinDigits(row.quantity));
  if (!Number.isFinite(qty) || qty <= 0) return 0;
  return ceilUp(parseTomanAmount(row.priceToman) * qty);
}

/** Sum of billable consumable rows (recipe + extra warehouse products). */
export function consumablesTotalToman(
  byService: Record<string, ConsumableSelection[]>,
  extraProducts: ConsumableSelection[] = []
): number {
  let total = 0;
  for (const rows of Object.values(byService)) {
    for (const row of rows) total += consumableLineToman(row);
  }
  for (const row of extraProducts) total += consumableLineToman(row);
  return total;
}

/** True when any billable consumable has a missing/invalid/non-positive quantity. */
export function hasInvalidConsumableQuantity(
  byService: Record<string, ConsumableSelection[]>,
  extraProducts: ConsumableSelection[] = []
): boolean {
  const check = (rows: ConsumableSelection[]) =>
    rows.some((row) => {
      const qty = Number(toLatinDigits(row.quantity));
      return row.product <= 0 || !Number.isFinite(qty) || qty <= 0;
    });
  return check(extraProducts) || Object.values(byService).some(check);
}
