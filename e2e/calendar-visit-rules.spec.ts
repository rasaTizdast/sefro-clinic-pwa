import { test, expect } from "@playwright/test";
import { login, installMockBackend } from "./helpers";

test.describe("Calendar visit rules (issue #3, #8)", () => {
  test("blocks submit when mode=with and no pack selected", async ({ page }) => {
    await installMockBackend(page);
    await login(page);
    await page.goto("/calendar");
    await page.getByRole("button", { name: "نوبت جدید" }).click();
    // Set mode to with but do not select a pack
    await page.getByRole("radio", { name: "همراه با ولکام‌پک" }).check();
    await page.getByRole("button", { name: "تأیید" }).click();
    // Should show validation error
    await expect(page.getByText("یک ولکام‌پک انتخاب کنید")).toBeVisible();
  });

  test("allows submit when mode=without", async ({ page }) => {
    await installMockBackend(page);
    await login(page);
    await page.goto("/calendar");
    await page.getByRole("button", { name: "نوبت جدید" }).click();
    // Set mode to without
    await page.getByRole("radio", { name: "بدون ولکام‌پک" }).check();
    await page.getByRole("button", { name: "تأیید" }).click();
    // Should proceed (no pack error)
    await expect(page.getByText("نوبت با موفقیت نهایی شد")).toBeVisible();
  });
});
