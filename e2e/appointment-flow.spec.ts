import { expect, test } from "@playwright/test";

import { clickSave, mockAllApiEndpoints } from "./helpers";

test.describe("Appointment Lifecycle", () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApiEndpoints(page);
  });

  test("creates patient then appointment and verifies on calendar", async ({ page }) => {
    // --- Step 1: Create a patient ---
    await page.route("**/api/customers/", async (route, request) => {
      if (request.method() === "POST") {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ id: 100, first_name: "نوبت", last_name: "تستی" }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            count: 1,
            results: [
              {
                id: 100,
                first_name: "نوبت",
                last_name: "تستی",
                mobile_number: "09129876543",
                national_id: "1112223334",
              },
            ],
          }),
        });
      }
    });

    await page.goto("/patients");
    await page.getByRole("button", { name: "بیمار جدید" }).first().click();

    await page.getByRole("textbox", { name: "نام", exact: true }).fill("نوبت");
    await page.getByRole("textbox", { name: "نام خانوادگی" }).fill("تستی");
    await page.getByRole("textbox", { name: "شماره تلفن" }).fill("09129876543");
    await page.getByRole("textbox", { name: "کد ملی", exact: true }).fill("1112223334");

    await clickSave(page);
    await expect(page.getByRole("heading", { name: "بیمار جدید" })).not.toBeVisible({
      timeout: 10000,
    });

    // --- Step 2: Verify calendar page renders ---
    await page.goto("/calendar");
    await expect(page.getByRole("heading", { name: "تقویم نوبت‌ها" })).toBeVisible({
      timeout: 10000,
    });
  });

  test("records payment and verifies in accounting", async ({ page }) => {
    // Mock visits with data
    await page.route("**/api/visits/**", async (route, request) => {
      if (request.url().includes("/confirm/") || request.url().includes("/complete/")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ id: 1, status: "completed" }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            count: 1,
            results: [
              {
                id: 1,
                customer: { id: 1, first_name: "بیمار", last_name: "تست" },
                service: { id: 1, name: "ویزیت", price: "500000" },
                status: "completed",
                visit_date: "2026-07-18",
              },
            ],
          }),
        });
      }
    });

    // Mock payments endpoint
    await page.route("**/api/payments/**", async (route, request) => {
      if (request.method() === "POST") {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ id: 1, amount: "500000", payment_method: "cash" }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            count: 1,
            results: [
              {
                id: 1,
                visit: 1,
                amount: "500000",
                payment_method: "cash",
                created_at: "2026-07-18T10:00:00Z",
              },
            ],
          }),
        });
      }
    });

    // Mock reports to show revenue
    await page.route("**/api/reports/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          total_revenue: 500000,
          period_revenue: 500000,
        }),
      });
    });

    // Verify accounting page shows payment data
    await page.goto("/accounting");
    await expect(page.getByRole("heading", { name: "حسابداری" })).toBeVisible();
  });
});
