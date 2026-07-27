import { expect, test } from "@playwright/test";

import { mockAllApiEndpoints } from "./helpers";

test.describe("Logs", () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApiEndpoints(page);
  });

  test("displays logs page with all elements", async ({ page }) => {
    await page.goto("/logs");
    await expect(page.getByRole("heading", { name: "لاگ سیستم" })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("ثبت رویدادهای مهم سیستم")).toBeVisible();
    await expect(page.getByText("رویدادها").first()).toBeVisible();
    await expect(page.getByPlaceholder("جستجو در لاگ‌ها...")).toBeVisible();
  });

  test("shows log table columns", async ({ page }) => {
    await mockAllApiEndpoints(page);
    // Override logs endpoint to return data
    await page.route("**/api/logs/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          count: 1,
          results: [
            {
              id: 1,
              user: 1,
              username: "admin",
              action: "CREATE",
              model_name: "customer",
              object_id: 1,
              object_repr: "test",
              changes: null,
              timestamp: "2026-07-02T10:00:00Z",
            },
          ],
        }),
      });
    });

    await page.goto("/logs");
    await expect(page.getByRole("columnheader", { name: "کاربر" })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("columnheader", { name: "عملیات" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "مدل" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "محتوا" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "زمان" })).toBeVisible();
  });
});
