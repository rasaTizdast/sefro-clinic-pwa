import jalaali from "jalaali-js";

import type { ReportPeriod } from "../types/finance";

export interface ReportPeriodOption {
  value: ReportPeriod;
  label: string;
}

/** Named ranges every finance report endpoint understands (`period=` param). */
export const REPORT_PERIOD_OPTIONS: ReportPeriodOption[] = [
  { value: "today", label: "امروز" },
  { value: "this_week", label: "این هفته" },
  { value: "this_month", label: "این ماه" },
  { value: "prev_month", label: "ماه قبل" },
  { value: "this_year", label: "امسال" },
];

/** Human label for a named period — used to qualify summaries ("جمع تومان (این ماه)"). */
export function reportPeriodLabel(period: ReportPeriod): string {
  return REPORT_PERIOD_OPTIONS.find((option) => option.value === period)?.label ?? "";
}

const dayKey = (jy: number, jm: number, jd: number): string =>
  `${jy}-${String(jm).padStart(2, "0")}-${String(jd).padStart(2, "0")}`;

/**
 * Days elapsed since the start of the Persian week for a Shamsi day:
 * Saturday = 0 … Friday = 6 (the backend's Saturday-start weeks).
 */
function daysSinceSaturday(jy: number, jm: number, jd: number): number {
  const { gy, gm, gd } = jalaali.toGregorian(jy, jm, jd);
  return (new Date(gy, gm - 1, gd).getDay() + 1) % 7;
}

function shiftDays(jy: number, jm: number, jd: number, delta: number) {
  return jalaali.d2j(jalaali.j2d(jy, jm, jd) + delta);
}

/**
 * Shamsi `YYYY-MM-DD` bounds of a named period, inclusive on both ends.
 * Mirrors the backend's `_resolve_range` (finance/views.py) day-for-day — the
 * same Saturday-start weeks, Shamsi months and Farvardin..Esfand year — so
 * client-side filtering of unpaginated rows lands on the same days the
 * `period=` report endpoints use. Both ends are Jalali because every API date
 * field now speaks Jalali.
 */
export function reportPeriodRange(period: ReportPeriod): { start: string; end: string } {
  const { jy, jm, jd } = jalaali.toJalaali(new Date());

  switch (period) {
    case "this_week": {
      const start = shiftDays(jy, jm, jd, -daysSinceSaturday(jy, jm, jd));
      const end = shiftDays(start.jy, start.jm, start.jd, 6);
      return { start: dayKey(start.jy, start.jm, start.jd), end: dayKey(end.jy, end.jm, end.jd) };
    }
    case "this_month":
      return { start: dayKey(jy, jm, 1), end: dayKey(jy, jm, jalaali.jalaaliMonthLength(jy, jm)) };
    case "prev_month": {
      const prevYear = jm === 1 ? jy - 1 : jy;
      const prevMonth = jm === 1 ? 12 : jm - 1;
      return {
        start: dayKey(prevYear, prevMonth, 1),
        end: dayKey(prevYear, prevMonth, jalaali.jalaaliMonthLength(prevYear, prevMonth)),
      };
    }
    case "this_year":
      return { start: dayKey(jy, 1, 1), end: dayKey(jy, 12, jalaali.jalaaliMonthLength(jy, 12)) };
    case "today":
    default:
      return { start: dayKey(jy, jm, jd), end: dayKey(jy, jm, jd) };
  }
}
