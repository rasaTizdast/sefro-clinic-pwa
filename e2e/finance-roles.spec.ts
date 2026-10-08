import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

function fulfill(page: Page, urlPattern: string, status: number, body: unknown) {
  return page.route(urlPattern, async (route) => {
    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
}

const EMPLOYEE_USER = {
  id: 2,
  username: "sefro_employee",
  role: "employee",
  date_joined: "2026-01-01T00:00:00Z",
};

const ADMIN_USER = {
  id: 1,
  username: "sefro_admin",
  role: "admin",
  date_joined: "2026-01-01T00:00:00Z",
};

async function mockAuthAs(page: Page, user: typeof ADMIN_USER) {
  await fulfill(page, "**/api/auth/token/refresh/", 401, { detail: "Token is invalid or expired" });
  await fulfill(page, "**/api/auth/token/", 200, { access: "mock-at", refresh: "mock-rt" });
  await fulfill(page, "**/api/auth/me/", 200, user);
}

async function mockFinanceEndpoints(page: Page) {
  await fulfill(page, "**/api/finance/sales/**", 200, { count: 0, results: [] });
  await fulfill(page, "**/api/finance/staff-payouts/**", 200, { count: 0, results: [] });
  await fulfill(page, "**/api/finance/expenses/**", 200, { count: 0, results: [] });
  await fulfill(page, "**/api/finance/expense-categories/**", 200, { count: 0, results: [] });
  await fulfill(page, "**/api/finance/packages/**", 200, { count: 0, results: [] });
  await fulfill(page, "**/api/finance/exchange-rates/**", 200, { count: 0, results: [] });
  await fulfill(page, "**/api/finance/service-items/**", 200, []);
  await fulfill(page, "**/api/finance/product-purchases/**", 200, { count: 0, results: [] });
  await fulfill(page, "**/api/finance/product-usages/**", 200, { count: 0, results: [] });
  await fulfill(page, "**/api/reports/exchange-dollar/**", 200, {
    rate: "42000",
    rate_toman_per_usd: "42000",
    effective_at: "2026-09-20T00:00:00Z",
    source: "manual",
  });
  await fulfill(page, "**/api/reports/backup-exchange/**", 200, {
    rate: "42000",
    rate_toman_per_usd: "42000",
    effective_at: "2026-09-20T00:00:00Z",
    source: "backup",
    provider: "backup_provider",
  });
  await fulfill(page, "**/api/service-categories/**", 200, { count: 0, results: [] });
  await fulfill(page, "**/api/services/**", 200, { count: 0, results: [] });
  await fulfill(page, "**/api/visits/**", 200, { count: 0, results: [] });
  await fulfill(page, "**/api/inventory/products/**", 200, { count: 0, results: [] });
  await fulfill(page, "**/api/auth/employees/list/**", 200, { count: 0, results: [] });
  await fulfill(page, "**/api/finance/staff-compensation-rules/**", 200, { count: 0, results: [] });
  await fulfill(page, "**/api/finance/operating-expenses/summary/**", 200, {
    period: { start: "", end: "" },
    totalUsd: "0.00",
    totalToman: "0",
    count: 0,
    byCategory: [],
    byPaymentMethod: [],
  });
  await fulfill(page, "**/api/finance/operating-expenses/**", 200, { count: 0, results: [] });
  await fulfill(page, "**/api/finance/operating-expense-categories/**", 200, []);
  await fulfill(page, "**/api/finance/reports/dashboard/**", 200, {
    period: { start: "2026-09-20", end: "2026-09-20" },
    sales_summary: {
      revenue_usd: "0",
      revenue_toman: "0",
      gross_profit_usd: "0",
      gross_profit_toman: "0",
      expenses_usd: "0",
      expenses_toman: "0",
      net_profit_usd: "0",
      net_profit_toman: "0",
      total_payout_usd: "0",
      total_payout_toman: "0",
      sale_count: 0,
      avg_ticket_usd: "0",
      payment_methods: { cash: "0", card: "0", wallet: "0" },
    },
    operational: { visits_completed: 0, new_customers: 0, staff_payout_count: 0 },
  });
}

test.describe("Finance role-based access — Employee", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthAs(page, EMPLOYEE_USER);
    await mockFinanceEndpoints(page);
  });

  test("Settings shows only کاربران tab for employee", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "تنظیمات" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "کاربران" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "نرخ ارز" })).not.toBeVisible();
    await expect(page.getByRole("tab", { name: "قوانین تسویه" })).not.toBeVisible();
    await expect(page.getByRole("tab", { name: "دسته‌بندی خدمات" })).not.toBeVisible();
  });

  test("Sales tab has no refund button for employee", async ({ page }) => {
    await page.goto("/accounting");
    await expect(page.getByRole("tab", { name: "فروش" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "فروش" })).toHaveAttribute("aria-selected", "true");
    // No "استرداد" (refund) button should be visible
    await expect(page.getByRole("button", { name: "استرداد" })).not.toBeVisible();
  });

  test("Sales tab shows the unsettled visits card for employee", async ({ page }) => {
    await page.goto("/accounting");
    await expect(page.getByText("نوبت‌های تکمیل‌شده و تسویه‌نشده")).toBeVisible();
  });

  test("Employee can view exchange-rate page without the save button", async ({ page }) => {
    await page.goto("/exchange-rate");
    await expect(page.getByRole("heading", { name: "نرخ ارز", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "ثبت نرخ جدید" })).not.toBeVisible();
  });
});

test.describe("Finance role-based access — Admin", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthAs(page, ADMIN_USER);
    await mockFinanceEndpoints(page);
  });

  test("Settings shows all finance tabs for admin", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "تنظیمات" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "کاربران" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "نرخ ارز" })).not.toBeVisible();
    // payout rules moved out of Settings into the accounting tab bar
    await expect(page.getByRole("tab", { name: "قوانین تسویه" })).not.toBeVisible();
    await expect(page.getByRole("tab", { name: "دسته‌بندی خدمات" })).toBeVisible();
  });

  test("Admin can open the standalone exchange-rate page and save a rate", async ({ page }) => {
    await page.goto("/exchange-rate");
    await expect(page.getByRole("heading", { name: "نرخ ارز", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "ثبت نرخ جدید" })).toBeVisible();
  });

  test("Admin can navigate to compensation-rules tab", async ({ page }) => {
    await page.goto("/accounting");
    await page.getByRole("tab", { name: "قوانین تسویه" }).click();
    await expect(page.getByRole("tab", { name: "قوانین تسویه" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  test("Admin can navigate to service-categories tab", async ({ page }) => {
    await page.goto("/settings");
    await page.getByRole("tab", { name: "دسته‌بندی خدمات" }).click();
    await expect(page.getByRole("tab", { name: "دسته‌بندی خدمات" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });
});
