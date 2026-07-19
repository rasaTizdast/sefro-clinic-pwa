import { expect, test as setup } from "@playwright/test";

import { mockAllApiEndpoints } from "./helpers";

const authFile = "e2e/.auth/user.json";

const ADMIN_USERNAME = process.env.E2E_USERNAME ?? "mock_admin";
const ADMIN_PASSWORD = process.env.E2E_PASSWORD ?? "mock_password";

const MOCK_USER = {
  id: 1,
  username: "sefro_admin",
  role: "admin",
  date_joined: "2026-01-01T00:00:00Z",
};

setup("authenticate as admin", async ({ page }) => {
  // Set up all endpoint mocks first (including auth/token and auth/me)
  await mockAllApiEndpoints(page);

  // Override auth routes LAST so they take precedence (Playwright uses LIFO order).
  // Use a flag so auth/me returns 401 before login but 200 after.
  let loggedIn = false;

  await page.route("**/api/auth/me/", async (route) => {
    if (loggedIn) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_USER),
      });
    } else {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Unauthorized" }),
      });
    }
  });

  await page.route("**/api/auth/token/refresh/", async (route) => {
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ detail: "Token is invalid or expired" }),
    });
  });

  await page.route("**/api/auth/token/", async (route) => {
    loggedIn = true;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ access: "mock-at", refresh: "mock-rt" }),
    });
  });

  await page.goto("/auth", { waitUntil: "domcontentloaded" });

  await page.getByLabel("نام کاربری یا شماره موبایل").fill(ADMIN_USERNAME);
  await page.getByLabel("رمز عبور", { exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "ورود به حساب" }).click();

  await page.waitForURL("**/");

  await page.context().storageState({ path: authFile });
});
