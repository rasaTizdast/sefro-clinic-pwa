import { describe, expect, it } from "vitest";

import { toCamelCase, toSnakeCase, transformKeys } from "../transform";

describe("toCamelCase", () => {
  it("converts object keys from snake_case to camelCase", () => {
    const result = toCamelCase({ first_name: "علی", last_name: "رضایی" });
    expect(result).toEqual({ firstName: "علی", lastName: "رضایی" });
  });

  it("handles nested objects", () => {
    const result = toCamelCase({
      user_profile: {
        first_name: "علی",
        contact_info: { phone_number: "0912" },
      },
    });
    expect(result).toEqual({
      userProfile: {
        firstName: "علی",
        contactInfo: { phoneNumber: "0912" },
      },
    });
  });

  it("handles arrays of objects", () => {
    const result = toCamelCase([
      { first_name: "علی", last_name: "رضایی" },
      { first_name: "سارا", last_name: "احمدی" },
    ]);
    expect(result).toEqual([
      { firstName: "علی", lastName: "رضایی" },
      { firstName: "سارا", lastName: "احمدی" },
    ]);
  });

  it("passes through non-object values unchanged", () => {
    expect(toCamelCase(null)).toBeNull();
    expect(toCamelCase("string")).toBe("string");
    expect(toCamelCase(42)).toBe(42);
    expect(toCamelCase([])).toEqual([]);
  });

  it("handles empty object", () => {
    expect(toCamelCase({})).toEqual({});
  });

  it("handles arrays with primitive values", () => {
    const result = toCamelCase([1, "two", null]);
    expect(result).toEqual([1, "two", null]);
  });
});

describe("toSnakeCase", () => {
  it("converts object keys from camelCase to snake_case", () => {
    const result = toSnakeCase({ firstName: "علی", lastName: "رضایی" });
    expect(result).toEqual({ first_name: "علی", last_name: "رضایی" });
  });

  it("handles nested objects", () => {
    const result = toSnakeCase({
      userProfile: {
        firstName: "علی",
        contactInfo: { phoneNumber: "0912" },
      },
    });
    expect(result).toEqual({
      user_profile: {
        first_name: "علی",
        contact_info: { phone_number: "0912" },
      },
    });
  });

  it("passes through non-object values unchanged", () => {
    expect(toSnakeCase(null)).toBeNull();
    expect(toSnakeCase("string")).toBe("string");
  });
});

describe("transformKeys", () => {
  it("uses custom converter function", () => {
    const upper = (s: string) => s.toUpperCase();
    const result = transformKeys({ first_name: "علی" }, upper);
    expect(result).toEqual({ FIRST_NAME: "علی" });
  });
});
