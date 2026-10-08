import { toPersianDigits } from "./digits";
import { ceilUp, formatPrice } from "./format";

/** Ceil to 2 decimal places as a string — a dollar figure is never rounded down. */
function ceilUsd2(value: number): string {
  return (ceilUp(value * 100) / 100).toFixed(2);
}

/** Convert Toman (integer) to USD string with 2 decimal places. Null when no usable rate. */
export function tomanToUsd(toman: number, rate: number | null): string | null {
  if (!rate || rate <= 0) return null;
  // Ceil so the round-trip Toman → USD → Toman can never undercut the entered price
  // (50,000 ÷ 234,933 = 0.2128 → "0.22", never "0.21" which would display as 49,336).
  return ceilUsd2(toman / rate);
}

/** Round to 2 decimals, half-to-even (banker's rounding) — mirrors Python's `Decimal.quantize('0.01')`. */
function roundHalfEven2(value: number): number {
  const scaled = value * 100;
  const floor = Math.floor(scaled);
  const frac = scaled - floor;
  // Float noise around an exact .5 tie — Python's Decimal hits the tie exactly.
  if (Math.abs(frac - 0.5) < 1e-9) return (floor % 2 === 0 ? floor : floor + 1) / 100;
  return Math.round(scaled) / 100;
}

/**
 * Toman → USD using the *backend's* round-half-even 2dp conversion
 * (`finance.services.exchange_rates.to_usd`). Required for anything the server
 * re-derives from Toman (checkout components): a ceil/half-even mismatch makes
 * checkout reject the payload with 400 "Payment components must sum to the sale
 * amount". For display use `tomanToUsd` (ceil) instead. Null when no usable rate.
 */
export function tomanToUsdHalfEven(toman: number, rate: number | null): number | null {
  if (!rate || rate <= 0) return null;
  return roundHalfEven2(toman / rate);
}

/**
 * Convert USD to integer Toman using rate. Always ceils so a target Toman price
 * is never silently undercut by fractional rounding (e.g. 1,999,630 → 2,000,000).
 * Accepts string | number (backend often sends string decimals).
 */
export function usdToToman(usd: string | number, rate: number | null): number {
  if (!rate || rate <= 0) return 0;
  const value = typeof usd === "number" ? usd : Number(usd);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return ceilUp(value * rate);
}

/** Display helpers — Toman primary (Persian digits), USD secondary. */
export function formatToman(amount: string | number): string {
  return formatPrice(Number(amount));
}

/** USD amount with `$` prefix, Persian digits, and a strict `.` decimal separator (e.g. `$۱۲.۳۴`). */
export function formatUsd(amount: string | number): string {
  const value = Number(amount);
  return `$${toPersianDigits(Number.isFinite(value) ? ceilUsd2(value) : (0).toFixed(2))}`;
}

/** Toman equivalent of a USD amount captured together with an exchange-rate snapshot. */
export function snapshotToman(
  usd: string | number | null | undefined,
  rate: string | number | null | undefined
): number | null {
  if (usd == null || usd === "" || rate == null || rate === "") return null;
  const usdValue = Number(usd);
  const rateValue = Number(rate);
  if (!Number.isFinite(usdValue) || !Number.isFinite(rateValue) || rateValue <= 0) return null;
  return ceilUp(usdValue * rateValue);
}
