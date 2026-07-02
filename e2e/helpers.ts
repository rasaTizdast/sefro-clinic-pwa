import type { Locator, Page } from "@playwright/test";

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

function fulfill(page: Page, urlPattern: string, status: number, body: unknown) {
  return page.route(urlPattern, async (route) => {
    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
}

const MOCK_USER = {
  id: 1,
  username: "sefro_admin",
  role: "admin",
  date_joined: "2026-01-01T00:00:00Z",
};

/** Mock auth token + me endpoints (POST token, GET me) */
export async function mockAuthApi(page: Page) {
  await fulfill(page, "**/api/auth/token/refresh/", 401, { detail: "Token is invalid or expired" });
  await fulfill(page, "**/api/auth/token/", 200, { access: "mock-at", refresh: "mock-rt" });
  await fulfill(page, "**/api/auth/me/", 200, MOCK_USER);
}

/** Mock auth/me to return 401 (unauthenticated) */
export async function mockAuth401(page: Page) {
  await fulfill(page, "**/api/auth/token/refresh/", 401, { detail: "Token is invalid or expired" });
  await fulfill(page, "**/api/auth/token/", 200, { access: "mock-at", refresh: "mock-rt" });
  await fulfill(page, "**/api/auth/me/", 401, { detail: "Unauthorized" });
}

const EMPTY_PAGINATED = { count: 0, results: [] };

/** Mock all common API endpoints with sensible defaults so pages render without a real backend */
export async function mockAllApiEndpoints(page: Page) {
  await mockAuthApi(page);
  await fulfill(page, "**/api/dashboard/", 200, {
    today_visits: 5,
    total_customers: 120,
    today_revenue: 2500000,
    new_patients: 3,
    loyal_customers: 45,
  });
  // All paginated endpoints use ** suffix to match query params (e.g., ?page=1&per_page=8)
  await fulfill(page, "**/api/visits/**", 200, EMPTY_PAGINATED);
  await fulfill(page, "**/api/customers/**", 200, EMPTY_PAGINATED);
  await fulfill(page, "**/api/services/**", 200, EMPTY_PAGINATED);
  await fulfill(page, "**/api/payments/**", 200, EMPTY_PAGINATED);
  await fulfill(page, "**/api/reports/**", 200, {});
  await fulfill(page, "**/api/reports/all/**", 200, {});
  await fulfill(page, "**/api/reports/referral/**", 200, {});
  await fulfill(page, "**/api/reports/visits/**", 200, []);
  await fulfill(page, "**/api/inventory/products/**", 200, EMPTY_PAGINATED);
  await fulfill(page, "**/api/auth/employees/list/**", 200, EMPTY_PAGINATED);
  await fulfill(page, "**/api/work-time/**", 200, EMPTY_PAGINATED);
  await fulfill(page, "**/api/logs/**", 200, EMPTY_PAGINATED);
}
