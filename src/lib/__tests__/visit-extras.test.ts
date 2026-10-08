import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearVisitExtras,
  hasExtras,
  loadVisitExtras,
  saveVisitExtras,
  type VisitExtras,
} from "../visit-extras";

const extras: VisitExtras = {
  extraProducts: [
    { product: 7, productName: "سرم", quantity: "2", priceToman: "75000", priceUsd: "0" },
  ],
  welcomePack: { packId: 3, packName: "پک", totalCostToman: "250000", totalCostUsd: "1.02" },
  savedAt: Date.now(),
};

describe("visit-extras", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns null for a visit with nothing stored", () => {
    expect(loadVisitExtras(42)).toBeNull();
  });

  it("saves and reloads extras for a visit", () => {
    saveVisitExtras(42, extras);

    const loaded = loadVisitExtras(42);
    expect(loaded).not.toBeNull();
    expect(loaded?.welcomePack?.packId).toBe(3);
    expect(loaded?.extraProducts).toHaveLength(1);
    expect(loaded?.extraProducts[0].product).toBe(7);
  });

  it("keeps visits independent", () => {
    saveVisitExtras(42, extras);
    expect(loadVisitExtras(43)).toBeNull();
  });

  it("does not store empty extras", () => {
    saveVisitExtras(42, { extraProducts: [], welcomePack: null, savedAt: Date.now() });

    expect(loadVisitExtras(42)).toBeNull();
  });

  it("clears extras after a successful checkout", () => {
    saveVisitExtras(42, extras);
    clearVisitExtras(42);

    expect(loadVisitExtras(42)).toBeNull();
  });

  it("is idempotent when clearing a visit that has no extras", () => {
    expect(() => clearVisitExtras(42)).not.toThrow();
  });

  it("drops entries older than 30 days", () => {
    saveVisitExtras(42, { ...extras, savedAt: Date.now() - 1000 * 60 * 60 * 24 * 31 });

    expect(loadVisitExtras(42)).toBeNull();
  });

  it("survives corrupted storage", () => {
    localStorage.setItem("calendar_visit_extras", "{not json");

    expect(loadVisitExtras(42)).toBeNull();
    expect(() => saveVisitExtras(42, extras)).not.toThrow();
    expect(loadVisitExtras(42)).not.toBeNull();
  });

  it("hasExtras is false for empty/null input", () => {
    expect(hasExtras(null)).toBe(false);
    expect(hasExtras({ extraProducts: [], welcomePack: null, savedAt: Date.now() })).toBe(false);
    expect(hasExtras(extras)).toBe(true);
  });

  it("warns instead of throwing when storage is unavailable", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceeded");
    });

    expect(() => saveVisitExtras(42, extras)).not.toThrow();
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
    vi.restoreAllMocks();
  });
});
