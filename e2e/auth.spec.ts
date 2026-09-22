import { expect, test } from "@playwright/test";

import { mockAllApiEndpoints } from "./helpers";

test.describe("Authentication", () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    // Wait for the axios 401 interceptor redirect to /auth to settle
    await page.waitForURL("**/auth", { timeout: 10000 });
    await page.waitForLoadState("networkidle");
  });

  test("shows login page with all elements", async ({ page }) => {
    await page.goto("/auth");

    await expect(page.getByText("کلینیک زیبایی باران", { exact: true })).toBeVisible();
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
    // beforeEach already navigated to / which redirected to /auth
    // Set up mocks so login API calls succeed
    await mockAllApiEndpoints(page);

    await page.getByLabel("نام کاربری یا شماره موبایل").fill("sefro_admin");
    await page.getByLabel("رمز عبور", { exact: true }).fill("SefroClinic@2026");
    await page.getByRole("button", { name: "ورود به حساب" }).click();

    await page.waitForURL("**/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "داشبورد" })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("امروز:", { exact: false })).toBeVisible();
  });

  test("shows error with invalid credentials", async ({ page }) => {
    await page.goto("/auth");
    await page.getByLabel("نام کاربری یا شماره موبایل").fill("wrong_user");
    await page.getByLabel("رمز عبور", { exact: true }).fill("wrong_pass");
    await page.getByRole("button", { name: "ورود به حساب" }).click();

    await expect(page.getByText("خطا در اطلاعات")).toBeVisible();
  });

  test("logs out and redirects to auth page", async ({ page }) => {
    await mockAllApiEndpoints(page);

    // Mock logout endpoint
    await page.route("**/api/auth/logout/", async (route) => {
      await route.fulfill({ status: 204, body: "" });
    });

    // Start logged in
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "داشبورد" })).toBeVisible();

    // Click logout button in sidebar (may be outside viewport on tall sidebars)
    await page.getByRole("button", { name: "خروج از سیستم" }).dispatchEvent("click");

    // Should redirect to /auth
    await page.waitForURL("**/auth", { timeout: 10000 });
    await expect(page.getByRole("button", { name: "ورود به حساب" })).toBeVisible();
  });

  test("non-admin user is redirected away from /logs", async ({ page }) => {
    // Mock auth to return employee role
    await page.route("**/api/auth/token/refresh/", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({}),
      });
    });
    await page.route("**/api/auth/token/", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ access: "mock-at", refresh: "mock-rt" }),
      });
    });
    await mockAllApiEndpoints(page);
    // Re-override auth/me since mockAllApiEndpoints was called last
    await page.route("**/api/auth/me/", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: 2,
          username: "employee_user",
          role: "employee",
          date_joined: "2026-01-01T00:00:00Z",
        }),
      });
    });

    await page.goto("/logs");

    // RequireRole redirects to / when role doesn't match
    await page.waitForURL("**/", { timeout: 10000 });
    await expect(page.getByRole("heading", { name: "داشبورد" })).toBeVisible();
  });

  test("session expiry redirects to auth page", async ({ page }) => {
    // Start with valid auth
    await mockAllApiEndpoints(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "داشبورد" })).toBeVisible();

    // Simulate token expiry: override auth/me to return 401
    await page.route("**/api/auth/me/", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Token is invalid or expired" }),
      });
    });

    // Do a full page navigation to /patients — the RequireAuth guard re-checks auth on load
    // The app detects 401 and redirects to /auth via hard navigation
    // This causes a frame detach, so we catch the error and then wait for the new page
    const navigation = page.waitForNavigation({ timeout: 10000 }).catch(() => null);
    await page.goto("/patients");
    await navigation;

    // After redirect, the page should be on /auth
    await expect(page.getByRole("button", { name: "ورود به حساب" })).toBeVisible({
      timeout: 10000,
    });
  });
});
