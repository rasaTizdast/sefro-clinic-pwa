import { expect, test } from "@playwright/test";

import { clickSave } from "./helpers";

function todayPersian(): { year: number; month: number; day: number } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("fa-IR", {
    calendar: "persian",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(now);
  return {
    year: parseInt(
      parts
        .find((p) => p.type === "year")!
        .value.replace(/[۰-۹]/g, (c) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c)))
    ),
    month: parseInt(
      parts
        .find((p) => p.type === "month")!
        .value.replace(/[۰-۹]/g, (c) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c)))
    ),
    day: parseInt(
      parts
        .find((p) => p.type === "day")!
        .value.replace(/[۰-۹]/g, (c) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c)))
    ),
  };
}

const today = todayPersian();
const VISIT_DATE_STR = `${today.year}-${today.month}-${today.day}`;

/** Return an HH:MM time string ~2 hours from now (guaranteed future, within work hours) */
function futureTime(): string {
  const h = new Date().getHours() + 2;
  return `${String(Math.min(h, 16)).padStart(2, "0")}:00`;
}

/** Mock all endpoints explicitly — no mockAllApiEndpoints to avoid route conflicts */
async function setupMocks(page: any) {
  // Ensure PwaUpdater never shows offline banner
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "onLine", { configurable: true, get: () => true });
  });

  // Auth
  await page.route("**/api/auth/token/refresh/", async (route: any) => {
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ detail: "expired" }),
    });
  });
  await page.route("**/api/auth/token/", async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ access: "mock-at", refresh: "mock-rt" }),
    });
  });
  await page.route("**/api/auth/me/", async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: 1,
        username: "sefro_admin",
        role: "admin",
        date_joined: "2026-01-01T00:00:00Z",
      }),
    });
  });
  // Dashboard
  await page.route("**/api/dashboard/", async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        today_visits: 3,
        total_customers: 100,
        today_revenue: 1500000,
        new_patients: 2,
        loyal_customers: 30,
      }),
    });
  });
  // Patients — single patient for test
  await page.route("**/api/customers/**", async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        count: 1,
        results: [
          {
            id: 201,
            first_name: "نوبت",
            last_name: "تستی",
            mobile_number: "09121112233",
            national_id: "3334445556",
            is_active: true,
            visit_count: 2,
            last_visit: "۱۴۰۵/۴/۲۰",
            total_payments: 500000,
          },
        ],
      }),
    });
  });
  // Services
  await page.route("**/api/services/**", async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        count: 2,
        results: [
          { id: 301, name: "ویزیت عمومی", time: 30, price: "150000", is_active: true },
          { id: 302, name: "مشاوره تخصصی", time: 45, price: "250000", is_active: true },
        ],
      }),
    });
  });
  // Visits — initially empty, will be overridden per test
  await page.route("**/api/visits/**", async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ count: 0, results: [] }),
    });
  });
  // Work time — needed for calendar to compute available slots
  await page.route("**/api/work-time/**", async (route: any) => {
    await route.fulfill({
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
    });
  });
  // Reports
  await page.route("**/api/reports/**", async (route: any) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) });
  });
  await page.route("**/api/reports/all/**", async (route: any) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) });
  });
  await page.route("**/api/reports/referral/**", async (route: any) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) });
  });
  await page.route("**/api/reports/visits/**", async (route: any) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });
  // Payments
  await page.route("**/api/payments/**", async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ count: 0, results: [] }),
    });
  });
  // Other
  await page.route("**/api/inventory/products/**", async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ count: 0, results: [] }),
    });
  });
  await page.route("**/api/auth/employees/list/**", async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ count: 0, results: [] }),
    });
  });
  await page.route("**/api/logs/**", async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ count: 0, results: [] }),
    });
  });
}

test.describe("Visit Lifecycle", () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
  });

  test("creates a visit via 3-step wizard", async ({ page }) => {
    let visitCreated = false;
    await page.route("**/api/visits/**", async (route: any, request: any) => {
      if (request.method() === "POST") {
        visitCreated = true;
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ id: 401, status: "pending" }),
        });
        return;
      }
      const data = visitCreated
        ? [
            {
              id: 401,
              customer: 201,
              customer_name: "نوبت تستی",
              customer_mobile: "09121112233",
              services: [301],
              service_names: ["ویزیت عمومی"],
              start_at: `${VISIT_DATE_STR} 10:00:00`,
              end_at: `${VISIT_DATE_STR} 10:30:00`,
              status: "pending",
              notes: "",
            },
          ]
        : [];
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ count: data.length, results: data }),
      });
    });

    await page.goto("/calendar");
    await page.waitForTimeout(1000); // let React Query settle

    // Open wizard
    await page.getByRole("button", { name: "نوبت جدید" }).click();
    await expect(page.getByRole("heading", { name: "نوبت جدید" })).toBeVisible();

    // Step 1: Select patient
    await page.getByText("نوبت تستی").click();
    // Verify selected patient info card appears
    await expect(page.getByText("آخرین مراجعه:")).toBeVisible({ timeout: 5000 });
    // Click "بعدی"
    await page.getByRole("button", { name: "بعدی" }).click();

    // Step 2: Select service
    await expect(page.getByText("انتخاب خدمت برای")).toBeVisible({ timeout: 5000 });
    await page.getByText("ویزیت عمومی").first().click();
    await page.waitForTimeout(300);
    // Click "بعدی"
    await page.getByRole("button", { name: "بعدی" }).click();

    // Step 3: Time step — pick a date on the mini calendar
    await expect(page.getByText("ویزیت عمومی")).toBeVisible({ timeout: 5000 });
    // Click the first non-disabled day button inside the dialog
    // The wizard calendar uses Persian digits for day numbers
    const dayButton = page
      .locator("[role='dialog'] button:not([disabled])")
      .filter({ hasText: /^[۰-۹0-9]{1,2}$/ })
      .first();
    await dayButton.click();
    await page.waitForTimeout(300);

    // Fill time
    const timeInput = page.locator('input[type="time"]');
    await expect(timeInput).toBeVisible({ timeout: 5000 });
    await timeInput.fill(futureTime());

    await expect(page.getByRole("dialog").getByRole("button", { name: "ثبت نوبت" })).toBeEnabled({
      timeout: 5000,
    });
    // Submit
    await page.getByRole("dialog").getByRole("button", { name: "ثبت نوبت" }).click();
    await expect(page.getByRole("heading", { name: "نوبت جدید" })).not.toBeVisible({
      timeout: 10000,
    });
    expect(visitCreated).toBe(true);
  });

  test("confirms a visit and completes it", async ({ page }) => {
    let visitStatus = "pending";
    await page.route("**/api/visits/**", async (route: any, request: any) => {
      const url = request.url();
      if (url.includes("/confirm/")) {
        visitStatus = "confirmed";
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ id: 401, status: "confirmed" }),
        });
        return;
      }
      if (url.includes("/complete/")) {
        visitStatus = "completed";
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ id: 401, status: "completed" }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          count: 1,
          results: [
            {
              id: 401,
              customer: 201,
              customer_name: "نوبت تستی",
              customer_mobile: "09121112233",
              services: [301],
              service_names: ["ویزیت عمومی"],
              start_at: `${VISIT_DATE_STR} 10:00:00`,
              end_at: `${VISIT_DATE_STR} 10:30:00`,
              status: visitStatus,
              notes: "",
            },
          ],
        }),
      });
    });

    await page.goto("/calendar");
    await page.waitForTimeout(1000);

    // Click the appointment card to expand
    await page.getByText("نوبت تستی").first().click();
    // Confirm
    await expect(page.getByRole("button", { name: "تأیید نوبت" })).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: "تأیید نوبت" }).click();
    await page.waitForTimeout(500);
    expect(visitStatus).toBe("confirmed");

    // Expand again and complete
    await page.getByText("نوبت تستی").first().click();
    await expect(page.getByRole("button", { name: "انجام شد" })).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: "انجام شد" }).click();
    await page.waitForTimeout(500);
    expect(visitStatus).toBe("completed");
  });

  test("cancels a pending visit", async ({ page }) => {
    let visitStatus = "pending";
    await page.route("**/api/visits/**", async (route: any, request: any) => {
      const url = request.url();
      if (url.includes("/cancel/")) {
        visitStatus = "canceled";
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ id: 401, status: "canceled" }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          count: 1,
          results: [
            {
              id: 401,
              customer: 201,
              customer_name: "نوبت تستی",
              customer_mobile: "09121112233",
              services: [301],
              service_names: ["ویزیت عمومی"],
              start_at: `${VISIT_DATE_STR} 10:00:00`,
              end_at: `${VISIT_DATE_STR} 10:30:00`,
              status: visitStatus,
              notes: "",
            },
          ],
        }),
      });
    });

    await page.goto("/calendar");
    await page.waitForTimeout(1000);

    // Expand and cancel
    await page.getByText("نوبت تستی").first().click();
    await expect(page.getByRole("button", { name: "لغو" })).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: "لغو" }).click();
    await page.waitForTimeout(500);
    expect(visitStatus).toBe("canceled");
  });

  test("deletes a visit via confirmation modal", async ({ page }) => {
    let visitDeleted = false;
    await page.route("**/api/visits/**", async (route: any, request: any) => {
      if (request.method() === "DELETE") {
        visitDeleted = true;
        await route.fulfill({ status: 204, body: "" });
        return;
      }
      const results = visitDeleted
        ? []
        : [
            {
              id: 401,
              customer: 201,
              customer_name: "نوبت تستی",
              customer_mobile: "09121112233",
              services: [301],
              service_names: ["ویزیت عمومی"],
              start_at: `${VISIT_DATE_STR} 10:00:00`,
              end_at: `${VISIT_DATE_STR} 10:30:00`,
              status: "confirmed",
              notes: "",
            },
          ];
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ count: results.length, results }),
      });
    });

    await page.goto("/calendar");
    await page.waitForTimeout(1000);

    // Expand card
    await page.getByText("نوبت تستی").first().click();
    await expect(page.getByRole("button", { name: "حذف" })).toBeVisible({ timeout: 5000 });

    // Click delete
    await page.getByRole("button", { name: "حذف" }).click();
    await expect(page.getByText("آیا از حذف این نوبت مطمئن هستید؟")).toBeVisible({ timeout: 5000 });

    // Confirm
    await page.getByRole("button", { name: "حذف نوبت" }).click();
    await page.waitForTimeout(500);
    expect(visitDeleted).toBe(true);
  });
});
