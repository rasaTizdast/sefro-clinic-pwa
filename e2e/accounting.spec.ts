import { expect, test } from "@playwright/test";

test.describe("Accounting", () => {
  test("displays accounting page with all elements", async ({ page }) => {
    await page.goto("/accounting");
    await expect(page.getByRole("heading", { name: "حسابداری" })).toBeVisible();
    await expect(page.getByText("درآمد امروز")).toBeVisible();
    await expect(page.getByRole("button", { name: "ثبت تراکنش" })).toBeVisible();
    await expect(page.getByRole("button", { name: "گزارش اکسل" })).toBeVisible();
  });

  test("shows period filter options", async ({ page }) => {
    await page.goto("/accounting");
    await expect(page.getByRole("button", { name: "روزانه" })).toBeVisible();
    await expect(page.getByRole("button", { name: "هفتگی" })).toBeVisible();
    await expect(page.getByRole("button", { name: "ماهانه" })).toBeVisible();
    await expect(page.getByRole("button", { name: "۳ ماهه" })).toBeVisible();
    await expect(page.getByRole("button", { name: "سالانه" })).toBeVisible();
  });

  test('filters by "ماهانه" period', async ({ page }) => {
    await page.goto("/accounting");
    await page.getByRole("button", { name: "ماهانه" }).click();
    await page.waitForTimeout(1000);
  });

  test("displays transaction table with correct columns", async ({ page }) => {
    await page.goto("/accounting");
    await expect(page.getByRole("columnheader", { name: "تاریخ" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "بیمار" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "مبلغ (تومان)" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "روش پرداخت" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "وضعیت" })).toBeVisible();
  });
});
