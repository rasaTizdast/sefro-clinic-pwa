import jalaali from "jalaali-js";
import { describe, expect, it } from "vitest";

import type { ReportPeriod } from "../../types/finance";
import { REPORT_PERIOD_OPTIONS, reportPeriodLabel, reportPeriodRange } from "../report-period";

/** Today as the API speaks it: a Shamsi `YYYY-MM-DD` day. */
const shamsiToday = () => {
  const { jy, jm, jd } = jalaali.toJalaali(new Date());
  return `${jy}-${String(jm).padStart(2, "0")}-${String(jd).padStart(2, "0")}`;
};

/** Parse a Shamsi day back into a Date so weekday/length maths stays readable. */
const dayOfWeek = (shamsiDay: string) => {
  const [jy, jm, jd] = shamsiDay.split("-").map(Number);
  const { gy, gm, gd } = jalaali.toGregorian(jy, jm, jd);
  return new Date(gy, gm - 1, gd).getDay();
};

const daysBetween = (from: string, to: string) => {
  const toDate = (shamsiDay: string) => {
    const [jy, jm, jd] = shamsiDay.split("-").map(Number);
    const { gy, gm, gd } = jalaali.toGregorian(jy, jm, jd);
    return new Date(gy, gm - 1, gd).getTime();
  };
  return (toDate(to) - toDate(from)) / 86_400_000;
};

describe("reportPeriodLabel", () => {
  it("labels every named period in Persian", () => {
    expect(REPORT_PERIOD_OPTIONS.map((o) => o.value)).toEqual([
      "today",
      "this_week",
      "this_month",
      "prev_month",
      "this_year",
    ]);
    expect(reportPeriodLabel("this_month")).toBe("این ماه");
  });
});

describe("reportPeriodRange", () => {
  it("covers today only, as a Shamsi day", () => {
    const today = shamsiToday();
    expect(reportPeriodRange("today")).toEqual({ start: today, end: today });
  });

  it("starts the week on Saturday and spans seven days, like the backend", () => {
    const { start, end } = reportPeriodRange("this_week");
    // Saturday = 6 in JS's Sunday=0 numbering — the backend's Shamsi week start.
    expect(dayOfWeek(start)).toBe(6);
    expect(dayOfWeek(end)).toBe(5);
    expect(daysBetween(start, end)).toBe(6);
  });

  it("covers the current Shamsi month", () => {
    const { start, end } = reportPeriodRange("this_month");
    const { jy, jm } = jalaali.toJalaali(new Date());
    expect(start).toBe(`${jy}-${String(jm).padStart(2, "0")}-01`);
    expect(end).toBe(`${jy}-${String(jm).padStart(2, "0")}-${jalaali.jalaaliMonthLength(jy, jm)}`);
  });

  it("covers the previous Shamsi month", () => {
    const { start, end } = reportPeriodRange("prev_month");
    const { jy, jm } = jalaali.toJalaali(new Date());
    const prevYear = jm === 1 ? jy - 1 : jy;
    const prevMonth = jm === 1 ? 12 : jm - 1;
    const key = `${prevYear}-${String(prevMonth).padStart(2, "0")}`;
    expect(start).toBe(`${key}-01`);
    expect(end).toBe(`${key}-${jalaali.jalaaliMonthLength(prevYear, prevMonth)}`);
  });

  it("covers the current Shamsi year, Farvardin to Esfand", () => {
    const { start, end } = reportPeriodRange("this_year");
    const { jy } = jalaali.toJalaali(new Date());
    expect(start).toBe(`${jy}-01-01`);
    expect(end).toBe(`${jy}-12-${jalaali.jalaaliMonthLength(jy, 12)}`);
  });

  it("falls back to today for an unknown period", () => {
    const today = shamsiToday();
    expect(reportPeriodRange("nonsense" as ReportPeriod)).toEqual({ start: today, end: today });
  });
});
