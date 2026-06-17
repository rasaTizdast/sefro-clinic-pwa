import { describe, expect, it } from "vitest";

import { normalizeSearch, toLatinDigits, toPersianDigits } from "../digits";

describe("toLatinDigits", () => {
  it("converts Persian digits to Latin", () => {
    expect(toLatinDigits("۱۲۳۴۵۶۷۸۹۰")).toBe("1234567890");
  });

  it("converts Arabic digits to Latin", () => {
    expect(toLatinDigits("٠١٢٣٤٥٦٧٨٩")).toBe("0123456789");
  });

  it("leaves Latin digits unchanged", () => {
    expect(toLatinDigits("12345")).toBe("12345");
  });

  it("handles mixed Persian and Latin digits", () => {
    expect(toLatinDigits("تست ۱۲۳ test ۴۵")).toBe("تست 123 test 45");
  });

  it("returns empty string for empty input", () => {
    expect(toLatinDigits("")).toBe("");
  });
});

describe("toPersianDigits", () => {
  it("converts Latin digits to Persian", () => {
    expect(toPersianDigits("1234567890")).toBe("۱۲۳۴۵۶۷۸۹۰");
  });

  it("leaves Persian digits unchanged", () => {
    expect(toPersianDigits("۱۲۳")).toBe("۱۲۳");
  });

  it("handles mixed content", () => {
    expect(toPersianDigits("شماره 123")).toBe("شماره ۱۲۳");
  });

  it("returns empty string for empty input", () => {
    expect(toPersianDigits("")).toBe("");
  });
});

describe("normalizeSearch", () => {
  it("converts Persian digits to Latin and trims", () => {
    expect(normalizeSearch("  ۱۲۳  ")).toBe("123");
  });

  it("trims whitespace", () => {
    expect(normalizeSearch("  test  ")).toBe("test");
  });
});
