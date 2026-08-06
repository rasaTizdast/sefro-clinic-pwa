import { describe, expect, it } from "vitest";

import { fillChartGaps, shamsiPeriodKey } from "../report-chart";

describe("shamsiPeriodKey", () => {
  it("formats daily keys as YYYY-MM-DD", () => {
    expect(shamsiPeriodKey(1405, 5, 15, "daily")).toBe("1405-05-15");
  });

  it("formats weekly keys as YYYY-Www using day-of-year", () => {
    expect(shamsiPeriodKey(1405, 1, 1, "weekly")).toBe("1405-W01");
    expect(shamsiPeriodKey(1405, 1, 8, "weekly")).toBe("1405-W02");
  });

  it("formats monthly keys as YYYY-MM", () => {
    expect(shamsiPeriodKey(1405, 12, 30, "monthly")).toBe("1405-12");
  });

  it("formats quarterly keys as YYYY-Qn", () => {
    expect(shamsiPeriodKey(1405, 1, 1, "quarterly")).toBe("1405-Q1");
    expect(shamsiPeriodKey(1405, 4, 1, "quarterly")).toBe("1405-Q2");
    expect(shamsiPeriodKey(1405, 8, 1, "quarterly")).toBe("1405-Q3");
    expect(shamsiPeriodKey(1405, 12, 1, "quarterly")).toBe("1405-Q4");
  });

  it("formats yearly keys as YYYY", () => {
    expect(shamsiPeriodKey(1405, 6, 20, "yearly")).toBe("1405");
  });
});

describe("fillChartGaps", () => {
  it("keeps existing entries in order", () => {
    const result = fillChartGaps(
      [{ period: "1405-05-10", total: 500 }],
      "daily",
      "1405-05-10",
      "1405-05-12"
    );
    expect(result[0]).toEqual({ period: "1405-05-10", total: 500 });
  });

  it("fills missing periods with zero totals", () => {
    const result = fillChartGaps(
      [{ period: "1405-05", total: 700 }],
      "monthly",
      "1405-03-01",
      "1405-06-30"
    );
    expect(result).toEqual([
      { period: "1405-03", total: 0 },
      { period: "1405-04", total: 0 },
      { period: "1405-05", total: 700 },
      { period: "1405-06", total: 0 },
    ]);
  });

  it("handles daily gaps across a month boundary", () => {
    const result = fillChartGaps(
      [{ period: "1405-05-31", total: 100 }],
      "daily",
      "1405-05-30",
      "1405-06-01"
    );
    expect(result).toEqual([
      { period: "1405-05-30", total: 0 },
      { period: "1405-05-31", total: 100 },
      { period: "1405-06-01", total: 0 },
    ]);
  });

  it("handles weekly gaps", () => {
    const result = fillChartGaps(
      [{ period: "1405-W02", total: 10 }],
      "weekly",
      "1405-01-08",
      "1405-01-21"
    );
    expect(result).toEqual([
      { period: "1405-W02", total: 10 },
      { period: "1405-W03", total: 0 },
    ]);
  });

  it("handles quarterly gaps", () => {
    const result = fillChartGaps(
      [{ period: "1404-Q4", total: 50 }],
      "quarterly",
      "1404-10-01",
      "1405-03-31"
    );
    expect(result).toEqual([
      { period: "1404-Q4", total: 50 },
      { period: "1405-Q1", total: 0 },
    ]);
  });

  it("handles yearly gaps across a Shamsi year boundary", () => {
    const result = fillChartGaps(
      [{ period: "1404", total: 900 }],
      "yearly",
      "1404-01-01",
      "1405-12-29"
    );
    expect(result).toEqual([
      { period: "1404", total: 900 },
      { period: "1405", total: 0 },
    ]);
  });

  it("produces a single zero-filled bucket for a single-month range", () => {
    expect(fillChartGaps([], "monthly", "1405-05-01", "1405-05-31")).toEqual([
      { period: "1405-05", total: 0 },
    ]);
  });
});
