import { test, expect } from "@playwright/test";
import { login, installMockBackend } from "./helpers";

test.describe("Staff expense claims (issue #6)", () => {
  test("creates claim with half-even USD rounding", async ({ page }) => {
    await installMockBackend(page);
    let storedAmountUsd: string | null = null;
    await page.route("**/api/finance/expense-categories/**", async (route, request) => {
      if (request.method() === "POST") {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ id: 9, name: "رفت‌وآمد", is_active: true }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ count: 0, results: [] }),
      });
    });
    await page.route("**/api/finance/expenses/**", async (route, request) => {
      if (request.method() === "POST") {
        const payload = request.postDataJSON() as { amount_usd: string };
        storedAmountUsd = payload.amount_usd;
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            id: 1,
            category: 9,
            amount_usd: payload.amount_usd,
            amount_toman: "499840",
            expense_date: "1405/07/02",
            status: "draft",
          }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ count: 0, results: [] }),
      });
    });
    await login(page);
    await page.goto("/accounting");
    await page.getByRole("tab", { name: "پرسنل" }).click();
    await page.getByRole("button", { name: "مطالبه جدید" }).click();
    await page.getByLabel("دسته‌بندی جدید").fill("رفت‌وآمد");
    await page.getByRole("button", { name: "افزودن", exact: true }).click();
    await page.getByLabel("مبلغ (تومان)").fill("500000");
    await page
      .getByRole("dialog", { name: "ثبت مطالبه هزینه" })
      .getByRole("button", { name: "امروز" })
      .click();
    await page.getByRole("button", { name: "ثبت مطالبه" }).click();
    await expect(page.getByText("ثبت مطالبه هزینه")).not.toBeVisible();
    // 500000 / 88000 = 5.6818...; the client stores two-decimal half-even USD.
    expect(storedAmountUsd).toBe("5.68");
  });
});
