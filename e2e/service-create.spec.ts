import { test, expect } from "@playwright/test";
import { login, installMockBackend } from "./helpers";

test.describe("Service create (issue #2)", () => {
  test("accepts service with Toman price only", async ({ page }) => {
    await installMockBackend(page);
    await login(page);
    await page.goto("/services");
    await page.getByRole("button", { name: "افزودن سرویس" }).click();
    await page.getByRole("textbox", { name: "نام" }).fill("کوتاهی مو");
    await page.getByRole("spinbutton", { name: "زمان" }).fill("30");
    await page.getByRole("spinbutton", { name: "قیمت (تومان)" }).fill("150000");
    await page.getByRole("button", { name: "ذخیره" }).click();
    await expect(page.getByText("سرویس با موفقیت ایجاد شد")).toBeVisible();
  });

  test("rejects price_usd: null with fa message", async ({ page }) => {
    await installMockBackend(page);
    await login(page);
    await page.goto("/services");
    await page.getByRole("button", { name: "افزودن سرویس" }).click();
    await page.getByRole("textbox", { name: "نام" }).fill("تایه آزمایشی");
    await page.getByRole("spinbutton", { name: "زمان" }).fill("30");
    await page.getByRole("spinbutton", { name: "قیمت (تومان)" }).fill("150000");
    // The contract mock rejects price_usd: null - this test documents the rule
    await expect(page.getByText("این مقدار نباید توهی باشد.")).toBeVisible();
  });
});
