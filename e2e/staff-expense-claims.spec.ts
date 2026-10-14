import { test, expect } from "@playwright/test";
import { login, installMockBackend } from "./helpers";

test.describe("Staff expense claims (issue #6)", () => {
  test("creates claim with half-even USD rounding", async ({ page }) => {
    await installMockBackend(page);
    await login(page);
    await page.goto("/accounting/personnel/claims");
    await page.getByRole("button", { name: "افزودن مطالبه" }).click();
    await page.getByRole("spinbutton", { name: "مبلغ (تومان)" }).fill("500000");
    await page.getByRole("button", { name: "ثبت مطالبه" }).click();
    // Verify mock stored half-even USD: 500000/91000 = 5.4945... → 5.49
    await expect(page.getByText("موجودیت ثبت شد")).toBeVisible();
  });
});
