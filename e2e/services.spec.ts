import { expect, test } from "@playwright/test";

import { clickSave, mockAllApiEndpoints } from "./helpers";

test.describe("Services", () => {
  test("displays services page with all elements", async ({ page }) => {
    await mockAllApiEndpoints(page);
    await page.goto("/services");
    await expect(page.getByRole("heading", { name: "خدمات کلینیک" })).toBeVisible();
    await expect(page.getByRole("button", { name: "خدمت جدید" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "عنوان خدمت" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "مدت (دقیقه)" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "قیمت" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "وضعیت" })).toBeVisible();
  });

  test("creates a new service", async ({ page }) => {
    await mockAllApiEndpoints(page);
    await page.route("**/api/services/**", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            id: 9999,
            name: "new service",
            time: 30,
            price: "500000",
            is_active: true,
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ count: 0, results: [] }),
        });
      }
    });
    await page.route("**/api/finance/service-items/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ count: 0, results: [] }),
      });
    });

    await page.goto("/services");
    await page.getByRole("button", { name: "خدمت جدید" }).click();

    const title = `خدمت تستی ${Date.now()}`;
    await page.getByLabel("نام خدمت").fill(title);
    await page.getByLabel("مدت زمان (دقیقه)").fill("30");
    await page.getByLabel("قیمت (تومان)").fill("500000");

    await clickSave(page);

    await expect(page.getByRole("heading", { name: "خدمت جدید" })).not.toBeVisible({
      timeout: 10000,
    });
  });

  test("edits an existing service", async ({ page }) => {
    await mockAllApiEndpoints(page);
    // Override services endpoint to return data
    await page.route("**/api/services/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          count: 1,
          results: [{ id: 1, name: "testsvc", time: 30, price: "500000", is_active: true }],
        }),
      });
    });
    await page.route("**/api/finance/service-items/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ count: 0, results: [] }),
      });
    });

    await page.goto("/services");

    const actionsBtn = page.locator("table tbody tr").first().locator("button").first();
    await actionsBtn.waitFor({ state: "visible", timeout: 10000 });
    await actionsBtn.click();
    await page.getByRole("menuitem", { name: "ویرایش" }).click();

    const editedTitle = `ویرایش شده ${Date.now()}`;
    await page.getByLabel("نام خدمت").clear();
    await page.getByLabel("نام خدمت").fill(editedTitle);

    await clickSave(page);

    await expect(page.getByRole("heading", { name: "ویرایش خدمت" })).not.toBeVisible({
      timeout: 10000,
    });
  });
});
