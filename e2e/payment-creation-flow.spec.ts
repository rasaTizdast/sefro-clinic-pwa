import { expect, test } from "@playwright/test";

/**
 * Payment Creation Flow — uses explicit mock routes (no mockAllApiEndpoints)
 * to avoid handler conflicts. Visit data includes customer_name so the modal
 * doesn't fall through to customer detail lookups.
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
const DATE_STR = `${today.year}/${today.month}/${today.day}`;

async function setupCoreMocks(page: any) {
  // Ensure PwaUpdater never shows offline banner
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "onLine", { configurable: true, get: () => true });
  });

  // Auth
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
  // Dashboard
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
  // Services
  await page.route("**/api/services/**", async (r: any) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        count: 2,
        results: [
          { id: 601, name: "ویزیت عمومی", time: 30, price: "200000", is_active: true },
          { id: 602, name: "تزریق", time: 15, price: "50000", is_active: true },
        ],
      }),
    })
  );
  // Reports
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
  // Other
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
      body: JSON.stringify({ count: 0, results: [] }),
    })
  );
}

test.describe("Payment Creation Flow", () => {
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
            { id: 501, first_name: "پرداخت", last_name: "تستی", mobile_number: "09129876543" },
          ],
        }),
      });
    });

    // Visits — includes customer_name so payment modal displays name directly
    await page.route("**/api/visits/**", async (r: any) => {
      await r.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          count: 1,
          results: [
            {
              id: 701,
              customer: 501,
              customer_name: "پرداخت تستی",
              customer_mobile: "09129876543",
              services: [601, 602],
              service_names: ["ویزیت عمومی", "تزریق"],
              start_at: `${DATE_API} 09:00:00`,
              end_at: `${DATE_API} 09:30:00`,
              status: "completed",
              notes: "",
            },
          ],
        }),
      });
    });
  });

  test("opens payment wizard, selects a visit, and submits payment", async ({ page }) => {
    let paymentCreated = false;
    await page.route("**/api/payments/**", async (r: any, req: any) => {
      if (req.method() === "POST") {
        paymentCreated = true;
        await r.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ id: 801, visit: 701, amount: 250000, payment_method: "cash" }),
        });
        return;
      }
      await r.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ count: 0, results: [] }),
      });
    });

    await page.goto("/accounting");
    await page.waitForTimeout(1000);

    // Open payment wizard
    await page.getByRole("button", { name: "ثبت تراکنش" }).click();
    await expect(page.getByRole("heading", { name: "انتخاب ویزیت" })).toBeVisible();

    // Visit card should show customer name
    await expect(page.getByText("پرداخت تستی").first()).toBeVisible({ timeout: 5000 });

    // Select the visit by clicking the card
    await page.getByText("پرداخت تستی").first().click();

    // Should transition to payment step
    await expect(page.getByRole("heading", { name: "پرداخت" })).toBeVisible({ timeout: 5000 });

    // Submit payment
    await page.getByRole("button", { name: "ثبت پرداخت" }).click();
    await expect(page.getByText("پرداخت با موفقیت ثبت شد")).toBeVisible({ timeout: 10000 });
    expect(paymentCreated).toBe(true);

    // Close the success modal — the footer button with exact text "بستن"
    await page
      .getByRole("button")
      .filter({ hasText: /^بستن$/ })
      .last()
      .click({ force: true });
    await expect(page.getByText("پرداخت با موفقیت ثبت شد")).not.toBeVisible({ timeout: 5000 });
  });

  test("changes payment method before submitting", async ({ page }) => {
    let capturedMethod = "";
    await page.route("**/api/payments/**", async (r: any, req: any) => {
      if (req.method() === "POST") {
        const body = JSON.parse(req.postData() || "{}");
        capturedMethod = body.payment_method;
        await r.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            id: 802,
            visit: 701,
            amount: 250000,
            payment_method: capturedMethod,
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

    await page.goto("/accounting");
    await page.waitForTimeout(1000);

    await page.getByRole("button", { name: "ثبت تراکنش" }).click();
    await expect(page.getByRole("heading", { name: "انتخاب ویزیت" })).toBeVisible();
    await page.getByText("پرداخت تستی").first().click();
    await expect(page.getByRole("heading", { name: "پرداخت" })).toBeVisible({ timeout: 5000 });

    // Select card payment — the component is a custom combobox, not a native <select>
    await page.getByLabel("روش پرداخت").click();
    await page.getByRole("option", { name: "کارت خوان" }).click();

    await page.getByRole("button", { name: "ثبت پرداخت" }).click();
    await expect(page.getByText("پرداخت با موفقیت ثبت شد")).toBeVisible({ timeout: 10000 });
    expect(capturedMethod).toBe("card");
  });

  test("goes back from payment step to visit selection", async ({ page }) => {
    await page.route("**/api/payments/**", async (r: any) => {
      await r.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ count: 0, results: [] }),
      });
    });

    await page.goto("/accounting");
    await page.waitForTimeout(1000);

    await page.getByRole("button", { name: "ثبت تراکنش" }).click();
    await expect(page.getByRole("heading", { name: "انتخاب ویزیت" })).toBeVisible();
    await page.getByText("پرداخت تستی").first().click();
    await expect(page.getByRole("heading", { name: "پرداخت" })).toBeVisible({ timeout: 5000 });

    // Go back
    await page.getByRole("button", { name: "قبلی" }).click();
    await expect(page.getByRole("heading", { name: "انتخاب ویزیت" })).toBeVisible({
      timeout: 5000,
    });
  });

  test("shows empty state when no visits exist", async ({ page }) => {
    // Override visits to empty for this test
    await page.route("**/api/visits/**", async (r: any) => {
      await r.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ count: 0, results: [] }),
      });
    });

    await page.goto("/accounting");
    await page.waitForTimeout(1000);

    await page.getByRole("button", { name: "ثبت تراکنش" }).click();
    await expect(page.getByText("ویزیتی در این تاریخ یافت نشد")).toBeVisible({ timeout: 5000 });
  });

  test("closes payment wizard with cancel button", async ({ page }) => {
    await page.route("**/api/payments/**", async (r: any) => {
      await r.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ count: 0, results: [] }),
      });
    });

    await page.goto("/accounting");
    await page.waitForTimeout(1000);

    await page.getByRole("button", { name: "ثبت تراکنش" }).click();
    await expect(page.getByRole("heading", { name: "انتخاب ویزیت" })).toBeVisible();

    await page.getByRole("button", { name: "انصراف" }).click();
    await expect(page.getByRole("heading", { name: "انتخاب ویزیت" })).not.toBeVisible({
      timeout: 5000,
    });
  });
});
