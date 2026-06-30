import { expect, test } from "@playwright/test";
import { clickSave } from "./helpers";

test.describe("Warehouse", () => {
  test("displays warehouse page with all elements", async ({ page }) => {
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
    await page.goto("/warehouse");
    await page.getByRole("button", { name: "محصول جدید" }).click();

    const name = `محصول تستی ${Date.now()}`;
    await page.getByLabel("نام محصول").fill(name);
    await page.getByLabel("تعداد موجودی").fill("50");
    await page.getByLabel("قیمت واحد (تومان)").fill("250000");

    await page.getByRole("combobox", { name: "واحد" }).click();
    await page.getByRole("option", { name: "عدد" }).click();

    await clickSave(page);

    await expect(page.getByText(name).first()).toBeVisible();
  });

  test("edits a product", async ({ page }) => {
    await page.goto("/warehouse");

    const editBtn = page.locator('button[aria-label="ویرایش"]').first();
    await editBtn.waitFor({ state: "visible", timeout: 10000 });
    await editBtn.click();

    const editedName = `ویرایش شده ${Date.now()}`;
    await page.getByLabel("نام محصول").clear();
    await page.getByLabel("نام محصول").fill(editedName);

    await clickSave(page);

    await expect(page.getByText(editedName).first()).toBeVisible();
  });

  test("searches for a product", async ({ page }) => {
    await page.goto("/warehouse");
    const searchBox = page.getByPlaceholder("جستجوی محصول...");
    await searchBox.fill("محصول");
    await page.waitForTimeout(500);
  });
});
