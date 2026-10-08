import { describe, expect, it } from "vitest";

import { isSplitComplete, parseTomanInput, parseUsdInput, splitPaidToman } from "../payment-split";

describe("payment-split", () => {
  it("parses toman input digits only", () => {
    expect(parseTomanInput("۴۰۰۰")).toBe(4000);
    expect(parseTomanInput("20,000")).toBe(20000);
    expect(parseTomanInput("")).toBe(0);
  });

  it("ceils decimal cents from the API so amounts never undercut", () => {
    expect(parseTomanInput("998913.20")).toBe(998914);
    expect(parseTomanInput("1000000.00")).toBe(1000000);
    expect(parseTomanInput("۱٬۲۵۰٬۰۰۰")).toBe(1250000);
    expect(parseTomanInput("1.000.000")).toBe(1000000);
  });

  it("parses usd input decimals", () => {
    expect(parseUsdInput("20")).toBe(20);
    expect(parseUsdInput("20.50")).toBe(20.5);
    expect(parseUsdInput("")).toBe(0);
    expect(parseUsdInput("۲۰.۵")).toBe(20.5);
  });

  it("sums cash toman + card toman + rounded dollar toman", () => {
    // 4000 cash toman + 20 USD @100k (2,000,000) + 20000 card = 2,024,000
    expect(splitPaidToman(4000, 20000, 20, 100_000)).toBe(2_024_000);
  });

  it("validates a complete multi-method split", () => {
    expect(isSplitComplete(2_420_000, 400_000, 20_000, 20, 100_000)).toBe(true);
    expect(isSplitComplete(2_420_000, 400_000, 20_000, 19, 100_000)).toBe(false);
  });

  it("supports single-method payments", () => {
    expect(isSplitComplete(1_000_000, 1_000_000, 0, 0, 100_000)).toBe(true);
    expect(isSplitComplete(1_000_000, 0, 0, 10, 100_000)).toBe(true);
    expect(isSplitComplete(1_000_000, 0, 1_000_000, 0, 100_000)).toBe(true);
  });
});
