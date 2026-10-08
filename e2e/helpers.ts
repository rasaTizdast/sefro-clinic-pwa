import type { Locator, Page } from "@playwright/test";

export async function login(page: Page, username?: string, password?: string) {
  const user = username ?? process.env.E2E_USERNAME ?? "";
  const pass = password ?? process.env.E2E_PASSWORD ?? "";
  await page.goto("/auth");
  await page.getByLabel("نام کاربری یا شماره موبایل").fill(user);
  await page.getByLabel("رمز عبور", { exact: true }).fill(pass);
  await page.getByRole("button", { name: "ورود به حساب" }).click();
  await page.waitForURL("/");
}

export async function clickSave(page: Page, locator?: Locator) {
  const btn = locator ?? page.getByRole("button", { name: "ذخیره" });
  await btn.click({ force: true });
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
  await fulfill(page, "**/api/reports/visits/**", 200, {
    currentCount: 0,
    previousCount: null,
    changePercent: null,
  });
  await fulfill(page, "**/api/inventory/products/**", 200, EMPTY_PAGINATED);
  await fulfill(page, "**/api/auth/employees/list/**", 200, EMPTY_PAGINATED);
  await fulfill(page, "**/api/work-time/**", 200, EMPTY_PAGINATED);
  await fulfill(page, "**/api/logs/**", 200, EMPTY_PAGINATED);
  await fulfill(page, "**/api/service-categories/**", 200, EMPTY_PAGINATED);

  // Accounting tab bar + report cards (registered before the specific summary
  // routes below: Playwright matches the most recently added route first)
  await fulfill(page, "**/api/finance/sales/**", 200, EMPTY_PAGINATED);
  await fulfill(page, "**/api/finance/product-usages/**", 200, EMPTY_PAGINATED);
  await fulfill(page, "**/api/finance/product-purchases/**", 200, EMPTY_PAGINATED);
  await fulfill(page, "**/api/finance/product-cost-history/**", 200, EMPTY_PAGINATED);
  await fulfill(page, "**/api/finance/staff-payouts/**", 200, EMPTY_PAGINATED);
  await fulfill(page, "**/api/finance/expenses/**", 200, EMPTY_PAGINATED);
  await fulfill(page, "**/api/finance/expense-categories/**", 200, EMPTY_PAGINATED);
  await fulfill(page, "**/api/finance/operating-expenses/**", 200, EMPTY_PAGINATED);
  await fulfill(page, "**/api/finance/operating-expense-categories/**", 200, []);
  await fulfill(page, "**/api/finance/reports/staff-payout-summary/**", 200, {
    totalCashUsd: "0.00",
    totalCashToman: "0",
    totalProductValueUsd: "0.00",
    totalProductValueToman: "0",
    totalPayoutUsd: "0.00",
    totalPayoutToman: "0",
    payoutCount: 0,
  });
  await fulfill(page, "**/api/finance/operating-expenses/summary/**", 200, {
    period: { start: "", end: "" },
    totalUsd: "0.00",
    totalToman: "0",
    count: 0,
    byCategory: [],
    byPaymentMethod: [],
  });
  await fulfill(page, "**/api/finance/reports/financial-summary/**", 200, {
    period: { start: "", end: "" },
    revenue: { usd: "0.00", toman: "0" },
    productCost: { usd: "0.00", toman: "0" },
    welcomePackCost: { usd: "0.00", toman: "0" },
    grossProfit: { usd: "0.00", toman: "0" },
    expenses: { usd: "0.00", toman: "0" },
    netProfit: { usd: "0.00", toman: "0" },
    paymentMethods: { cash: "0.00", card: "0.00", wallet: "0.00" },
    counts: {
      appointments: 0,
      packagesSold: 0,
      productsSoldQuantity: "0.000",
      paidSales: 0,
      averageTransactionValue: "0.00",
    },
  });
  await fulfill(page, "**/api/finance/reports/welcome-packs/**", 200, {
    period: { start: "", end: "" },
    totalUsageCount: 0,
    totalPacksIssued: "0",
    totalCostUsd: "0.00",
    totalCostToman: "0",
    byPack: [],
  });
}
