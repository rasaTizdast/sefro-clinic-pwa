import { expect, test } from "@playwright/test";

import { mockAllApiEndpoints } from "./helpers";

test.describe("Analytics", () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApiEndpoints(page);
  });

  test("displays analytics page with all elements", async ({ page }) => {
    await page.goto("/analytics");
    await expect(page.getByText("گزارش‌ها و آمار")).toBeVisible();
    await expect(page.getByText("مجموع مراجعین")).toBeVisible();
    await expect(page.getByText("درآمد کل")).toBeVisible();
    await expect(page.getByText("نرخ مراجعه مجدد")).toBeVisible();
    await expect(page.getByText("میانگین رضایت")).toBeVisible();
  });

  test("shows all chart sections", async ({ page }) => {
    await page.goto("/analytics");
    await expect(page.getByText("روند درآمد ماهانه")).toBeVisible();
    await expect(page.getByText("وضعیت نوبت‌ها")).toBeVisible();
    await expect(page.getByText("مقایسه مراجعه بیماران")).toBeVisible();
    await expect(page.getByText("محبوبیت دسته‌بندی خدمات")).toBeVisible();
  });

  test("has date range selector with all options", async ({ page }) => {
    await page.goto("/analytics");
    await page.getByRole("combobox").click();
    await expect(page.getByRole("option", { name: "امروز" })).toBeVisible();
    await expect(page.getByRole("option", { name: "این هفته" })).toBeVisible();
    await expect(page.getByRole("option", { name: "این ماه" })).toBeVisible();
    await expect(page.getByRole("option", { name: "سه ماه اخیر" })).toBeVisible();
    await expect(page.getByRole("option", { name: "امسال" })).toBeVisible();
  });

  test("switches date range filter", async ({ page }) => {
    await page.goto("/analytics");
    await page.getByRole("combobox").click();
    await page.getByRole("option", { name: "این هفته" }).click();
    await page.waitForTimeout(1000);
  });
});
