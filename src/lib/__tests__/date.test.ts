import { describe, expect, it } from "vitest";

import { formatJalaliDateTime, formatTimeFa, toShamsiDateInput } from "../date";

describe("formatTimeFa", () => {
  it("formats morning times with صبح", () => {
    expect(formatTimeFa("09:05")).toBe("۹:۰۵ صبح");
    expect(formatTimeFa("00:15")).toBe("۱۲:۱۵ صبح");
    expect(formatTimeFa("11:59")).toBe("۱۱:۵۹ صبح");
    expect(formatTimeFa("00:00")).toBe("۱۲:۰۰ صبح");
  });

  it("formats afternoon/evening times with بعد از ظهر", () => {
    expect(formatTimeFa("12:00")).toBe("۱۲:۰۰ بعد از ظهر");
    expect(formatTimeFa("15:30")).toBe("۳:۳۰ بعد از ظهر");
    expect(formatTimeFa("23:59")).toBe("۱۱:۵۹ بعد از ظهر");
    expect(formatTimeFa("12:05")).toBe("۱۲:۰۵ بعد از ظهر");
  });

  it("accepts Persian digit input", () => {
    expect(formatTimeFa("۰۹:۰۵")).toBe("۹:۰۵ صبح");
    expect(formatTimeFa("۱۵:۳۰")).toBe("۳:۳۰ بعد از ظهر");
  });

  it("handles empty and unparseable values", () => {
    expect(formatTimeFa("")).toBe("—");
    expect(formatTimeFa(null)).toBe("—");
    expect(formatTimeFa(undefined)).toBe("—");
    expect(formatTimeFa("abc")).toBe("abc");
    expect(formatTimeFa("25:00")).toBe("25:00");
  });
});

describe("formatJalaliDateTime", () => {
  it("formats an ISO datetime as Jalali date + Persian 24h time", () => {
    // Built from the local timezone so the expectation holds on any machine/CI.
    const iso = new Date(2026, 8, 28, 14, 25).toISOString();
    expect(formatJalaliDateTime(iso)).toBe("۱۴۰۵/۰۷/۰۶ ۱۴:۲۵");
  });

  it("pads single-digit hours and minutes", () => {
    const iso = new Date(2026, 8, 28, 7, 5).toISOString();
    expect(formatJalaliDateTime(iso)).toBe("۱۴۰۵/۰۷/۰۶ ۰۷:۰۵");
  });

  it("keeps the date part of already-Jalali input", () => {
    expect(formatJalaliDateTime("1405-07-06")).toBe("۱۴۰۵/۰۷/۰۶");
  });

  it("handles empty and unparseable values", () => {
    expect(formatJalaliDateTime("")).toBe("—");
    expect(formatJalaliDateTime("not-a-date")).toBe("—");
  });
});

describe("toShamsiDateInput", () => {
  it("converts a Date to a Shamsi YYYY-MM-DD string", () => {
    const date = new Date(2026, 8, 28, 14, 25);
    expect(toShamsiDateInput(date)).toBe("1405-07-06");
  });

  it("pads single-digit month and day", () => {
    const date = new Date(2026, 0, 5, 9, 0);
    expect(toShamsiDateInput(date)).toBe("1404-10-15");
  });
});
