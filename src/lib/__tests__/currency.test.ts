import { describe, expect, it } from "vitest";

import {
  formatToman,
  formatUsd,
  snapshotToman,
  tomanToUsd,
  tomanToUsdHalfEven,
  usdToToman,
} from "../currency";

describe("currency", () => {
  it("converts toman to usd with 2dp rounding", () => {
    expect(tomanToUsd(1_000_000, 100_000)).toBe("10.00");
  });
  it("returns null when rate is null/0", () => {
    expect(tomanToUsd(100, null)).toBeNull();
    expect(tomanToUsd(100, 0)).toBeNull();
  });
  it("ceils toman→usd so a price never converts down", () => {
    // The 50,000 → ۴۹٬۳۳۶ bug: 50000/234933.33 = 0.2128 must ceil to "0.22", not "0.21"
    expect(tomanToUsd(50_000, 234_933.33)).toBe("0.22");
    expect(tomanToUsd(100_000, 3)).toBe("33333.34"); // 33333.333… → up, never down
    // Round-trip lands at or above the entered price
    const usd = tomanToUsd(50_000, 234_933.33);
    expect(usd).not.toBeNull();
    expect(usdToToman(usd as string, 234_933.33)).toBeGreaterThanOrEqual(50_000);
  });
  it("converts usd to toman with ceil (never undercuts)", () => {
    expect(usdToToman("12.34", 100_000)).toBe(1_234_000);
    expect(usdToToman("9.99000999", 200_200)).toBe(2_000_000); // 1,999,999.998 → 2,000,000
    expect(usdToToman(2, 999_999.9)).toBe(2_000_000);
    expect(usdToToman("10.001", 199_963)).toBe(1_999_830); // ceil(1,999,829.963)
    expect(usdToToman("abc", 100_000)).toBe(0);
    expect(usdToToman("1.5", null)).toBe(0);
  });
  it("formats display strings", () => {
    expect(formatToman("1234567")).toContain("۱"); // Persian digits via formatPrice
    expect(formatUsd("12.34")).toBe("$۱۲.۳۴"); // Persian digits, $ prefix, dot separator
  });
  it("converts usd snapshot to toman with ceil", () => {
    expect(snapshotToman("12.34", "100000")).toBe(1_234_000);
    expect(snapshotToman("1.0000001", "1999999")).toBe(2_000_000); // 1,999,999.199999 → ceil
  });
  it("mirrors the backend's half-even toman→usd conversion", () => {
    expect(tomanToUsdHalfEven(1_000_000, 100_000)).toBe(10);
    // 1,000,000 ÷ 241,371 = 4.14299… → rounds DOWN (ceil would say 4.15 → 400)
    expect(tomanToUsdHalfEven(1_000_000, 241_371)).toBe(4.14);
    expect(tomanToUsdHalfEven(50_000, 234_933.33)).toBe(0.21); // 0.2128… → nearest cent
    // Exact .5 ties go to the even digit (Python Decimal.quantize default)
    expect(tomanToUsdHalfEven(829, 200)).toBe(4.14); // 4.145 → 4.14 (4 is even)
    expect(tomanToUsdHalfEven(831, 200)).toBe(4.16); // 4.155 → 4.16 (5 is odd)
    expect(tomanToUsdHalfEven(100, null)).toBeNull();
    expect(tomanToUsdHalfEven(100, 0)).toBeNull();
  });
  it("returns null for missing/invalid snapshot values", () => {
    expect(snapshotToman("12.34", null)).toBeNull();
    expect(snapshotToman(null, "100000")).toBeNull();
    expect(snapshotToman("abc", "100000")).toBeNull();
    expect(snapshotToman("12.34", "0")).toBeNull();
  });
});
