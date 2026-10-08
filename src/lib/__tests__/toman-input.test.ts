import { describe, expect, it } from "vitest";

import { jalaliToGregorianISO } from "../date";
import { parseDecimalInput, sanitizeDecimalInput, toLatinDigits } from "../digits";
import {
  caretOffsetForDigits,
  extractDigits,
  formatQuantity,
  formatTomanInput,
  groupThousands,
  parseTomanInput,
} from "../toman-input";

describe("groupThousands", () => {
  it("groups Latin digits in threes from the right", () => {
    expect(groupThousands("1")).toBe("1");
    expect(groupThousands("123")).toBe("123");
    expect(groupThousands("1234")).toBe("1٬234");
    expect(groupThousands("1234567")).toBe("1٬234٬567");
    expect(groupThousands("1234567890")).toBe("1٬234٬567٬890");
  });

  it("returns an empty string for no digits", () => {
    expect(groupThousands("")).toBe("");
  });
});

describe("extractDigits", () => {
  it("folds Persian and Arabic digits to Latin and drops everything else", () => {
    expect(extractDigits("۱٬۲۳۴")).toBe("1234");
    expect(extractDigits("٤٥٦")).toBe("456");
    expect(extractDigits("12a34-5")).toBe("12345");
    expect(extractDigits("abc")).toBe("");
  });
});

describe("formatTomanInput", () => {
  it("renders grouped Persian digits", () => {
    expect(formatTomanInput(1234567)).toBe("۱٬۲۳۴٬۵۶۷");
    expect(formatTomanInput("1234567")).toBe("۱٬۲۳۴٬۵۶۷");
    expect(formatTomanInput("۱۲۳۴۵۶۷")).toBe("۱٬۲۳۴٬۵۶۷");
    expect(formatTomanInput(0)).toBe("۰");
    expect(formatTomanInput("")).toBe("");
    expect(formatTomanInput(null)).toBe("");
  });

  it("never shows leading zeros", () => {
    expect(formatTomanInput("007")).toBe("۷");
    expect(formatTomanInput("000")).toBe("۰");
  });
});

describe("parseTomanInput", () => {
  it("reads formatted, Persian and raw strings back to a number", () => {
    expect(parseTomanInput("۱٬۲۳۴٬۵۶۷")).toBe(1234567);
    expect(parseTomanInput("1234567")).toBe(1234567);
    expect(parseTomanInput("12,345")).toBe(12345);
    expect(parseTomanInput(866028)).toBe(866028);
    expect(parseTomanInput("")).toBe(0);
    expect(parseTomanInput(null)).toBe(0);
    expect(parseTomanInput("abc")).toBe(0);
  });

  it("round-trips through the display format", () => {
    const typed = "۹٬۸۷۶٬۵۴۳";
    expect(parseTomanInput(formatTomanInput(typed))).toBe(9876543);
  });
});

describe("caretOffsetForDigits", () => {
  it("maps a digit count onto its position past the separators", () => {
    const formatted = "1٬234٬567";
    expect(caretOffsetForDigits(formatted, 0)).toBe(0);
    expect(caretOffsetForDigits(formatted, 1)).toBe(1);
    expect(caretOffsetForDigits(formatted, 2)).toBe(3);
    expect(caretOffsetForDigits(formatted, 4)).toBe(5);
    expect(caretOffsetForDigits(formatted, 7)).toBe(formatted.length);
    // Asking past the end clamps instead of throwing.
    expect(caretOffsetForDigits(formatted, 99)).toBe(formatted.length);
  });
});

describe("formatQuantity", () => {
  it("drops the trailing zeros the backend pads onto quantities", () => {
    expect(formatQuantity("1.000")).toBe("۱");
    expect(formatQuantity("2.500")).toBe("۲.۵");
    expect(formatQuantity("20.000")).toBe("۲۰");
    expect(formatQuantity("3")).toBe("۳");
    expect(formatQuantity(4)).toBe("۴");
  });

  it("degrades to an em dash for empty values", () => {
    expect(formatQuantity("")).toBe("—");
    expect(formatQuantity(null)).toBe("—");
  });
});

describe("sanitizeDecimalInput", () => {
  it("keeps digits and a single decimal point", () => {
    expect(sanitizeDecimalInput("12.5")).toBe("12.5");
    expect(sanitizeDecimalInput("1.2.3")).toBe("1.23");
    expect(sanitizeDecimalInput("abc")).toBe("");
    expect(sanitizeDecimalInput("12a34")).toBe("1234");
  });

  it("folds Persian digits so the value stays Number()-parsable", () => {
    expect(sanitizeDecimalInput("۱۲۵")).toBe("125");
    expect(sanitizeDecimalInput("۱.۵")).toBe("1.5");
  });

  it("keeps a trailing dot as a valid intermediate state", () => {
    expect(sanitizeDecimalInput("12.")).toBe("12.");
    expect(parseDecimalInput("12.")).toBe(12);
  });

  it("caps the fraction at three digits", () => {
    expect(sanitizeDecimalInput("1.23456")).toBe("1.234");
  });
});

describe("parseDecimalInput", () => {
  it("parses raw, Persian and numeric input", () => {
    expect(parseDecimalInput("2.5")).toBe(2.5);
    expect(parseDecimalInput("۲.۵")).toBe(2.5);
    expect(parseDecimalInput(3)).toBe(3);
    expect(parseDecimalInput("")).toBe(0);
    expect(parseDecimalInput("abc")).toBe(0);
  });
});

describe("toLatinDigits", () => {
  it("leaves Latin digits untouched", () => {
    expect(toLatinDigits("1405")).toBe("1405");
  });
});

describe("jalaliToGregorianISO", () => {
  it("converts a plain Jalali date", () => {
    expect(jalaliToGregorianISO("1405/07/08")).toBe("2026-09-30");
  });

  it("accepts Persian digits and a trailing time from a datetime picker", () => {
    expect(jalaliToGregorianISO("۱۴۰۵/۰۷/۰۸ ۱۴:۳۰")).toBe("2026-09-30");
    expect(jalaliToGregorianISO("1405/07/08 14:30")).toBe("2026-09-30");
  });

  it("accepts dashes and unpadded parts", () => {
    expect(jalaliToGregorianISO("1405-7-8")).toBe("2026-09-30");
  });

  it("returns the input untouched when it is not a date", () => {
    expect(jalaliToGregorianISO("")).toBe("");
    expect(jalaliToGregorianISO("nonsense")).toBe("nonsense");
  });
});
