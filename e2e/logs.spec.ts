import { expect, test } from "@playwright/test";

test.describe("Logs", () => {
  test("displays logs page with all elements", async ({ page }) => {
    await page.goto("/logs");
    await expect(page.getByRole("heading", { name: "لاگ سیستم" })).toBeVisible();
    await expect(page.getByText("ثبت رویدادهای مهم سیستم")).toBeVisible();
    await expect(page.getByText("رویدادها").first()).toBeVisible();
    await expect(page.getByPlaceholder("جستجو در لاگ‌ها...")).toBeVisible();
  });

  test("shows log table columns", async ({ page }) => {
    await page.goto("/logs");
    await expect(page.getByRole("table").getByText("کاربر")).toBeVisible();
    await expect(page.getByRole("table").getByText("عملیات")).toBeVisible();
    await expect(page.getByRole("table").getByText("مدل")).toBeVisible();
    await expect(page.getByRole("table").getByText("محتوا")).toBeVisible();
    await expect(page.getByRole("table").getByText("زمان")).toBeVisible();
  });

  test("searches logs", async ({ page }) => {
    await page.goto("/logs");
    const searchBox = page.getByPlaceholder("جستجو در لاگ‌ها...");
    await searchBox.fill("مشتری");
    await page.waitForTimeout(500);
  });
});
