import { expect, test } from "@playwright/test";

import { installMockBackend, login } from "./helpers";

/**
 * Issue #8: the payment step's «ثبت نهایی» must latch disabled on click (no
 * double submit) and produce exactly one success toast. /wizard/payment is not
 * a route — the journey goes through the real wizard: patient → service → payment.
 */

const PATIENT = {
  id: 201,
  first_name: "نوبت",
  last_name: "تستی",
  mobile_number: "09121112233",
  national_id: "3334445556",
  is_active: true,
  visit_count: 1,
  last_visit: "۱۴۰۵/۴/۲۰",
  total_payments: 0,
};

const SERVICE = { id: 301, name: "ویزیت عمومی", time: 30, price: "150000", is_active: true };

async function setupWizardBackend(page: any) {
  await installMockBackend(page);
  // Spec fixtures registered after the backend win route matching.
  await page.route("**/api/customers/**", async (r: any) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ count: 1, results: [PATIENT] }),
    })
  );
  await page.route("**/api/services/**", async (r: any) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ count: 1, results: [SERVICE] }),
    })
  );
}

/** Drive the wizard to the payment step with cash covering the full total. */
async function journeyToPayment(page: any) {
  await page.goto("/wizard");
  await page.getByRole("button", { name: "پذیرش جدید" }).click();

  // Patient step: search and pick the seeded patient.
  await page.getByLabel("جستجوی بیمار").fill("نوبت");
  await page.getByText("نوبت تستی").first().click({ timeout: 5000 });
  await page.getByRole("button", { name: "ادامه" }).click();

  // Service step: pick the seeded service and continue.
  await page.getByText("ویزیت عمومی").first().click();
  await page.getByRole("button", { name: "ادامه به پرداخت" }).click();

  // Payment step: pay the whole 150000 Toman total in cash.
  await page.getByLabel("نقدی (تومان)").fill("150000");
}

test.describe("Wizard checkout (issue #8)", () => {
  test("button disables synchronously on click", async ({ page }) => {
    await setupWizardBackend(page);
    await login(page);
    await journeyToPayment(page);

    // Hang the reserve POST so the flow never finishes and the button's
    // disabled latch stays observable (a fast success would unmount the step).
    await page.route("**/api/visits/", () => new Promise(() => {}));

    const submitBtn = page.getByRole("button", { name: "ثبت نهایی" });
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();
    await expect(submitBtn).toBeDisabled();
  });

  test("shows single success toast per submit", async ({ page }) => {
    await setupWizardBackend(page);
    await login(page);
    await journeyToPayment(page);

    await page.getByRole("button", { name: "ثبت نهایی" }).click();
    const toast = page.getByText("پذیرش نوبت تستی با موفقیت ثبت شد");
    await expect(toast).toBeVisible({ timeout: 15000 });
    // Exactly one instance — a double submit would stack a second toast.
    await expect(toast).toHaveCount(1);
  });
});
