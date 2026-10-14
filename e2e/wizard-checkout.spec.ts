import { test, expect } from "@playwright/test";
import { login, installMockBackend } from "./helpers";

test.describe("Wizard checkout (issue #8)", () => {
  test("button disables synchronously on click", async ({ page }) => {
    await installMockBackend(page);
    await login(page);
    await page.goto("/wizard/payment");
    const submitBtn = page.getByRole("button", { name: "ثبت نهایی" });
    await submitBtn.click();
    // Button should be disabled immediately (before any mock resolves)
    await expect(submitBtn).toBeDisabled();
  });

  test("shows single success toast per submit", async ({ page }) => {
    await installMockBackend(page);
    await login(page);
    await page.goto("/wizard/payment");
    await page.getByRole("button", { name: "ثبت نهایی" }).click();
    // Only one success toast should be visible
    const toasts = page.locator("[role=status]").all();
    await expect(toasts).toHaveLength(1);
  });
});
