import { describe, expect, it } from "vitest";

import { hasAccess } from "../roles";

describe("hasAccess", () => {
  it("allows admin to access all routes", () => {
    const adminRoutes = [
      "/",
      "/patients",
      "/calendar",
      "/services",
      "/warehouse",
      "/accounting",
      "/analytics",
      "/settings",
      "/logs",
    ];
    for (const route of adminRoutes) {
      expect(hasAccess("admin", route)).toBe(true);
    }
  });

  it("allows employee to access non-admin routes", () => {
    const employeeRoutes = [
      "/",
      "/patients",
      "/calendar",
      "/services",
      "/warehouse",
      "/accounting",
      "/analytics",
      "/settings",
    ];
    for (const route of employeeRoutes) {
      expect(hasAccess("employee", route)).toBe(true);
    }
  });

  it("denies employee access to /logs", () => {
    expect(hasAccess("employee", "/logs")).toBe(false);
  });

  it("denies access for unknown routes", () => {
    expect(hasAccess("admin", "/unknown")).toBe(false);
    expect(hasAccess("employee", "/unknown")).toBe(false);
  });
});
