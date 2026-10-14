import { test, expect } from "@playwright/test";
import { login, installMockBackend } from "./helpers";

test.describe("Visit complete staff (issue #5)", () => {
  test("blocks complete on compensable visit with informative alert", async ({ page }) => {
    await installMockBackend(page);
    await login(page);
    await page.goto("/calendar");
    // Open a compensable visit (service with compensation_role=doctor)
    await page.getByRole("button", { name: "نمایش نوبت‌ها" }).click();
    // Click complete on a compensable visit without staff
    await page.getByRole("button", { name: "تکمیل نوبت" }).first().click();
    // Should show informative alert, not an error
    await expect(page.getByText("این نوبت شامل خدمات قابل تسویه پرسنل است")).toBeVisible();
  });
});
