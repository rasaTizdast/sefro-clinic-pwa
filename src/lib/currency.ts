import { formatPrice } from "./format";

/** Convert Toman (integer) to USD string with 2 decimal places. Null when no usable rate. */
export function tomanToUsd(toman: number, rate: number | null): string | null {
  if (!rate || rate <= 0) return null;
  return (toman / rate).toFixed(2);
}

/** Convert USD decimal string to integer Toman using rate. */
export function usdToToman(usd: string, rate: number | null): number {
  if (!rate || rate <= 0) return 0;
  return Math.round(Number(usd) * rate);
}

/** Display helpers — Toman primary (Persian digits), USD secondary. */
export function formatToman(amount: string | number): string {
  return formatPrice(Number(amount));
}

export function formatUsd(amount: string | number): string {
  return `$${Number(amount).toFixed(2)}`;
}
