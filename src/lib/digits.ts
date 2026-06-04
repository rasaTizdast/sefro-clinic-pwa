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
