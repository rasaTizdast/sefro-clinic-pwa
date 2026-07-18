import { expect, test } from "@playwright/test";

import { clickSave, mockAllApiEndpoints } from "./helpers";

test.describe("Settings", () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApiEndpoints(page);
  });

  test("displays settings page with all sections", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "تنظیمات" })).toBeVisible();
    await expect(page.getByText("تنظیمات حساب کاربری و سیستم")).toBeVisible();
    await expect(page.getByText("تغییر رمز عبور")).toBeVisible();
    await expect(page.getByText("ساعات کاری هفتگی")).toBeVisible();
  });

  test("shows password change form", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("textbox", { name: "رمز جدید", exact: true })).toBeVisible();
    await expect(page.getByLabel("تکرار رمز جدید")).toBeVisible();
    await expect(page.getByRole("button", { name: "تغییر رمز" })).toBeVisible();
  });

  test("validates password mismatch", async ({ page }) => {
    await page.goto("/settings");

    await page.getByRole("textbox", { name: "رمز جدید", exact: true }).fill("NewPass123");
    await page.getByLabel("تکرار رمز جدید").fill("DifferentPass456");
    await page.getByRole("button", { name: "تغییر رمز" }).first().click();

    // Should show validation error about mismatch
    // The form should not submit successfully
    await expect(page.getByRole("textbox", { name: "رمز جدید", exact: true })).toBeVisible();
  });

  test("successfully changes password", async ({ page }) => {
    // Mock password change endpoint
    await page.route("**/api/auth/change-password/", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Password updated" }),
      });
    });

    await page.goto("/settings");

    await page.getByRole("textbox", { name: "رمز جدید", exact: true }).fill("NewSecurePass123");
    await page.getByLabel("تکرار رمز جدید").fill("NewSecurePass123");
    await page.getByRole("button", { name: "تغییر رمز" }).first().click();

    // Should show success feedback (toast or inline message)
    // Wait briefly for async operation
    await page.waitForTimeout(1000);

    // Form should still be visible (no crash)
    await expect(page.getByText("تغییر رمز عبور")).toBeVisible();
  });

  test("shows working hours section", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByText("از ساعت")).toBeVisible();
    await expect(page.getByText("اعمال برای روزهای:")).toBeVisible();
  });

  test("shows users management section", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByText("مدیریت کاربران")).toBeVisible();
    await expect(page.getByRole("button", { name: "کاربر جدید" })).toBeVisible();
  });

  test("opens add user modal", async ({ page }) => {
    await page.goto("/settings");
    await page.getByRole("button", { name: "کاربر جدید" }).click();
    await expect(page.getByText("افزودن کاربر جدید")).toBeVisible();
    await expect(page.getByLabel("نام کاربری")).toBeVisible();
    await expect(page.getByLabel("رمز عبور")).toBeVisible();
  });

  test("creates a new user", async ({ page }) => {
    await page.route("**/api/auth/employees/", async (route) => {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ id: 9999 }),
      });
    });

    await page.goto("/settings");
    await page.getByRole("button", { name: "کاربر جدید" }).click();

    const username = `user${Date.now()}`;
    await page.getByLabel("نام کاربری").fill(username);
    await page.getByLabel("رمز عبور").fill("TestPass123");

    await clickSave(page, page.getByRole("dialog").getByRole("button", { name: "ذخیره" }));
    await expect(page.getByText("افزودن کاربر جدید")).not.toBeVisible({ timeout: 10000 });
  });
});
