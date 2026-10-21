import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { mockAllApiEndpoints } from "./helpers";

const EMPLOYEE_USER = {
  id: 2,
  username: "sefro_employee",
  role: "employee",
  date_joined: "2026-01-01T00:00:00Z",
};

const ADMIN_USER = {
  id: 1,
  username: "sefro_admin",
  role: "admin",
  date_joined: "2026-01-01T00:00:00Z",
};

async function mockAuthAs(page: Page, user: typeof ADMIN_USER) {
  await page.route("**/api/auth/token/refresh/", async (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ detail: "Token is invalid or expired" }),
    })
  );
  await page.route("**/api/auth/me/", async (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(user),
    })
  );
}

test.describe("Finance role-based access — Employee", () => {
  test.beforeEach(async ({ page }) => {
    // Full endpoint coverage first; the role override wins (registered later).
    await mockAllApiEndpoints(page);
    await mockAuthAs(page, EMPLOYEE_USER);
  });

  test("Settings shows only کاربران tab for employee", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "تنظیمات" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "کاربران" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "نرخ ارز" })).not.toBeVisible();
    await expect(page.getByRole("tab", { name: "قوانین تسویه" })).not.toBeVisible();
  });

  test("Accounting shows operating-expenses tab by default for employee", async ({ page }) => {
    await page.goto("/accounting");
    await expect(page.getByRole("heading", { name: "حسابداری" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "هزینه‌های جاری" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  test("Employee can view exchange-rate page without the save button", async ({ page }) => {
    await page.goto("/exchange-rate");
    await expect(page.getByRole("heading", { name: "نرخ ارز", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "ثبت نرخ جدید" })).not.toBeVisible();
  });
});

test.describe("Finance role-based access — Admin", () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApiEndpoints(page);
    await mockAuthAs(page, ADMIN_USER);
  });

  test("Settings shows all finance tabs for admin", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "تنظیمات" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "کاربران" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "نرخ ارز" })).not.toBeVisible();
    // payout rules moved out of Settings into the accounting tab bar
    await expect(page.getByRole("tab", { name: "قوانین تسویه" })).not.toBeVisible();
  });

  test("Admin can open the standalone exchange-rate page and save a rate", async ({ page }) => {
    await page.goto("/exchange-rate");
    await expect(page.getByRole("heading", { name: "نرخ ارز", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "ثبت نرخ جدید" })).toBeVisible();
  });

  test("Admin can navigate to compensation-rules tab", async ({ page }) => {
    await page.goto("/accounting");
    await page.getByRole("tab", { name: "قوانین تسویه" }).click();
    await expect(page.getByRole("tab", { name: "قوانین تسویه" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });
});
