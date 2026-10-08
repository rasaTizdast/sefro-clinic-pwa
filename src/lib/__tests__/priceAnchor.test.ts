import { describe, expect, it } from "vitest";

import {
  anchoredToman,
  parseAnchor,
  parseOriginalToman,
  pricePatches,
  withAnchor,
} from "../priceAnchor";

describe("parseAnchor", () => {
  it("reads the usd: marker from a description", () => {
    expect(parseAnchor("usd:11.5")).toBe(11.5);
    expect(parseAnchor("usd:11.5|orig:1150000")).toBe(11.5);
    expect(parseAnchor("ضایعات کار\nusd:8")).toBe(8);
    expect(parseAnchor("usd:0.123456")).toBeCloseTo(0.123456, 6);
  });

  it("returns null for missing or invalid markers", () => {
    expect(parseAnchor("")).toBeNull();
    expect(parseAnchor(null)).toBeNull();
    expect(parseAnchor(undefined)).toBeNull();
    expect(parseAnchor("بدون نشانگر")).toBeNull();
    expect(parseAnchor("usd:0")).toBeNull();
    expect(parseAnchor("usd:")).toBeNull();
    expect(parseAnchor("usd:-5")).toBeNull();
  });
});

describe("parseOriginalToman", () => {
  it("reads the original toman price from a description", () => {
    expect(parseOriginalToman("usd:11.5|orig:1150000")).toBe(1150000);
    expect(parseOriginalToman("text\nusd:8|orig:800000")).toBe(800000);
  });

  it("returns null when absent", () => {
    expect(parseOriginalToman("usd:11.5")).toBeNull();
    expect(parseOriginalToman("")).toBeNull();
    expect(parseOriginalToman(null)).toBeNull();
    expect(parseOriginalToman(undefined)).toBeNull();
  });
});

describe("withAnchor", () => {
  it("writes a fresh marker whose original equals the live value at entry (no phantom drift)", () => {
    expect(withAnchor(null, 1150000, 100000)).toBe("usd:11.5|orig:1150000");
    expect(withAnchor("", 150000, 100000)).toBe("usd:1.5|orig:150000");
    // Non-round entry: baseline is exactly anchor × rate, not a rounded-up guess
    expect(withAnchor(null, 4950000, 100000)).toBe("usd:49.5|orig:4950000");
  });

  it("writes the same baseline when original toman is explicitly undefined", () => {
    expect(withAnchor(null, 1150000, 100000, undefined)).toBe("usd:11.5|orig:1150000");
  });

  it("preserves human text and refreshes an existing marker", () => {
    expect(withAnchor("توضیح قدیمی\nusd:9", 1150000, 100000)).toBe(
      "توضیح قدیمی\nusd:11.5|orig:1150000"
    );
    expect(withAnchor("usd:9", 1150000, 100000)).toBe("usd:11.5|orig:1150000");
  });

  it("preserves existing original toman when refreshing", () => {
    expect(withAnchor("usd:9|orig:900000", 1150000, 100000)).toBe("usd:11.5|orig:900000");
  });

  it("rounds the anchor to 6 decimal places and bases the original on it", () => {
    // 1000000/3 → anchor 3.333333 → live at entry = ceil(333333.3) = 333334
    expect(withAnchor(null, 1000000 / 3, 100000)).toBe("usd:3.333333|orig:333334");
  });

  it("keeps the description untouched without a usable rate or price", () => {
    expect(withAnchor("متن", 1000, null)).toBe("متن");
    expect(withAnchor("متن", 1000, 0)).toBe("متن");
    expect(withAnchor("متن", 0, 100000)).toBe("متن");
  });

  it("anchors so the price floats back to the exact entered toman (no +1 bump)", () => {
    const rate = 235633.3333;
    const prices = [
      40000, 70000, 100000, 800000, 1150000, 1200000, 1210000, 4950000, 6615000, 38000000,
    ];
    for (const price of prices) {
      const anchor = parseAnchor(withAnchor(null, price, rate));
      expect(anchor, `anchor for ${price}`).not.toBeNull();
      expect(anchoredToman(anchor!, rate), `round-trip for ${price}`).toBe(price);
    }
    // Low-rate edge: feasible anchor range spans 10 steps of 1e-6
    for (const price of [1150000, 1150001, 1150003, 1150009]) {
      const anchor = parseAnchor(withAnchor(null, price, 100000));
      expect(anchor, `anchor for ${price} @100k`).not.toBeNull();
      expect(anchoredToman(anchor!, 100000), `round-trip for ${price} @100k`).toBe(price);
    }
  });
});

describe("anchoredToman", () => {
  it("computes anchor × rate as a rounded integer", () => {
    expect(anchoredToman(11.5, 100000)).toBe(1150000);
    expect(anchoredToman(11.5, 110000)).toBe(1265000);
    expect(anchoredToman(0.5, 100000)).toBe(50000);
    expect(anchoredToman(1.5, 101)).toBe(152);
  });
});

describe("pricePatches", () => {
  const item = (id: number, unitPrice: string, description: string | null = null) => ({
    id,
    unitPrice,
    description,
  });

  it("returns an empty list for a missing or invalid rate", () => {
    expect(pricePatches([item(1, "1150000")], 0)).toEqual([]);
    expect(pricePatches([item(1, "1150000")], NaN)).toEqual([]);
    expect(pricePatches([item(1, "1150000")], -1)).toEqual([]);
  });

  it("writes a missing anchor without changing the stored price (original = stored price)", () => {
    const patches = pricePatches([item(7, "1150000.00")], 100000);
    expect(patches).toEqual([{ id: 7, unitPrice: 1150000, description: "usd:11.5|orig:1150000" }]);
  });

  it("leaves anchored products untouched when the price matches the rate", () => {
    expect(pricePatches([item(1, "1150000", "usd:11.5|orig:1200000")], 100000)).toEqual([]);
  });

  it("recomputes the toman price when the rate moved", () => {
    expect(pricePatches([item(1, "1150000", "usd:11.5|orig:1200000")], 110000)).toEqual([
      { id: 1, unitPrice: 1265000, description: "usd:11.5|orig:1200000" },
    ]);
    expect(pricePatches([item(1, "1265000", "usd:11.5|orig:1200000")], 90000)).toEqual([
      { id: 1, unitPrice: 1035000, description: "usd:11.5|orig:1200000" },
    ]);
  });

  it("keeps the description of anchored products during a rate sync", () => {
    const patches = pricePatches([item(2, "50000", "توضیح\nusd:0.5|orig:100000")], 200000);
    expect(patches).toEqual([
      { id: 2, unitPrice: 100000, description: "توضیح\nusd:0.5|orig:100000" },
    ]);
  });

  it("skips zero/unparseable prices", () => {
    expect(pricePatches([item(1, "0"), item(2, "نامعتبر")], 100000)).toEqual([]);
  });
});
