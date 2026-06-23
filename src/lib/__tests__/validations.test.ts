import { describe, expect, it } from "vitest";

import { patientFormSchema } from "../validations";

describe("patientFormSchema", () => {
  it("validates a correct patient form", () => {
    const result = patientFormSchema.safeParse({
      firstName: "علی",
      lastName: "محمدی",
      mobileNumber: "09121234567",
      nationalId: "1234567890",
    });
    expect(result.success).toBe(true);
  });

  it("rejects firstName shorter than 2 characters", () => {
    const result = patientFormSchema.safeParse({
      firstName: "ا",
      lastName: "محمدی",
      mobileNumber: "09121234567",
      nationalId: "1234567890",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("firstName"))).toBe(true);
    }
  });

  it("rejects firstName containing digits", () => {
    const result = patientFormSchema.safeParse({
      firstName: "علی123",
      lastName: "محمدی",
      mobileNumber: "09121234567",
      nationalId: "1234567890",
    });
    expect(result.success).toBe(false);
  });

  it("rejects phone with non-digit characters", () => {
    const result = patientFormSchema.safeParse({
      firstName: "علی",
      lastName: "محمدی",
      mobileNumber: "0912abc4567",
      nationalId: "1234567890",
    });
    expect(result.success).toBe(false);
  });

  it("rejects phone with wrong length", () => {
    const result = patientFormSchema.safeParse({
      firstName: "علی",
      lastName: "محمدی",
      mobileNumber: "0912",
      nationalId: "1234567890",
    });
    expect(result.success).toBe(false);
  });

  it("accepts Persian digits in phone", () => {
    const result = patientFormSchema.safeParse({
      firstName: "علی",
      lastName: "محمدی",
      mobileNumber: "۰۹۱۲۱۲۳۴۵۶۷",
      nationalId: "1234567890",
    });
    expect(result.success).toBe(true);
  });

  it("rejects nationalId with wrong length", () => {
    const result = patientFormSchema.safeParse({
      firstName: "علی",
      lastName: "محمدی",
      mobileNumber: "09121234567",
      nationalId: "12345",
    });
    expect(result.success).toBe(false);
  });

  it("handles optional bitmojiCode", () => {
    const result = patientFormSchema.safeParse({
      firstName: "علی",
      lastName: "محمدی",
      mobileNumber: "09121234567",
      nationalId: "1234567890",
      bitmojiCode: "abc123",
    });
    expect(result.success).toBe(true);
  });

  it("accepts missing bitmojiCode", () => {
    const result = patientFormSchema.safeParse({
      firstName: "علی",
      lastName: "محمدی",
      mobileNumber: "09121234567",
      nationalId: "1234567890",
    });
    expect(result.success).toBe(true);
  });
});
