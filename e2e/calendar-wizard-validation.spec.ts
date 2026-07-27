import { expect, test } from "@playwright/test";

/**
 * Calendar Wizard Validation — edge cases and state tests
 * Uses explicit mock routes (no mockAllApiEndpoints).
 */

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
  // Visits empty by default
  await page.route("**/api/visits/**", async (r: any) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ count: 0, results: [] }),
    })
  );
}

test.describe("Calendar Wizard Validation", () => {
  test.beforeEach(async ({ page }) => {
    await setupCoreMocks(page);

    // Patients
    await page.route("**/api/customers/**", async (r: any) => {
      await r.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          count: 1,
          results: [
            {
              id: 801,
              first_name: "اعتبار",
              last_name: "سنجی",
              mobile_number: "09123334455",
              national_id: "7778889990",
              is_active: true,
              visit_count: 3,
              last_visit: "۱۴۰۵/۴/۱۰",
              total_payments: 200000,
            },
          ],
        }),
      });
    });

    // Services
    await page.route("**/api/services/**", async (r: any) => {
      await r.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          count: 1,
          results: [{ id: 811, name: "ویزیت تست", time: 30, price: "100000", is_active: true }],
        }),
      });
    });
  });

  test('"بعدی" button is disabled when no patient is selected', async ({ page }) => {
    await page.goto("/calendar");
    await page.waitForTimeout(1000);

    await page.getByRole("button", { name: "نوبت جدید" }).click();
    await expect(page.getByRole("heading", { name: "نوبت جدید" })).toBeVisible();

    await expect(page.getByRole("button", { name: "بعدی" })).toBeDisabled();
  });

  test('"بعدی" button is disabled when no service is selected', async ({ page }) => {
    await page.goto("/calendar");
    await page.waitForTimeout(1000);

    await page.getByRole("button", { name: "نوبت جدید" }).click();
    await expect(page.getByRole("heading", { name: "نوبت جدید" })).toBeVisible();

    // Select patient
    await page.getByText("اعتبار سنجی").click();
    await page.waitForTimeout(200);

    // Navigate to service step
    await page.getByRole("button", { name: "بعدی" }).click();
    await expect(page.getByText("انتخاب خدمت برای")).toBeVisible({ timeout: 5000 });

    // "بعدی" should be disabled (no service selected yet)
    await expect(page.getByRole("button", { name: "بعدی" })).toBeDisabled();
  });

  test("shows patient info card after patient selection", async ({ page }) => {
    await page.goto("/calendar");
    await page.waitForTimeout(1000);

    await page.getByRole("button", { name: "نوبت جدید" }).click();
    await expect(page.getByRole("heading", { name: "نوبت جدید" })).toBeVisible();

    // Select patient
    await page.getByText("اعتبار سنجی").click();
    await page.waitForTimeout(200);

    // Patient info card should appear
    await expect(page.getByText("آخرین مراجعه:")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("تعداد مراجعات:")).toBeVisible();
  });

  test("patient search filters the patient list", async ({ page }) => {
    await page.goto("/calendar");
    await page.waitForTimeout(1000);

    await page.getByRole("button", { name: "نوبت جدید" }).click();
    await expect(page.getByRole("heading", { name: "نوبت جدید" })).toBeVisible();

    // Patient should be visible
    await expect(page.getByText("اعتبار سنجی")).toBeVisible();

    // Search for a non-existent patient
    await page.getByPlaceholder("نام یا تلفن بیمار را وارد کنید...").fill("ناموجود");
    await expect(page.getByText("بیماری یافت نشد")).toBeVisible({ timeout: 5000 });

    // Clear search, patient should reappear
    await page.getByPlaceholder("نام یا تلفن بیمار را وارد کنید...").clear();
    await page.getByPlaceholder("نام یا تلفن بیمار را وارد کنید...").fill("اعتبار");
    await expect(page.getByText("اعتبار سنجی")).toBeVisible({ timeout: 5000 });
  });

  test("service step renders service cards with correct details", async ({ page }) => {
    await page.goto("/calendar");
    await page.waitForTimeout(1000);

    await page.getByRole("button", { name: "نوبت جدید" }).click();
    await expect(page.getByRole("heading", { name: "نوبت جدید" })).toBeVisible();

    // Select patient and go to service step
    await page.getByText("اعتبار سنجی").click();
    await page.waitForTimeout(200);
    await page.getByRole("button", { name: "بعدی" }).click();
    await expect(page.getByText("انتخاب خدمت برای")).toBeVisible({ timeout: 5000 });

    // Verify service details
    await expect(page.getByText("ویزیت تست")).toBeVisible();
    await expect(page.getByText("۳۰ دقیقه")).toBeVisible(); // Persian digit for 30
    await expect(page.getByText("۱۰۰٬۰۰۰ تومان")).toBeVisible(); // Formatted price
  });

  test("closing modal resets to patient step", async ({ page }) => {
    await page.goto("/calendar");
    await page.waitForTimeout(1000);

    await page.getByRole("button", { name: "نوبت جدید" }).click();
    await expect(page.getByRole("heading", { name: "نوبت جدید" })).toBeVisible();

    // Select patient
    await page.getByText("اعتبار سنجی").click();
    await page.waitForTimeout(200);
    // Navigate to service step
    await page.getByRole("button", { name: "بعدی" }).click();
    await expect(page.getByText("انتخاب خدمت برای")).toBeVisible({ timeout: 5000 });

    // Close modal with انصراف — go back to patient step first, then cancel
    await page.getByRole("button", { name: "قبلی" }).click();
    await page.waitForTimeout(200);
    await page.getByRole("button", { name: "انصراف" }).click();
    await expect(page.getByRole("heading", { name: "نوبت جدید" })).not.toBeVisible({
      timeout: 5000,
    });

    // Re-open — should be back at patient step
    await page.getByRole("button", { name: "نوبت جدید" }).click();
    await expect(page.getByRole("heading", { name: "نوبت جدید" })).toBeVisible();
    await expect(page.getByRole("button", { name: "بعدی" })).toBeDisabled();
  });
});
