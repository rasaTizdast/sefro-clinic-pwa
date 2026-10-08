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

const toIsoDay = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;

/**
 * Gregorian `YYYY-MM-DD` bounds of a named period, inclusive on both ends.
 * Mirrors the backend's `_resolve_range` (finance/views.py) day-for-day — including
 * `this_week` ending on the same weekday next week — so client-side filtering of
 * unpaginated rows lands on the same days the `period=` report endpoints use.
 */
export function reportPeriodRange(period: ReportPeriod): { start: string; end: string } {
  const today = new Date();
  const start = new Date(today);
  const end = new Date(today);

  switch (period) {
    case "this_week": {
      // Django's weekday() is Monday=0; JS getDay() is Sunday=0.
      const fromMonday = (today.getDay() + 6) % 7;
      start.setDate(start.getDate() - fromMonday);
      // Derive `end` FROM `start`. Setting a day-of-month on a date that keeps
      // today's day overflows: on the 1st, start.getDate() is 28/29/30, and
      // end.setDate(35) rolls into the next month. The backend uses
      // `start_dt.date() + timedelta(days=7)`, i.e. real date arithmetic.
      end.setTime(start.getTime());
      end.setDate(start.getDate() + 7);
      break;
    }
    case "this_month":
      start.setDate(1);
      end.setMonth(end.getMonth() + 1, 0);
      break;
    case "prev_month": {
      const firstThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastPrevMonth = new Date(firstThisMonth.getTime());
      lastPrevMonth.setDate(0);
      start.setTime(lastPrevMonth.getTime());
      start.setDate(1);
      end.setTime(lastPrevMonth.getTime());
      break;
    }
    case "this_year":
      start.setMonth(0, 1);
      end.setMonth(11, 31);
      break;
    case "today":
    default:
      break;
  }

  return { start: toIsoDay(start), end: toIsoDay(end) };
}
