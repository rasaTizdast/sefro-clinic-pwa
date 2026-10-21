import { expect, test } from "@playwright/test";

import { mockAllApiEndpoints } from "./helpers";

/**
 * Golden path: Create Patient → Create Visit → Confirm → Complete → Record Payment
 * mockAllApiEndpoints provides full coverage; stateful fixtures layer on top.
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

async function setupCoreMocks(page: any) {
  // Ensure PwaUpdater never shows offline banner
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "onLine", { configurable: true, get: () => true });
  });

  // Base layer covers every endpoint the app can touch (incl. calendar
  // prefetches). Stateful fixtures registered after this win route matching.
  await mockAllApiEndpoints(page);

  // Exchange rate powers the Toman→USD conversion in the checkout dialog.
  await page.route("**/api/reports/exchange-dollar/**", async (r: any) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        rate_toman_per_usd: "800000",
        rate: "800000",
        effective_at: null,
        source: "manual",
      }),
    })
  );
}

const SERVICE = { id: 9101, name: "ویزیت کامل", time: 30, price: "300000", is_active: true };

test.describe("Complete Patient → Visit → Payment Flow", () => {
  test("golden path: create patient, create visit, confirm, complete, record payment", async ({
    page,
  }) => {
    await setupCoreMocks(page);

    // --- Services (used everywhere) ---
    await page.route("**/api/services/**", async (r: any) => {
      await r.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ count: 1, results: [SERVICE] }),
      });
    });

    // --- Tracking state across the test ---
    let patientCreated = false;
    let visitCreated = false;
    let visitStatus: "pending" | "confirmed" | "completed" = "pending";
    let checkoutCreated = false;

    const MOCK_PATIENT = {
      id: 9001,
      first_name: "مسیر",
      last_name: "کامل",
      mobile_number: "09125556677",
      national_id: "4445556667",
      is_active: true,
      visit_count: 1,
      last_visit: "۱۴۰۵/۵/۴",
      total_payments: 300000,
    };

    // --- Patients ---
    await page.route("**/api/customers/**", async (r: any, req: any) => {
      if (req.method() === "POST") {
        patientCreated = true;
        await r.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(MOCK_PATIENT),
        });
        return;
      }
      const results = patientCreated ? [MOCK_PATIENT] : [];
      await r.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ count: results.length, results }),
      });
    });

    // --- Visits ---
    await page.route("**/api/visits/**", async (r: any, req: any) => {
      const url = req.url();
      if (url.includes("/confirm/")) {
        visitStatus = "confirmed";
        await r.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ id: 9201, status: "confirmed" }),
        });
        return;
      }
      if (url.includes("/complete/")) {
        visitStatus = "completed";
        await r.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ id: 9201, status: "completed" }),
        });
        return;
      }
      if (req.method() === "POST") {
        visitCreated = true;
        visitStatus = "pending";
        await r.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ id: 9201, status: "pending" }),
        });
        return;
      }
      const results = visitCreated
        ? [
            {
              id: 9201,
              customer: 9001,
              customer_name: "مسیر کامل",
              customer_mobile: "09125556677",
              services: [9101],
              service_names: ["ویزیت کامل"],
              start_at: `${DATE_API} 10:00:00`,
              end_at: `${DATE_API} 10:30:00`,
              status: visitStatus,
              notes: "",
            },
          ]
        : [];
      // Single-resource detail (GET /api/visits/9201/) must not return a list payload.
      if (/\/api\/visits\/\d+\/$/.test(url)) {
        await r.fulfill({
          status: results.length ? 200 : 404,
          contentType: "application/json",
          body: JSON.stringify(results[0] ?? {}),
        });
        return;
      }
      await r.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ count: results.length, results }),
      });
    });

    // --- Payments ---
    await page.route("**/api/payments/**", async (r: any) =>
      r.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ count: 0, results: [] }),
      })
    );

    // --- Checkout (registered after setupCoreMocks so it wins over **/api/finance/**) ---
    await page.route("**/api/finance/checkout/", async (r: any, req: any) => {
      if (req.method() === "POST") {
        checkoutCreated = true;
        await r.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            id: 9301,
            customer: 9001,
            visit: 9201,
            package: null,
            amount_usd: "0.38",
            discount_usd: "0.00",
            exchange_rate: "800000.00",
            amount_toman: "300000",
            status: "paid",
            idempotency_key: "uuid-e2e-flow",
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

    /* ===== PHASE 1: Create Patient ===== */
    await page.goto("/patients");
    await page.waitForTimeout(1000);

    await page.getByRole("button", { name: "بیمار جدید" }).first().click();
    await page.getByRole("textbox", { name: "نام", exact: true }).fill("مسیر");
    await page.getByRole("textbox", { name: "نام خانوادگی" }).fill("کامل");
    await page.getByRole("textbox", { name: "شماره تلفن" }).fill("09125556677");
    await page.getByRole("textbox", { name: "کد ملی", exact: true }).fill("4445556667");
    await page.getByRole("button", { name: "ذخیره" }).click();
    await expect(
      page.getByRole("dialog").getByRole("heading", { name: "بیمار جدید" })
    ).not.toBeVisible({
      timeout: 10000,
    });
    expect(patientCreated).toBe(true);

    /* ===== PHASE 2: Create Visit ===== */
    await page.goto("/calendar");
    await page.waitForTimeout(1000);

    await page.getByRole("button", { name: "نوبت جدید" }).click();
    await expect(page.getByRole("heading", { name: "نوبت جدید" })).toBeVisible();

    // Step 1: Select patient
    await page.getByText("مسیر کامل").first().click();
    await page.waitForTimeout(200);
    await page.getByRole("button", { name: "بعدی" }).click();

    // Step 2: Select service
    await expect(page.getByText("انتخاب خدمت برای")).toBeVisible({ timeout: 5000 });
    await page.getByText("ویزیت کامل").first().click();
    await page.waitForTimeout(200);
    await page.getByRole("button", { name: "بعدی" }).click();

    // Step 3: Time step — Persian day grid + period/hour/minute selects + suggested slots
    await expect(
      page.getByRole("dialog").getByRole("button", { name: "۵", exact: true })
    ).toBeVisible({
      timeout: 5000,
    });
    await page.getByRole("dialog").getByRole("button", { name: "۵", exact: true }).click();
    // Suggested-time chips carry a colon (e.g. «۱۰:۰۰ صبح»); day cells never do.
    const timeChip = page.getByRole("dialog").getByRole("button", { name: /:/ }).first();
    await expect(timeChip).toBeVisible({ timeout: 5000 });
    await timeChip.click();

    await expect(page.getByRole("dialog").getByRole("button", { name: "ثبت نوبت" })).toBeEnabled({
      timeout: 5000,
    });

    // Press Space on the button to trigger a trusted click event
    await page.getByRole("dialog").getByRole("button", { name: "ثبت نوبت" }).click();

    await expect(page.getByRole("heading", { name: "نوبت جدید" })).not.toBeVisible({
      timeout: 10000,
    });
    expect(visitCreated).toBe(true);

    /* ===== PHASE 3: Confirm ===== */
    await page.getByText("مسیر کامل").first().click();
    await expect(page.getByRole("button", { name: "تأیید نوبت" })).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: "تأیید نوبت" }).click();
    await page.waitForTimeout(500);
    expect(visitStatus).toBe("confirmed");

    /* ===== PHASE 4+5: Complete & Record Payment (merged action) ===== */
    // «تمام شدن و تسویه» opens checkout and completes the visit after the sale lands.
    await page.getByText("مسیر کامل").first().click();
    const checkoutButton = page.getByRole("button", { name: "تمام شدن و تسویه" }).first();
    await expect(checkoutButton).toBeVisible({ timeout: 5000 });
    await checkoutButton.click();
    await expect(page.getByRole("heading", { name: "تسویه و ثبت فروش" })).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByLabel("مبلغ کل (تومان)")).toHaveValue("۳۰۰٬۰۰۰");

    await page.getByRole("dialog").getByRole("button", { name: "ثبت فروش" }).click();
    await expect(page.getByText("تسویه با موفقیت ثبت شد")).toBeVisible({ timeout: 10000 });
    expect(checkoutCreated).toBe(true);
    await expect(page.getByRole("heading", { name: "تسویه و ثبت فروش" })).not.toBeVisible();
    // Sale success triggers the deferred complete mutation.
    await expect.poll(() => visitStatus, { timeout: 5000 }).toBe("completed");
  });
});
