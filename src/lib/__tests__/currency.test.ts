import { describe, expect, it } from "vitest";

import { formatToman, formatUsd, snapshotToman, tomanToUsd, usdToToman } from "../currency";

describe("currency", () => {
  it("converts toman to usd with 2dp rounding", () => {
    expect(tomanToUsd(1_000_000, 100_000)).toBe("10.00");
  });
  it("returns null when rate is null/0", () => {
    expect(tomanToUsd(100, null)).toBeNull();
    expect(tomanToUsd(100, 0)).toBeNull();
  });
  it("converts usd to toman (rounded to integer)", () => {
    expect(usdToToman("12.34", 100_000)).toBe(1_234_000);
  });
  it("formats display strings", () => {
    expect(formatToman("1234567")).toContain("۱"); // Persian digits via formatPrice
    expect(formatUsd("12.34")).toBe("$12.34");
  });
  it("converts usd snapshot to toman with the captured rate", () => {
    expect(snapshotToman("12.34", "100000")).toBe(1_234_000);
  });
  it("returns null for missing/invalid snapshot values", () => {
    expect(snapshotToman("12.34", null)).toBeNull();
    expect(snapshotToman(null, "100000")).toBeNull();
    expect(snapshotToman("abc", "100000")).toBeNull();
    expect(snapshotToman("12.34", "0")).toBeNull();
  });
});
