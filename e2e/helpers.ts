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

export async function installMockBackend(page: Page) {
  const { installMockBackend: install } = await import("./mocks/server");
  await install(page);
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
    // Exact field names of backend `DashboardAPIView` (customers/views.py:101-118):
    customer_count: 120,
    loyal_customer_count: 45,
    today_sales: "2500000",
    today_visits: 5,
    new_customers: 3,
  });
  // All paginated endpoints use ** suffix to match query params (e.g., ?page=1&per_page=8)
  await fulfill(page, "**/api/visits/**", 200, EMPTY_PAGINATED);
  await fulfill(page, "**/api/customers/**", 200, EMPTY_PAGINATED);
  await fulfill(page, "**/api/services/**", 200, EMPTY_PAGINATED);
  await fulfill(page, "**/api/reports/**", 200, {});
  await fulfill(page, "**/api/reports/all/**", 200, {});
  await fulfill(page, "**/api/reports/referral/**", 200, {});
  await fulfill(page, "**/api/reports/visits/**", 200, {
    currentCount: 0,
    previousCount: null,
    changePercent: null,
  });
  // Exchange-rate quote (finance/views.py ExchangeRateReportView). Registered after the
  // generic /reports/** route above so Playwright prefers this one; the real endpoint
  // returns 503 when no rate exists, but a valid quote keeps checkout/rate UIs usable.
  await fulfill(page, "**/api/reports/exchange-dollar/**", 200, {
    currency_from: "USD",
    currency_to: "TOMAN",
    rate: "88000",
    rate_toman_per_usd: "88000",
    effective_at: "1405/07/28 00:00",
    source: "mock",
  });
  await fulfill(page, "**/api/inventory/products/**", 200, EMPTY_PAGINATED);
  // Employee directory: generic CRUD first, then the list route (Playwright prefers
  // the most recently added match, so /list/ below wins over this catch-all).
  await fulfill(page, "**/api/auth/employees/**", 200, EMPTY_PAGINATED);
  await fulfill(page, "**/api/auth/employees/list/**", 200, EMPTY_PAGINATED);
  await fulfill(page, "**/api/auth/logout/**", 200, {});
  await fulfill(page, "**/api/logs/**", 200, EMPTY_PAGINATED);
  await fulfill(page, "**/api/finance/exchange-rates/**", 200, EMPTY_PAGINATED);

  // Catalogs the wizard/calendar prefetch (GET lists unless a spec overrides POSTs)
  await fulfill(page, "**/api/finance/packages/**", 200, EMPTY_PAGINATED);
  await fulfill(page, "**/api/finance/package-items/**", 200, EMPTY_PAGINATED);
  await fulfill(page, "**/api/finance/package-services/**", 200, EMPTY_PAGINATED);
  await fulfill(page, "**/api/finance/service-items/**", 200, EMPTY_PAGINATED);
  await fulfill(page, "**/api/finance/welcome-packs/**", 200, EMPTY_PAGINATED);
  await fulfill(page, "**/api/finance/welcome-pack-usages/**", 200, EMPTY_PAGINATED);
  await fulfill(page, "**/api/finance/staff-compensation-rules/**", 200, EMPTY_PAGINATED);
  // record-consumption POST /finance/visits/:id/record-consumption/ during checkout
  await fulfill(page, "**/api/finance/visits/**", 200, {});

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
  // Profit reports answer with a bare list of rows (finance/views.py ProfitBy*View)
  await fulfill(page, "**/api/finance/reports/profit-by-service/**", 200, []);
  await fulfill(page, "**/api/finance/reports/profit-by-package/**", 200, []);
  await fulfill(page, "**/api/finance/reports/profit-by-staff/**", 200, []);
  await fulfill(page, "**/api/finance/reports/profit-by-staff/coverage/**", 200, {
    total_visits: 0,
    visits_with_staff: 0,
    unassigned_visits: 0,
  });
  // Finance dashboard: sales_summary + operational defaults (frontend fills gaps)
  await fulfill(page, "**/api/finance/reports/dashboard/**", 200, {
    period: { start: "", end: "" },
    salesSummary: {
      revenueUsd: "0.00",
      revenueToman: "0",
      grossProfitUsd: "0.00",
      grossProfitToman: "0",
      expensesUsd: "0.00",
      expensesToman: "0",
      netProfitUsd: "0.00",
      netProfitToman: "0",
      totalPayoutUsd: "0.00",
      totalPayoutToman: "0",
      saleCount: 0,
      avgTicketUsd: "0.00",
      clinicShareUsd: "0.00",
      clinicShareToman: "0",
      paymentMethods: { cash: "0.00", card: "0.00", wallet: "0.00" },
    },
    operational: { visitsCompleted: 0, newCustomers: 0, staffPayoutCount: 0 },
  });
  // Monthly close: one month at a time; frontend renders an empty month gracefully
  await fulfill(page, "**/api/finance/reports/monthly-close/**", 200, {
    calendar: "shamsi",
    year: 1405,
    month: null,
    months: [],
    yearTotal: {},
    closedMonthCount: 0,
  });
}
