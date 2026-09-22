import { expect, test } from "@playwright/test";

/**
 * Critical finance flow: completed visit → checkout modal → sale.
 * Mirrors e2e/complete-flow.spec.ts conventions (explicit mock routes).
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

  await page.route("**/api/auth/token/refresh/", async (r: any) =>
    r.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ detail: "expired" }),
    })
  );
  await page.route("**/api/auth/token/", async (r: any) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ access: "mock-at", refresh: "mock-rt" }),
    })
  );
  await page.route("**/api/auth/me/", async (r: any) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: 1,
        username: "sefro_admin",
        role: "admin",
        date_joined: "2026-01-01T00:00:00Z",
      }),
    })
  );
  await page.route("**/api/dashboard/", async (r: any) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        today_visits: 1,
        total_customers: 100,
        today_revenue: 0,
        new_patients: 0,
        loyal_customers: 30,
      }),
    })
  );
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
  await page.route("**/api/visits/**", async (r: any) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ count: 1, results: [MOCK_VISIT] }),
    })
  );

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
  await page.route("**/api/finance/service-items/**", async (r: any) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ count: 0, results: [] }),
    })
  );
  await page.route("**/api/inventory/products/**", async (r: any) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ count: 0, results: [] }),
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
    const checkoutButton = page.getByRole("button", { name: "تسویه و ثبت فروش" }).first();
    await expect(checkoutButton).toBeVisible({ timeout: 5000 });
    await checkoutButton.click();

    // Modal shows the visit-services total; cash defaults to it.
    await expect(page.getByRole("dialog").getByText("تسویه و ثبت فروش")).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByLabel("مبلغ کل (تومان)")).toHaveValue("۱٬۰۰۰٬۰۰۰");

    // Split 400k cash / 600k card.
    const cash = page.getByLabel("نقدی (تومان)");
    await cash.clear();
    await cash.fill("400000");
    await expect(page.getByLabel("کارتی (تومان)")).toHaveValue("۶۰۰٬۰۰۰");

    await page.getByRole("dialog").getByRole("button", { name: "ثبت فروش" }).click();
    await expect(page.getByText("فروش ثبت شد")).toBeVisible({ timeout: 10000 });
    expect(state.checkoutCalled).toBe(true);
  });
});
