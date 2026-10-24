import { test, expect } from "@playwright/test";
import { login, mockAllApiEndpoints } from "./helpers";

test.describe("Extra products auto-add (issue #4)", () => {
  test("selecting product adds row without add button", async ({ page }) => {
    await mockAllApiEndpoints(page);
    await page.route("**/api/inventory/products/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          count: 1,
          results: [
            {
              id: 50,
              name: "سرم ویتامین",
              count: 10,
              unit: "عدد",
              unit_price: "50000",
              status: "available",
            },
          ],
        }),
      });
    });
    await page.route("**/api/customers/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          count: 1,
          results: [
            {
              id: 201,
              first_name: "نوبت",
              last_name: "تستی",
              mobile_number: "09121112233",
              is_active: true,
            },
          ],
        }),
      });
    });
    await page.route("**/api/services/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          count: 1,
          results: [{ id: 301, name: "ویزیت عمومی", time: 30, price: "150000", is_active: true }],
        }),
      });
    });
    await login(page);
    await page.goto("/wizard");
    await page.getByRole("button", { name: "پذیرش جدید" }).click();
    await page.getByLabel("جستجوی بیمار").fill("نوبت");
    await page.getByText("نوبت تستی").first().click();
    await page.getByRole("button", { name: "ادامه" }).click();
    await page.getByText("ویزیت عمومی").first().click();
    const productPicker = page.getByRole("combobox", { name: "محصول جدید" });
    await productPicker.click();
    const productOption = page.getByRole("option", { name: /سرم ویتامین/ });
    await expect(productOption).toBeVisible();
    await productOption.click();
    // Row should appear
    await expect(page.getByText("سرم ویتامین")).toBeVisible();
    // The add button should be gone
    await expect(page.getByRole("button", { name: "افزودن محصول" })).not.toBeVisible();
  });
});
