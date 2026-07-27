import { expect, test } from "@playwright/test";

import { mockAllApiEndpoints } from "./helpers";

test.describe("Responsive Layout", () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApiEndpoints(page);
  });

  test("desktop shows sidebar, mobile shows bottom nav", async ({ page }) => {
    // Desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "داشبورد" })).toBeVisible({ timeout: 10000 });

    // Sidebar should be visible on desktop
    const sidebar = page.locator("nav[aria-label='منوی اصلی']");
    await expect(sidebar).toBeVisible();

    // Switch to mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);

    // Bottom nav should be visible on mobile
    const bottomNav = page.locator("nav[aria-label='ناوبری موبایل']");
    await expect(bottomNav).toBeVisible();
  });

  test("dashboard stats cards stack on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    // Dashboard should render on mobile
    await expect(page.getByRole("heading", { name: "داشبورد" })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("مراجعین امروز")).toBeVisible();
  });
});
