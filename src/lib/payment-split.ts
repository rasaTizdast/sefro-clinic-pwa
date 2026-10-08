/** Shared 3-method payment split: cash (toman) + cash (dollar) + card (toman). */
import { toLatinDigits } from "./digits";
import { parseTomanAmount } from "./format";

export function parseTomanInput(value: string): number {
  return parseTomanAmount(value);
}

export function parseUsdInput(value: string): number {
  const n = Number(toLatinDigits(value).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** Toman equivalent of the whole split (dollar part rounded via rate). */
export function splitPaidToman(
  cashToman: number,
  cardToman: number,
  cashUsd: number,
  rate: number | null
): number {
  const dollarToman = cashUsd > 0 && rate ? Math.ceil(cashUsd * rate) : 0;
  return cashToman + cardToman + dollarToman;
}

export function isSplitComplete(
  totalToman: number,
  cashToman: number,
  cardToman: number,
  cashUsd: number,
  rate: number | null
): boolean {
  if (totalToman <= 0) return false;
  return splitPaidToman(cashToman, cardToman, cashUsd, rate) === totalToman;
}
