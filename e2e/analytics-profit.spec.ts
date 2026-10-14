import { test, expect } from "@playwright/test";
import { login, installMockBackend } from "./helpers";

test.describe("Analytics profit tables", () => {
  test("shows informative empty state when no completed visits", async ({ page }) => {
    await installMockBackend(page);
    await login(page);
    await page.goto("/analytics");
    // Switch to financial tab
    await page.getByRole("tab", { name: "مالی" }).click();
    // Wait for tables to load
    await page.waitForTimeout(500);
    // Should show empty state with explanation
    await expect(page.getByText("خدمت تکمیل‌شده‌ای در این بازه وجود ندارد")).toBeVisible();
  });
});
