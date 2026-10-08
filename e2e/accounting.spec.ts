import { expect, test } from "@playwright/test";

import { mockAllApiEndpoints } from "./helpers";

test.describe("Accounting - Sales Tab", () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApiEndpoints(page);
  });

  test("displays accounting page with sales tab", async ({ page }) => {
    await page.goto("/accounting");
    await expect(page.getByRole("heading", { name: "حسابداری" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "فروش" })).toBeVisible();
    // Staff claims + payouts live behind the merged «پرسنل» tab now.
    await expect(page.getByRole("tab", { name: "پرسنل", exact: true })).toBeVisible();
  });

  test("shows sales tab by default", async ({ page }) => {
    await page.goto("/accounting");
    await expect(page.getByRole("tab", { name: "فروش" })).toHaveAttribute("aria-selected", "true");
  });

  test("can switch to payouts tab", async ({ page }) => {
    await page.goto("/accounting");
    await page.getByRole("tab", { name: "پرسنل", exact: true }).click();
    const payoutsTab = page.getByRole("tab", { name: "تسویه پرسنل" });
    await payoutsTab.click();
    await expect(payoutsTab).toHaveAttribute("aria-selected", "true");
  });

  test("sales tab shows the unsettled completed visits card", async ({ page }) => {
    await page.goto("/accounting");
    await expect(page.getByText("نوبت‌های تکمیل‌شده و تسویه‌نشده")).toBeVisible();
  });
});
