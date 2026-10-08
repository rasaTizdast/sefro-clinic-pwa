import { describe, expect, it } from "vitest";

import type { ConsumableSelection } from "../../types/wizard";
import {
  ceilUp,
  consumableLineToman,
  consumablesTotalToman,
  formatPrice,
  hasInvalidConsumableQuantity,
  parseTomanAmount,
  serviceDisplayToman,
  serviceLiveToman,
} from "../format";

describe("ceilUp", () => {
  it("rounds money up to a whole unit", () => {
    expect(ceilUp(3.33333)).toBe(4);
    expect(ceilUp(998913.2)).toBe(998914);
    expect(ceilUp(1000000)).toBe(1000000);
  });

  it("ignores binary float noise so a whole number stays a whole number", () => {
    // 0.1 * 100000 = 10000.000000000002 — a naive Math.ceil would keep the noise but
    // any noisier value must not inflate into the next unit.
    expect(ceilUp(0.1 * 100000)).toBe(10000);
    expect(ceilUp(1 / 0.1)).toBe(10);
  });
});

describe("formatPrice", () => {
  it("formats with Persian digits and ٬ thousands separator", () => {
    expect(formatPrice(1500)).toBe("۱٬۵۰۰");
    expect(formatPrice(25000)).toBe("۲۵٬۰۰۰");
    expect(formatPrice(1250000)).toBe("۱٬۲۵۰٬۰۰۰");
    expect(formatPrice(12500000)).toBe("۱۲٬۵۰۰٬۰۰۰");
    expect(formatPrice(999999999)).toBe("۹۹۹٬۹۹۹٬۹۹۹");
  });

  it("drops decimal places", () => {
    expect(formatPrice(998913.2)).toBe("۹۹۸٬۹۱۳");
    expect(formatPrice(1000000.0)).toBe("۱٬۰۰۰٬۰۰۰");
  });
});

describe("parseTomanAmount", () => {
  it("parses Latin and Persian digits", () => {
    expect(parseTomanAmount("1000000")).toBe(1000000);
    expect(parseTomanAmount("۱۰۰۰۰۰۰")).toBe(1000000);
  });

  it("ceils backend decimal cents so prices never undercut", () => {
    expect(parseTomanAmount("998913.20")).toBe(998914);
    expect(parseTomanAmount("1000000.00")).toBe(1000000);
    expect(parseTomanAmount(998913.2)).toBe(998914);
    expect(parseTomanAmount("1999630")).toBe(1999630);
    expect(parseTomanAmount("2000000")).toBe(2000000);
  });

  it("handles thousand separators", () => {
    expect(parseTomanAmount("۱٬۲۵۰٬۰۰۰")).toBe(1250000);
    expect(parseTomanAmount("1,250,000")).toBe(1250000);
    expect(parseTomanAmount("1.000.000")).toBe(1000000);
  });

  it("returns 0 for empty/invalid", () => {
    expect(parseTomanAmount("")).toBe(0);
    expect(parseTomanAmount(null)).toBe(0);
    expect(parseTomanAmount(undefined)).toBe(0);
    expect(parseTomanAmount("abc")).toBe(0);
  });
});

describe("serviceDisplayToman", () => {
  it("prefers the exact legacy price over derived priceToman", () => {
    expect(serviceDisplayToman({ price: 1000000, priceToman: "998913.20" })).toBe(1000000);
  });

  it("falls back to priceToman when price is 0", () => {
    expect(serviceDisplayToman({ price: 0, priceToman: "998913.20" })).toBe(998914);
  });

  it("falls back to priceToman when price missing", () => {
    expect(serviceDisplayToman({ priceToman: "2000000" })).toBe(2000000);
  });
});

describe("serviceLiveToman", () => {
  it("reprices a USD-anchored service with the live rate", () => {
    const svc = { priceUsd: "10", price: 800000, priceToman: "800000", compensationRole: "facial" };
    expect(serviceLiveToman(svc, 100000)).toBe(1000000);
    // The stored (stale) price must be ignored — the wizard/table quote one price.
    expect(serviceLiveToman(svc, 250000)).toBe(2500000);
  });

  it("keeps laser prices static regardless of the rate", () => {
    const svc = { priceUsd: "10", price: 800000, priceToman: "800000", compensationRole: "laser" };
    expect(serviceLiveToman(svc, 100000)).toBe(800000);
    expect(serviceLiveToman(svc, 250000)).toBe(800000);
  });

  it("falls back to the stored price when the rate or USD anchor is missing", () => {
    expect(serviceLiveToman({ priceUsd: "10", price: 800000 }, null)).toBe(800000);
    expect(serviceLiveToman({ priceUsd: "0", price: 800000 }, 100000)).toBe(800000);
    expect(serviceLiveToman({ priceToman: "2000000" }, 100000)).toBe(2000000);
  });
});

const row = (product: number, quantity: string, priceToman: string): ConsumableSelection => ({
  product,
  productName: `محصول ${product}`,
  quantity,
  priceToman,
  priceUsd: "0",
});

describe("consumableLineToman", () => {
  it("multiplies unit customer price by quantity", () => {
    expect(consumableLineToman(row(1, "2", "150000"))).toBe(300000);
    expect(consumableLineToman(row(1, "1", "200000"))).toBe(200000);
  });

  it("supports Persian-digit and decimal quantities", () => {
    expect(consumableLineToman(row(1, "۲", "150000"))).toBe(300000);
    expect(consumableLineToman(row(1, "1.5", "100000"))).toBe(150000);
  });

  it("rounds fractional results up so nothing is billed for free", () => {
    expect(consumableLineToman(row(1, "1", "999.6"))).toBe(1000);
  });

  it("is 0 for missing/invalid quantity or price", () => {
    expect(consumableLineToman(row(1, "", "150000"))).toBe(0);
    expect(consumableLineToman(row(1, "0", "150000"))).toBe(0);
    expect(consumableLineToman(row(1, "abc", "150000"))).toBe(0);
    expect(consumableLineToman(row(1, "2", ""))).toBe(0);
  });
});

describe("consumablesTotalToman", () => {
  it("sums recipe rows across services and extra products", () => {
    const recipe = {
      "1": [row(10, "2", "150000"), row(11, "1", "200000")],
      "2": [row(10, "1", "150000")],
    };
    const extras = [row(99, "3", "100000")];
    // 500000 (svc1) + 150000 (svc2) + 300000 (extras) = 950000
    expect(consumablesTotalToman(recipe, extras)).toBe(950000);
  });

  it("returns 0 for empty state", () => {
    expect(consumablesTotalToman({})).toBe(0);
    expect(consumablesTotalToman({}, [])).toBe(0);
  });
});

describe("hasInvalidConsumableQuantity", () => {
  it("flags missing, zero and non-numeric quantities", () => {
    expect(hasInvalidConsumableQuantity({ "1": [row(1, "", "1000")] })).toBe(true);
    expect(hasInvalidConsumableQuantity({ "1": [row(1, "0", "1000")] })).toBe(true);
    expect(hasInvalidConsumableQuantity({ "1": [row(1, "x", "1000")] })).toBe(true);
    expect(hasInvalidConsumableQuantity({}, [row(1, "-2", "1000")])).toBe(true);
  });

  it("flags rows with no product id", () => {
    expect(hasInvalidConsumableQuantity({ "1": [row(0, "1", "1000")] })).toBe(true);
  });

  it("accepts valid recipe and extra rows", () => {
    expect(
      hasInvalidConsumableQuantity({ "1": [row(1, "2", "1000")] }, [row(2, "1.5", "500")])
    ).toBe(false);
    expect(hasInvalidConsumableQuantity({})).toBe(false);
  });
});
