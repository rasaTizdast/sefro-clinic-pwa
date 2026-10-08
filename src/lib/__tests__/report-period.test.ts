import { describe, expect, it } from "vitest";

import type { ReportPeriod } from "../../types/finance";
import { REPORT_PERIOD_OPTIONS, reportPeriodLabel, reportPeriodRange } from "../report-period";

const iso = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;

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
  it("covers today only", () => {
    const today = iso(new Date());
    expect(reportPeriodRange("today")).toEqual({ start: today, end: today });
  });

  it("starts the week on Monday and ends a week later, like the backend", () => {
    const { start, end } = reportPeriodRange("this_week");
    const startDate = new Date(`${start}T00:00:00`);
    // Django's weekday() is Monday=0.
    expect(startDate.getDay()).toBe(1);
    const diff = (new Date(`${end}T00:00:00`).getTime() - startDate.getTime()) / 86_400_000;
    expect(diff).toBe(7);
  });

  it("covers the current calendar month", () => {
    const { start, end } = reportPeriodRange("this_month");
    const now = new Date();
    expect(start).toBe(iso(new Date(now.getFullYear(), now.getMonth(), 1)));
    expect(end).toBe(iso(new Date(now.getFullYear(), now.getMonth() + 1, 0)));
  });

  it("covers the previous calendar month", () => {
    const { start, end } = reportPeriodRange("prev_month");
    const now = new Date();
    expect(start).toBe(iso(new Date(now.getFullYear(), now.getMonth() - 1, 1)));
    expect(end).toBe(iso(new Date(now.getFullYear(), now.getMonth(), 0)));
  });

  it("covers the current calendar year", () => {
    const { start, end } = reportPeriodRange("this_year");
    const year = new Date().getFullYear();
    expect(start).toBe(`${year}-01-01`);
    expect(end).toBe(`${year}-12-31`);
  });

  it("falls back to today for an unknown period", () => {
    const today = iso(new Date());
    expect(reportPeriodRange("nonsense" as ReportPeriod)).toEqual({ start: today, end: today });
  });
});
