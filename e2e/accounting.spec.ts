import { expect, test } from "@playwright/test";

import { mockAllApiEndpoints } from "./helpers";

test.describe("Accounting", () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApiEndpoints(page);
  });

  test("displays accounting page with default operating-expenses tab", async ({ page }) => {
    await page.goto("/accounting");
    await expect(page.getByRole("heading", { name: "حسابداری" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "هزینه‌های جاری" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "پرسنل", exact: true })).toBeVisible();
    await expect(page.getByRole("tab", { name: "بستن ماه" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "قوانین تسویه" })).toBeVisible();
    // Operating expenses is the default tab
    await expect(page.getByRole("tab", { name: "هزینه‌های جاری" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  test("shows the operating expenses list with its filters", async ({ page }) => {
    await page.goto("/accounting");
    await expect(page.getByRole("heading", { name: "لیست هزینه‌ها" })).toBeVisible();
    await expect(page.getByRole("button", { name: "هزینه جدید" })).toBeVisible();
  });

  test("personnel tab shows claims and payouts sub-tabs", async ({ page }) => {
    await page.goto("/accounting");
    await page.getByRole("tab", { name: "پرسنل", exact: true }).click();
    await expect(page.getByRole("tab", { name: "مطالبات پرسنل" })).toBeVisible();
    const payoutsTab = page.getByRole("tab", { name: "تسویه پرسنل" });
    await expect(payoutsTab).toBeVisible();
    await payoutsTab.click();
    await expect(payoutsTab).toHaveAttribute("aria-selected", "true");
  });
});
