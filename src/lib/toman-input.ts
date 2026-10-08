import { toLatinDigits, toPersianDigits } from "./digits";

/** Persian thousands separator (U+066C) — the one `Intl` fa-IR emits. */
const SEPARATOR = "٬";

/** Strip everything that is not a digit (Persian ۰-۹ and Arabic ٠-٩ both count). */
export function extractDigits(value: string): string {
  return toLatinDigits(value).replace(/\D/g, "");
}

/** Drop leading zeros but keep a single "0" so an in-progress "0" stays visible. */
export function stripLeadingZeros(digits: string): string {
  const trimmed = digits.replace(/^0+/, "");
  return trimmed === "" && digits !== "" ? "0" : trimmed;
}

/** Group Latin digits from the right in threes: "1234567" → "1٬234٬567". */
export function groupThousands(digits: string): string {
  if (digits === "") return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, SEPARATOR);
}

/** Digits → the grouped, Persian-digit form actually rendered in the box. */
export function formatTomanInput(value: string | number | null | undefined): string {
  if (value == null || value === "") return "";
  return toPersianDigits(groupThousands(stripLeadingZeros(extractDigits(String(value)))));
}

/** Canonical numeric amount behind a formatted (or raw) Toman string. */
export function parseTomanInput(value: string | number | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? Math.trunc(value) : 0;
  if (value == null || value === "") return 0;
  const n = Number(stripLeadingZeros(extractDigits(value)));
  return Number.isFinite(n) ? n : 0;
}

/** Character offset in `formatted` just after `count` digits have been passed. */
export function caretOffsetForDigits(formatted: string, count: number): number {
  if (count <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i += 1) {
    if (extractDigits(formatted[i] as string) !== "") {
      seen += 1;
      if (seen === count) return i + 1;
    }
  }
  return formatted.length;
}

/** Strip the trailing zeros of a backend quantity string: "1.000" → "1", "2.500" → "2.5". */
export function formatQuantity(value: string | number | null | undefined): string {
  if (value == null || value === "") return "—";
  const raw = String(value).trim();
  if (raw === "") return "—";
  if (!raw.includes(".")) return toPersianDigits(raw);
  const trimmed = raw.replace(/0+$/, "").replace(/\.$/, "");
  const [whole, fraction] = trimmed.split(".");
  const body = fraction
    ? `${toPersianDigits(whole)}.${toPersianDigits(fraction)}`
    : toPersianDigits(whole);
  return body || "۰";
}
