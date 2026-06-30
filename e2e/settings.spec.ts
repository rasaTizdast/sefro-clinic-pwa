import { expect, test } from "@playwright/test";
import { clickSave } from "./helpers";

test.describe("Settings", () => {
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

  test("validates password change fields", async ({ page }) => {
    await page.goto("/settings");

    await page.getByRole("textbox", { name: "رمز جدید", exact: true }).fill("123");
    await page.getByLabel("تکرار رمز جدید").fill("456");
    await page.getByRole("button", { name: "تغییر رمز" }).first().click();
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
    await page.goto("/settings");
    await page.getByRole("button", { name: "کاربر جدید" }).click();

    const username = `user${Date.now()}`;
    await page.getByLabel("نام کاربری").fill(username);
    await page.getByLabel("رمز عبور").fill("TestPass123");

    await clickSave(page, page.getByRole("dialog").getByRole("button", { name: "ذخیره" }));
    await expect(page.getByText("افزودن کاربر جدید")).not.toBeVisible({ timeout: 10000 });
  });
});
