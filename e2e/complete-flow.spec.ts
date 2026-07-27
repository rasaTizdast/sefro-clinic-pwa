import { expect, test } from "@playwright/test";

/**
 * Golden path: Create Patient → Create Visit → Confirm → Complete → Record Payment
 * Uses explicit mock routes — no mockAllApiEndpoints.
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

/** Return an HH:MM time string ~2 hours from now (guaranteed future, within work hours) */
function futureTime(): string {
  const h = new Date().getHours() + 2;
  return `${String(Math.min(h, 16)).padStart(2, "0")}:00`;
}

async function setupCoreMocks(page: any) {
  // Ensure PwaUpdater never shows offline banner
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
        today_visits: 3,
        total_customers: 100,
        today_revenue: 1500000,
        new_patients: 2,
        loyal_customers: 30,
      }),
    })
  );
  await page.route("**/api/reports/**", async (r: any) =>
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) })
  );
  await page.route("**/api/reports/all/**", async (r: any) =>
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) })
  );
  await page.route("**/api/reports/referral/**", async (r: any) =>
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) })
  );
  await page.route("**/api/reports/visits/**", async (r: any) =>
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) })
  );
  await page.route("**/api/inventory/products/**", async (r: any) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ count: 0, results: [] }),
    })
  );
  await page.route("**/api/auth/employees/list/**", async (r: any) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ count: 0, results: [] }),
    })
  );
  await page.route("**/api/logs/**", async (r: any) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ count: 0, results: [] }),
    })
  );
  await page.route("**/api/work-time/**", async (r: any) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        count: 7,
        results: [
          { id: 1, day_of_week: 0, start_time: "08:00", end_time: "17:00", is_active: true },
          { id: 2, day_of_week: 1, start_time: "08:00", end_time: "17:00", is_active: true },
          { id: 3, day_of_week: 2, start_time: "08:00", end_time: "17:00", is_active: true },
          { id: 4, day_of_week: 3, start_time: "08:00", end_time: "17:00", is_active: true },
          { id: 5, day_of_week: 4, start_time: "08:00", end_time: "17:00", is_active: true },
          { id: 6, day_of_week: 5, start_time: "08:00", end_time: "12:00", is_active: true },
          { id: 7, day_of_week: 6, start_time: "00:00", end_time: "00:00", is_active: false },
        ],
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
    let paymentCreated = false;

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
      await r.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ count: results.length, results }),
      });
    });

    // --- Payments ---
    await page.route("**/api/payments/**", async (r: any, req: any) => {
      if (req.method() === "POST") {
        paymentCreated = true;
        await r.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ id: 9301, visit: 9201, amount: 300000, payment_method: "cash" }),
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
    await expect(page.getByRole("heading", { name: "بیمار جدید" })).not.toBeVisible({
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

    // Step 3: Time step
    await expect(page.getByText("ویزیت کامل")).toBeVisible({ timeout: 5000 });
    // Click the first non-disabled day button inside the dialog
    const dayButton = page
      .locator("[role='dialog'] button:not([disabled])")
      .filter({ hasText: /^[۰-۹0-9]{1,2}$/ })
      .first();
    await dayButton.click();
    await page.waitForTimeout(200);
    const timeInput = page.locator('input[type="time"]');
    await expect(timeInput).toBeVisible({ timeout: 5000 });
    await timeInput.fill(futureTime());

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

    /* ===== PHASE 4: Complete ===== */
    await page.getByText("مسیر کامل").first().click();
    await expect(page.getByRole("button", { name: "انجام شد" })).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: "انجام شد" }).click();
    await page.waitForTimeout(500);
    expect(visitStatus).toBe("completed");

    /* ===== PHASE 5: Record Payment ===== */
    await page.goto("/accounting");
    await page.waitForTimeout(1000);

    await page.getByRole("button", { name: "ثبت تراکنش" }).click();
    await expect(page.getByRole("heading", { name: "انتخاب ویزیت" })).toBeVisible();
    await page.getByText("مسیر کامل").first().click();
    await expect(page.getByRole("heading", { name: "پرداخت" })).toBeVisible({ timeout: 5000 });

    await page.getByRole("button", { name: "ثبت پرداخت" }).click();
    await expect(page.getByText("پرداخت با موفقیت ثبت شد")).toBeVisible({ timeout: 10000 });
    expect(paymentCreated).toBe(true);

    await page.getByRole("dialog").getByRole("button", { name: "بستن" }).first().click();
  });
});
