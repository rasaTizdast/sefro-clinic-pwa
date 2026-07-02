import { expect, test } from "@playwright/test";

import { clickSave, mockAllApiEndpoints } from "./helpers";

test.describe("Warehouse", () => {
  test("displays warehouse page with all elements", async ({ page }) => {
    await mockAllApiEndpoints(page);
    await page.goto("/warehouse");
    await expect(page.getByRole("heading", { name: "مدیریت انبار" })).toBeVisible();
    await expect(page.getByRole("button", { name: "محصول جدید" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "نام محصول" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "موجودی" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "واحد", exact: true })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "قیمت واحد (تومان)" })).toBeVisible();
    await expect(page.getByPlaceholder("جستجوی محصول...")).toBeVisible();
  });

  test("creates a new product", async ({ page }) => {
    await mockAllApiEndpoints(page);
    await page.route("**/api/inventory/products/**", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ id: 9999 }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ count: 0, results: [] }),
        });
      }
    });

    await page.goto("/warehouse");
    await page.getByRole("button", { name: "محصول جدید" }).click();

    const name = `محصول تستی ${Date.now()}`;
    await page.getByLabel("نام محصول").fill(name);
    await page.getByLabel("تعداد موجودی").fill("50");
    await page.getByLabel("قیمت واحد (تومان)").fill("250000");

    await page.getByRole("combobox", { name: "واحد" }).click();
    await page.getByRole("option", { name: "عدد" }).click();

    await clickSave(page);

    await expect(page.getByRole("heading", { name: "محصول جدید" })).not.toBeVisible({
      timeout: 10000,
    });
  });

  test("edits a product", async ({ page }) => {
    // Manually set up only necessary API mocks, overriding products with data
    await page.route("**/api/auth/token/", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({}),
      });
    });
    await page.route("**/api/auth/token/refresh/", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({}),
      });
    });
    await page.route("**/api/auth/me/", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: 1,
          username: "sefro_admin",
          role: "admin",
          date_joined: "2026-01-01T00:00:00Z",
        }),
      });
    });
    await page.route("**/api/inventory/products/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          count: 1,
          results: [
            {
              id: 1,
              name: "testproduct",
              count: 10,
              unit: "عدد",
              unit_price: "100000",
              status: "available",
            },
          ],
        }),
      });
    });
    await page.route("**/api/inventory/products/1/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: 1 }),
      });
    });

    await page.goto("/warehouse");

    const editBtn = page.locator('button[aria-label="ویرایش"]').first();
    await editBtn.waitFor({ state: "visible", timeout: 10000 });
    await editBtn.click();

    const editedName = `ویرایش شده ${Date.now()}`;
    await page.getByLabel("نام محصول").clear();
    await page.getByLabel("نام محصول").fill(editedName);

    await clickSave(page);

    await expect(page.getByRole("heading", { name: "ویرایش محصول" })).not.toBeVisible({
      timeout: 10000,
    });
  });

  test("searches for a product", async ({ page }) => {
    await mockAllApiEndpoints(page);
    await page.goto("/warehouse");
    const searchBox = page.getByPlaceholder("جستجوی محصول...");
    await searchBox.fill("محصول");
    await page.waitForTimeout(500);
  });
});
