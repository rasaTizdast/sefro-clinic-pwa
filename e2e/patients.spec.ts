import { expect, test } from "@playwright/test";
import { clickSave } from "./helpers";

test.describe("Patients Management", () => {
  test("displays patients list page", async ({ page }) => {
    await page.goto("/patients");

    await expect(page.getByRole("heading", { name: "لیست بیماران" })).toBeVisible();
    await expect(page.getByText("مدیریت بیماران کلینیک")).toBeVisible();
    await expect(page.getByRole("button", { name: "بیمار جدید" })).toBeVisible();
    await expect(page.getByRole("button", { name: "خروجی" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "همه" })).toBeVisible();
    await expect(page.getByRole("tab", { name: /^فعال/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: "غیرفعال" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "جدید" })).toBeVisible();
    await expect(page.getByPlaceholder("جستجوی نام، تلفن یا کد ملی...")).toBeVisible();
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
    await page.route("**/api/customers/", async (route, request) => {
      if (request.method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([
            {
              id: 1,
              firstName: "تست",
              lastName: "اتوماتیک",
              mobileNumber: "09121234567",
              nationalId: "0012345678",
            },
          ]),
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

  test("searches for patients", async ({ page }) => {
    await page.goto("/patients");
    const searchBox = page.getByPlaceholder("جستجوی نام، تلفن یا کد ملی...");
    await searchBox.fill("تست");
    await page.waitForTimeout(500);
  });

  test("filters patients by tab", async ({ page }) => {
    await page.goto("/patients");
    await page.getByRole("tab", { name: /^فعال/ }).click();
    await page.waitForTimeout(500);
  });
});
