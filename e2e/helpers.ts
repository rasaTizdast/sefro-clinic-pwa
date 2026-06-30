import type { Page, Locator } from "@playwright/test";

export async function login(page: Page, username = "sefro_admin", password = "SefroClinic@2026") {
  await page.goto("/auth");
  await page.getByLabel("نام کاربری یا شماره موبایل").fill(username);
  await page.getByLabel("رمز عبور", { exact: true }).fill(password);
  await page.getByRole("button", { name: "ورود به حساب" }).click();
  await page.waitForURL("/");
}

export async function clickSave(page: Page, locator?: Locator) {
  const btn = locator ?? page.getByRole("button", { name: "ذخیره" });
  await btn.evaluate((el) => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
}
