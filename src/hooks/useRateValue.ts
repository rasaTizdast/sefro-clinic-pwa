import { useCurrentRate } from "./api/useExchangeRatesQuery";

/** Live Toman-per-USD rate as a number, or null while unavailable/invalid. */
export function useRateValue(): number | null {
  const { data } = useCurrentRate();
  if (!data) return null;
  const parsed = Number(data.rateTomanPerUsd ?? data.rate);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
