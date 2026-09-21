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
    await expect(page.getByRole("tab", { name: "تسویه پرسنل" })).toBeVisible();
  });

  test("shows sales tab by default", async ({ page }) => {
    await page.goto("/accounting");
    await expect(page.getByRole("tab", { name: "فروش" })).toHaveAttribute("aria-selected", "true");
  });

  test("can switch to payouts tab", async ({ page }) => {
    await page.goto("/accounting");
    await page.getByRole("tab", { name: "تسویه پرسنل" }).click();
    await expect(page.getByRole("tab", { name: "تسویه پرسنل" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  test("sales tab shows table with columns", async ({ page }) => {
    await page.goto("/accounting");
    await expect(page.getByRole("columnheader", { name: "تاریخ" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "مبلغ" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "وضعیت" })).toBeVisible();
  });
});
