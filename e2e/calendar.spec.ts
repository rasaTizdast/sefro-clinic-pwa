import { expect, test } from "@playwright/test";

test.describe("Calendar", () => {
  test("displays calendar page with all elements", async ({ page }) => {
    await page.goto("/calendar");
    await expect(page.getByText("تقویم نوبت‌ها")).toBeVisible();
    await expect(page.getByText("مدیریت و مشاهده نوبت‌ها")).toBeVisible();
    await expect(page.getByText("نوبت جدید")).toBeVisible();
    await expect(page.getByText("امروز").first()).toBeVisible();

    await expect(
      page.getByText(/شنبه|یکشنبه|دوشنبه|سه‌شنبه|چهارشنبه|پنجشنبه|جمعه/).first()
    ).toBeVisible();
  });

  test("opens new appointment wizard", async ({ page }) => {
    await page.goto("/calendar");
    await page.getByRole("button", { name: "نوبت جدید" }).click();

    await expect(page.getByRole("heading", { name: "نوبت جدید" })).toBeVisible();
    await expect(page.getByText("بیمار").last()).toBeVisible();
    await expect(page.getByText("خدمت").last()).toBeVisible();
    await expect(page.getByText("زمان").last()).toBeVisible();
    await expect(page.getByPlaceholder("نام یا تلفن بیمار را وارد کنید...")).toBeVisible();
  });

  test("navigates between months", async ({ page }) => {
    await page.goto("/calendar");
    const nextMonth = page.getByLabel("ماه بعد");
    const prevMonth = page.getByLabel("ماه قبل");

    await nextMonth.click();
    await prevMonth.click();
  });

  test("switches to appointment list view on mobile", async ({ page }) => {
    await page.goto("/calendar");
    const listBtn = page.getByText("لیست نوبت‌ها");
    if (await listBtn.isVisible()) {
      await listBtn.click();
    }
  });
});
