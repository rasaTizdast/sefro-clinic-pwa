import { expect, test as setup } from "@playwright/test";

const authFile = "e2e/.auth/user.json";

const ADMIN_USERNAME = process.env.E2E_USERNAME ?? "sefro_admin";
const ADMIN_PASSWORD = process.env.E2E_PASSWORD ?? "SefroClinic@2026";

setup("authenticate as admin", async ({ page }) => {
  await page.goto("/auth", { waitUntil: "domcontentloaded" });

  await page.getByLabel("نام کاربری یا شماره موبایل").fill(ADMIN_USERNAME);
  await page.getByLabel("رمز عبور", { exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "ورود به حساب" }).click();

  await page.waitForURL("/");
  await expect(page.getByRole("heading", { name: "داشبورد" })).toBeVisible();

  await page.context().storageState({ path: authFile });
});
