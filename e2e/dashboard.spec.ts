import { expect, test } from "@playwright/test";

import { mockAllApiEndpoints } from "./helpers";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApiEndpoints(page);
  });

  test("displays dashboard with stats cards and today appointments", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "داشبورد" })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("امروز:", { exact: false })).toBeVisible();

    await expect(page.getByText("مراجعین امروز")).toBeVisible();
    await expect(page.getByText("کل مشتریان")).toBeVisible();
    await expect(page.getByText("درآمد امروز")).toBeVisible();
    await expect(page.getByText("بیماران جدید")).toBeVisible();
    await expect(page.getByText("مشتریان وفادار")).toBeVisible();

    await expect(page.getByRole("heading", { name: "اقدامات سریع" })).toBeVisible();
    await expect(page.getByRole("button", { name: "نوبت جدید", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "بیمار جدید" })).toBeVisible();

    await expect(page.getByRole("heading", { name: "نوبت‌های امروز" })).toBeVisible();
  });

  test("quick action 'نوبت جدید' navigates to calendar", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "نوبت جدید", exact: true }).click();
    await page.waitForURL("**/calendar", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "تقویم نوبت‌ها" })).toBeVisible();
  });

  test("quick action 'بیمار جدید' opens patient modal", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "بیمار جدید" }).click();
    await expect(page.getByRole("heading", { name: "بیمار جدید" })).toBeVisible();
  });

  test("sidebar navigation links work for all routes", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "داشبورد" })).toBeVisible({ timeout: 10000 });

    const routes = [
      { label: "مراجعین", heading: "لیست بیماران" },
      { label: "حسابداری", heading: "حسابداری" },
      { label: "تقویم کلینیک", heading: "تقویم نوبت‌ها" },
      { label: "خدمات", heading: "خدمات کلینیک" },
      { label: "گزارش‌ها", heading: "گزارش‌ها و آمار" },
      { label: "مدیریت انبار", heading: "مدیریت انبار" },
      { label: "تنظیمات", heading: "تنظیمات" },
    ];

    for (const route of routes) {
      await page.getByRole("link", { name: route.label }).first().click();
      await expect(page.getByRole("heading", { name: route.heading })).toBeVisible({
        timeout: 10000,
      });
    }
  });
});
