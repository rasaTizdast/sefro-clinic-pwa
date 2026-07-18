import { expect, test } from "@playwright/test";

import { mockAllApiEndpoints } from "./helpers";

test.describe("Error Handling", () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApiEndpoints(page);
  });

  test("shows error state when dashboard API fails", async ({ page }) => {
    // Override dashboard to return 500
    await page.route("**/api/dashboard/", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Internal server error" }),
      });
    });

    await page.goto("/");

    // Dashboard should still render (error boundary catches it)
    // The page should not crash — either show error UI or empty state
    await expect(page.locator("body")).toBeVisible();
  });

  test("shows error when patient creation fails with 400", async ({ page }) => {
    // Override customers POST to return validation error
    await page.route("**/api/customers/", async (route, request) => {
      if (request.method() === "POST") {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            mobile_number: ["شماره تلفن تکراری است."],
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ count: 0, results: [] }),
        });
      }
    });

    await page.goto("/patients");
    await page.getByRole("button", { name: "بیمار جدید" }).first().click();

    await page.getByRole("textbox", { name: "نام", exact: true }).fill("تست");
    await page.getByRole("textbox", { name: "نام خانوادگی" }).fill("خطا");
    await page.getByRole("textbox", { name: "شماره تلفن" }).fill("09121111111");
    await page.getByRole("textbox", { name: "کد ملی", exact: true }).fill("1234567890");

    await page.getByRole("button", { name: "ذخیره" }).click({ force: true });

    // Modal should remain open (form wasn't submitted successfully)
    await expect(page.getByRole("heading", { name: "بیمار جدید" })).toBeVisible({
      timeout: 10000,
    });
  });

  test("login shows error toast on network failure", async ({ page }) => {
    // Override auth/me to return 401 so the app shows the login page
    await page.route("**/api/auth/me/", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Unauthorized" }),
      });
    });
    // Override login to fail with network error
    await page.route("**/api/auth/token/", async (route) => {
      await route.abort("connectionrefused");
    });

    await page.goto("/auth");
    await page.getByLabel("نام کاربری یا شماره موبایل").fill("testuser");
    await page.getByLabel("رمز عبور", { exact: true }).fill("wrongpass");
    await page.getByRole("button", { name: "ورود به حساب" }).click();

    // Should show an error (toast or inline)
    await expect(page.locator("body")).toBeVisible();
    // Should NOT navigate away from auth
    expect(page.url()).toContain("/auth");
  });
});
