import { expect, test } from "@playwright/test";
import { clickSave } from "./helpers";

test.describe("Services", () => {
  test("displays services page with all elements", async ({ page }) => {
    await page.goto("/services");
    await expect(page.getByRole("heading", { name: "خدمات کلینیک" })).toBeVisible();
    await expect(page.getByRole("button", { name: "خدمت جدید" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "عنوان خدمت" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "مدت (دقیقه)" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "قیمت (تومان)" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "وضعیت" })).toBeVisible();
  });

  test("creates a new service", async ({ page }) => {
    await page.goto("/services");
    await page.getByRole("button", { name: "خدمت جدید" }).click();

    const title = `خدمت تستی ${Date.now()}`;
    await page.getByLabel("نام خدمت").fill(title);
    await page.getByLabel("مدت زمان (دقیقه)").fill("30");
    await page.getByLabel("قیمت (تومان)").fill("500000");

    await clickSave(page);

    await expect(page.getByText(title).first()).toBeVisible();
  });

  test("edits an existing service", async ({ page }) => {
    await page.goto("/services");

    const actionsBtn = page.locator("table tbody tr").first().locator("button").first();
    await actionsBtn.waitFor({ state: "visible", timeout: 10000 });
    await actionsBtn.click();
    await page.getByRole("menuitem", { name: "ویرایش" }).click();

    const editedTitle = `ویرایش شده ${Date.now()}`;
    await page.getByLabel("نام خدمت").clear();
    await page.getByLabel("نام خدمت").fill(editedTitle);

    await clickSave(page);

    await expect(page.getByText(editedTitle).first()).toBeVisible();
  });
});
