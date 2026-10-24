import { expect, test, type Locator, type Page } from "@playwright/test";

import { installMockBackend, login } from "./helpers";

async function setupCalendar(page: Page): Promise<Locator> {
  await installMockBackend(page);
  await page.route("**/api/customers/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        count: 1,
        results: [
          {
            id: 801,
            first_name: "نوبت",
            last_name: "آزمایشی",
            mobile_number: "09123334455",
            national_id: "7778889990",
            is_active: true,
            visit_count: 0,
            last_visit: null,
            total_payments: 0,
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
        results: [{ id: 811, name: "ویزیت تست", time: 30, price: "100000", is_active: true }],
      }),
    });
  });
  await login(page);
  await page.goto("/calendar");
  await page.getByRole("button", { name: "نوبت جدید" }).click();
  const dialog = page.getByRole("dialog", { name: "نوبت جدید" });
  await dialog.getByText("نوبت آزمایشی", { exact: true }).click();
  await dialog.getByRole("button", { name: "بعدی" }).click();
  await dialog.getByRole("button", { name: /ویزیت تست/ }).click();
  return dialog;
}

async function finishTimeStep(dialog: Locator) {
  await dialog.getByRole("button", { name: "بعدی" }).click();
  const today = await dialog.evaluate(() =>
    new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
      day: "numeric",
      timeZone: "Asia/Tehran",
    }).format(new Date())
  );
  await dialog.getByRole("button", { name: today, exact: true }).click();
  await dialog
    .getByRole("button", { name: /^[۰-۹]+:[۰-۹]{2}\s/ })
    .first()
    .click();
}

test.describe("Calendar visit rules", () => {
  test("returns to the service step and explains when a welcome pack is required", async ({
    page,
  }) => {
    const dialog = await setupCalendar(page);
    await dialog.getByRole("button", { name: "همراه با ولکام‌پک" }).click();
    await finishTimeStep(dialog);
    await dialog.getByRole("button", { name: "ثبت نوبت" }).click();

    await expect(dialog.getByText("یک ولکام‌پک انتخاب کنید")).toBeVisible();
    await expect(dialog.getByText("انتخاب خدمت برای نوبت آزمایشی")).toBeVisible();
  });

  test("allows booking without a welcome pack", async ({ page }) => {
    const dialog = await setupCalendar(page);
    await dialog.getByRole("button", { name: "بدون ولکام‌پک" }).click();
    await finishTimeStep(dialog);
    await dialog.getByRole("button", { name: "ثبت نوبت" }).click();

    await expect(page.getByText("نوبت رزرو شد.")).toBeVisible();
    await expect(dialog).not.toBeVisible();
  });
});
