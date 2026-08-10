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
    await expect(page.getByText("مدیریت کاربران")).toBeVisible();
    await expect(page.getByText("تغییر رمز عبور")).toHaveCount(0);
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
    await expect(page.getByLabel("نام", { exact: true })).toBeVisible();
    await expect(page.getByLabel("نام خانوادگی", { exact: true })).toBeVisible();
    await expect(page.getByLabel("شماره تلفن", { exact: true })).toBeVisible();
    await expect(page.getByLabel("نام کاربری", { exact: true })).toBeVisible();
    await expect(page.getByLabel("رمز عبور", { exact: true })).toBeVisible();
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

  test("cannot change an admin password in edit modal", async ({ page }) => {
    await page.route("**/api/auth/employees/list/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          count: 2,
          results: [
            { id: 1, username: "sefro_admin", role: "admin", date_joined: "2026-01-01T00:00:00Z" },
            { id: 2, username: "doctor1", role: "employee", date_joined: "2026-01-01T00:00:00Z" },
          ],
        }),
      });
    });

    await page.goto("/settings");

    const adminRow = page.getByRole("row").filter({ hasText: "sefro_admin" });
    await adminRow.getByRole("button").first().click();
    await expect(page.getByText("ویرایش کاربر")).toBeVisible();
    await expect(page.getByLabel("رمز عبور (خالی بگذارید برای عدم تغییر)")).toHaveCount(0);
  });

  test("can change an employee password in edit modal", async ({ page }) => {
    await page.route("**/api/auth/employees/list/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          count: 1,
          results: [
            { id: 2, username: "doctor1", role: "employee", date_joined: "2026-01-01T00:00:00Z" },
          ],
        }),
      });
    });

    await page.goto("/settings");

    const employeeRow = page.getByRole("row").filter({ hasText: "doctor1" });
    await employeeRow.getByRole("button").first().click();
    await expect(page.getByText("ویرایش کاربر")).toBeVisible();
    await expect(page.getByLabel("رمز عبور (خالی بگذارید برای عدم تغییر)")).toBeVisible();
  });
});
