import { expect, test } from "@playwright/test";

test.describe("Authentication", () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test("shows login page with all elements", async ({ page }) => {
    await page.goto("/auth");

    await expect(page.getByText("کلینیک سفرو", { exact: true })).toBeVisible();
    await expect(page.getByText("ورود به حساب کاربری")).toBeVisible();
    await expect(page.getByLabel("نام کاربری یا شماره موبایل")).toBeVisible();
    await expect(page.getByLabel("رمز عبور", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "ورود به حساب" })).toBeVisible();
    await expect(page.getByText("مرا به خاطر بسپار")).toBeVisible();
  });

  test("shows validation errors with empty fields", async ({ page }) => {
    await page.goto("/auth");
    await page.getByRole("button", { name: "ورود به حساب" }).click();

    await expect(page.getByText("خطا در اطلاعات")).toBeVisible();
  });

  test("logs in with valid credentials and redirects to dashboard", async ({ page }) => {
    await page.goto("/auth");
    await page.getByLabel("نام کاربری یا شماره موبایل").fill("sefro_admin");
    await page.getByLabel("رمز عبور", { exact: true }).fill("SefroClinic@2026");
    await page.getByRole("button", { name: "ورود به حساب" }).click();

    await page.waitForURL("/");
    await expect(page.getByRole("heading", { name: "داشبورد" })).toBeVisible();
    await expect(page.getByText("امروز:", { exact: false })).toBeVisible();
  });

  test("shows error with invalid credentials", async ({ page }) => {
    await page.goto("/auth");
    await page.getByLabel("نام کاربری یا شماره موبایل").fill("wrong_user");
    await page.getByLabel("رمز عبور", { exact: true }).fill("wrong_pass");
    await page.getByRole("button", { name: "ورود به حساب" }).click();

    await expect(page.getByText("خطا در اطلاعات")).toBeVisible();
  });
});
