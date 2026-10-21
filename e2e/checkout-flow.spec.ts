import { expect, test } from "@playwright/test";

import { mockAllApiEndpoints } from "./helpers";

/**
 * Critical finance flow: completed visit → checkout modal → sale.
 * mockAllApiEndpoints provides full coverage; this file layers visit/checkout
 * fixtures on top (registered later → they win).
 */

function todayPersian(): { year: number; month: number; day: number } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("fa-IR", {
    calendar: "persian",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(now);
  const toLatin = (s: string) =>
    parseInt(s.replace(/[۰-۹]/g, (c) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c))));
  return {
    year: toLatin(parts.find((p) => p.type === "year")!.value),
    month: toLatin(parts.find((p) => p.type === "month")!.value),
    day: toLatin(parts.find((p) => p.type === "day")!.value),
  };
}

const today = todayPersian();
const DATE_API = `${today.year}-${today.month}-${today.day}`;

const SERVICE = { id: 9101, name: "ویزیت کامل", time: 30, price: 1000000, is_active: true };

const MOCK_PATIENT = {
  id: 9001,
  first_name: "تسویه",
  last_name: "تست",
  mobile_number: "09125556677",
  national_id: "4445556667",
  is_active: true,
  visit_count: 1,
  last_visit: "۱۴۰۵/۵/۴",
  total_payments: 0,
};

const MOCK_VISIT = {
  id: 9201,
  customer: 9001,
  customer_name: "تسویه تست",
  customer_mobile: "09125556677",
  services: [9101],
  service_names: ["ویزیت کامل"],
  start_at: `${DATE_API} 10:00:00`,
  end_at: `${DATE_API} 10:30:00`,
  status: "completed",
  notes: "",
};

async function setupMocks(page: any, state: { checkoutCalled: boolean }) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "onLine", { configurable: true, get: () => true });
  });

  // Base layer covers every endpoint; fixtures below are registered later so
  // Playwright (most-recent-first) serves them instead.
  await mockAllApiEndpoints(page);

  await page.route("**/api/customers/**", async (r: any) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ count: 1, results: [MOCK_PATIENT] }),
    })
  );
  await page.route("**/api/services/**", async (r: any) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ count: 1, results: [SERVICE] }),
    })
  );
  await page.route("**/api/visits/**", async (r: any, req: any) => {
    const url = req.url();
    // Single-resource detail (GET /api/visits/9201/) must not return a list payload.
    if (/\/api\/visits\/\d+\/$/.test(url)) {
      await r.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_VISIT),
      });
      return;
    }
    await r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ count: 1, results: [MOCK_VISIT] }),
    });
  });

  // Exchange rate powers the Toman→USD conversion in the checkout dialog.
  await page.route("**/api/reports/exchange-dollar/", async (r: any) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        rate: "100000",
        rate_toman_per_usd: "100000",
        effective_at: null,
        source: "manual",
      }),
    })
  );

  await page.route("**/api/finance/checkout/", async (r: any, req: any) => {
    if (req.method() === "POST") {
      state.checkoutCalled = true;
      await r.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          id: 9301,
          customer: 9001,
          visit: 9201,
          package: null,
          amount_usd: "10.00",
          discount_usd: "0.00",
          exchange_rate: "100000.00",
          amount_toman: "1000000",
          status: "paid",
          idempotency_key: "uuid-e2e",
          created_at: "2026-09-20T08:00:00Z",
        }),
      });
      return;
    }
    await r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ count: 0, results: [] }),
    });
  });
}

test.describe("Visit → Checkout → Sale", () => {
  test("completed visit offers checkout; split cash/card submits a sale", async ({ page }) => {
    const state = { checkoutCalled: false };
    await setupMocks(page, state);

    await page.goto("/calendar");
    await page.waitForTimeout(1000);

    // Open the completed appointment.
    await page.getByText("تسویه تست").first().click();
    const checkoutButton = page.getByRole("button", { name: "تمام شدن و تسویه" }).first();
    await expect(checkoutButton).toBeVisible({ timeout: 5000 });
    await checkoutButton.click();

    // Modal shows the visit-services total; cash defaults to it.
    await expect(page.getByRole("dialog").getByText("تسویه و ثبت فروش")).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByLabel("مبلغ کل (تومان)")).toHaveValue("۱٬۰۰۰٬۰۰۰");

    // Split 400k cash / 600k card (card is manual — no auto-remainder).
    const cash = page.getByLabel("نقدی (تومان)");
    await cash.clear();
    await cash.fill("400000");
    const card = page.getByLabel("کارتخوان (تومان)");
    await card.clear();
    await card.fill("600000");
    await expect(page.getByText("مبلغ پرداختی برابر جمع کل است")).toBeVisible({ timeout: 5000 });

    await page.getByRole("dialog").getByRole("button", { name: "ثبت فروش" }).click();
    await expect(page.getByText("تسویه با موفقیت ثبت شد")).toBeVisible({ timeout: 10000 });
    expect(state.checkoutCalled).toBe(true);
  });
});
