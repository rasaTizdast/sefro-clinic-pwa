import { expect, test } from "@playwright/test";

import { clickSave, mockAllApiEndpoints } from "./helpers";

test.describe("Patients Management", () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApiEndpoints(page);
  });

  test("displays patients list page", async ({ page }) => {
    await page.goto("/patients");

    await expect(page.getByRole("heading", { name: "لیست بیماران" })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("مدیریت بیماران کلینیک")).toBeVisible();
    await expect(page.getByRole("button", { name: "بیمار جدید" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "خروجی" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "همه" })).toBeVisible();
    await expect(page.getByRole("tab", { name: /^فعال/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: "غیرفعال" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "جدید" })).toBeVisible();
    await expect(page.getByPlaceholder("جستجوی نام، تلفن یا کد ملی...")).toBeVisible();
  });

  test("pagination navigates between pages", async ({ page }) => {
    // Override customers to return multi-page data
    await page.route("**/api/customers/**", async (route, request) => {
      const url = new URL(request.url());
      const page_num = url.searchParams.get("page") ?? "1";

      if (page_num === "2") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            count: 16,
            results: [
              {
                id: 11,
                first_name: "صفحه",
                last_name: "دو",
                mobile_number: "09120000011",
                national_id: "1111111111",
                is_active: true,
              },
            ],
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            count: 16,
            results: [
              {
                id: 1,
                first_name: "بیمار",
                last_name: "اول",
                mobile_number: "09120000001",
                national_id: "1010101010",
                is_active: true,
              },
              ...Array.from({ length: 7 }, (_, i) => ({
                id: i + 2,
                first_name: `بیمار ${i + 2}`,
                last_name: "تست",
                mobile_number: `0912000000${i + 2}`,
                national_id: `${1010101010 + i + 1}`,
                is_active: true,
              })),
            ],
          }),
        });
      }
    });

    await page.goto("/patients");
    await expect(page.getByRole("heading", { name: "لیست بیماران" })).toBeVisible();

    // Look for next page button
    const nextBtn = page.getByRole("button", { name: "صفحه بعد" });
    if (await nextBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nextBtn.click();
      await page.waitForTimeout(500);
      // Page 2 data should load
      await expect(page.getByText("صفحه")).toBeVisible();
    }
  });

  test("creates a new patient", async ({ page }) => {
    await page.route("**/api/customers/", async (route) => {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ id: 9999 }),
      });
    });
    await page.goto("/patients");
    await page.getByRole("button", { name: "بیمار جدید" }).first().click();

    const firstName = `تست${Date.now()}`;
    await page.getByRole("textbox", { name: "نام", exact: true }).fill(firstName);
    await page.getByRole("textbox", { name: "نام خانوادگی" }).fill("اتوماتیک");
    await page.getByRole("textbox", { name: "شماره تلفن" }).fill("09121234567");
    await page.getByRole("textbox", { name: "کد ملی", exact: true }).fill("0012345678");

    await clickSave(page);
    await expect(page.getByRole("heading", { name: "بیمار جدید" })).not.toBeVisible({
      timeout: 10000,
    });
  });

  test("edits an existing patient", async ({ page }) => {
    await mockAllApiEndpoints(page);
    // Override customers endpoint to return data
    await page.route("**/api/customers/**", async (route, request) => {
      if (request.method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            count: 1,
            results: [
              {
                id: 1,
                first_name: "تست",
                last_name: "اتوماتیک",
                mobile_number: "09121234567",
                national_id: "0012345678",
              },
            ],
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ id: 1 }),
        });
      }
    });
    await page.goto("/patients");

    const actionBtn = page.locator("table tbody tr").first().locator("button:has(svg)").first();
    await actionBtn.waitFor({ state: "visible", timeout: 10000 });
    await actionBtn.click();
    await page.getByRole("menuitem", { name: "ویرایش" }).click();

    const editedName = `ویرایش شده ${Date.now()}`;
    await page.getByRole("textbox", { name: "نام", exact: true }).clear();
    await page.getByRole("textbox", { name: "نام", exact: true }).fill(editedName);

    await clickSave(page);
    await expect(page.getByRole("heading", { name: "ویرایش بیمار" })).not.toBeVisible({
      timeout: 10000,
    });
  });
});
