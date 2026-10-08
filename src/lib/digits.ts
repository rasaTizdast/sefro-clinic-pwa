const PERSIAN_ARABIC_DIGITS = "۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩";

export function toLatinDigits(str: string): string {
  return str.replace(/[۰-۹٠-٩]/g, (d) => String(PERSIAN_ARABIC_DIGITS.indexOf(d) % 10));
}

export function toPersianDigits(str: string): string {
  return str.replace(/\d/g, (d) => PERSIAN_ARABIC_DIGITS[Number(d)]);
}

export function normalizeSearch(str: string): string {
  return toLatinDigits(str.trim());
}

/**
 * Latin digits with at most one decimal point and `maxDecimals` fraction digits —
 * the shape a quantity box can hold while still being `Number()`-parsable.
 * Persian/Arabic digits are folded to Latin as the user types, extra dots are
 * dropped, and a trailing dot is kept so "1." is a valid intermediate state.
 */
export function sanitizeDecimalInput(value: string, maxDecimals = 3): string {
  const raw = toLatinDigits(value).replace(/[^\d.]/g, "");
  const [whole = "", ...rest] = raw.split(".");
  const fraction = rest.join("").slice(0, maxDecimals);
  if (rest.length === 0) return whole;
  return fraction ? `${whole}.${fraction}` : `${whole}.`;
}

/** Numeric value of a sanitized (or hand-typed, possibly Persian) decimal string. */
export function parseDecimalInput(value: string | number | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const normalized = sanitizeDecimalInput(value ?? "");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}
