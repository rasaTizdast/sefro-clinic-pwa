import { expect, test } from "@playwright/test";

import { installMockBackend, login } from "./helpers";

/**
 * Issue #2: the service form posts only the Toman price — the backend derives
 * price_usd. Sending `price_usd: null` is rejected by DRF, so the payload must
 * omit the key entirely. Also verifies the "none" compensation role can be
 * saved (issue: backend supports it but the form hid it).
 */

async function openServiceModal(page: any) {
  await page.goto("/services");
  await page.getByRole("button", { name: "خدمت جدید" }).click();
}

async function fillServiceForm(page: any, name: string) {
  await page.getByLabel("نام خدمت").fill(name);
  await page.getByLabel("مدت زمان (دقیقه)").fill("30");
  await page.getByLabel("قیمت (تومان)").fill("150000");
}

test.describe("Service create (issue #2)", () => {
  test("accepts service with Toman price only — no price_usd on the wire", async ({ page }) => {
    await installMockBackend(page);
    await login(page);

    let captured: Record<string, unknown> | null = null;
    await page.route("**/api/services/**", async (route: any, request: any) => {
      if (request.method() === "POST") captured = request.postDataJSON();
      await route.fallback();
    });

    await openServiceModal(page);
    await fillServiceForm(page, "کوتاهی مو");
    await page.getByRole("button", { name: "ذخیره" }).click();

    await expect(page.getByText("خدمت با موفقیت افزوده شد.")).toBeVisible({ timeout: 10000 });
    expect(captured).not.toBeNull();
    const body = captured as Record<string, unknown>;
    expect(body.name).toBe("کوتاهی مو");
    expect(body.price).toBe(150000);
    expect(body.time).toBe(30);
    expect(body.compensation_role).toBe("doctor");
    // The backend derives USD from the Toman price — the key must be absent.
    expect("price_usd" in body).toBe(false);
    expect("priceUsd" in body).toBe(false);
  });

  test("saves the none compensation role as compensation_role: none", async ({ page }) => {
    await installMockBackend(page);
    await login(page);

    let captured: Record<string, unknown> | null = null;
    await page.route("**/api/services/**", async (route: any, request: any) => {
      if (request.method() === "POST") captured = request.postDataJSON();
      await route.fallback();
    });

    await openServiceModal(page);
    await fillServiceForm(page, "اتاق استراحت");

    // The role combobox — pick «بدون اپراتور» (no operator).
    await page.getByLabel("نقش اپراتور").click();
    await page.getByRole("option", { name: "بدون اپراتور" }).click();
    await page.getByRole("button", { name: "ذخیره" }).click();

    await expect(page.getByText("خدمت با موفقیت افزوده شد.")).toBeVisible({ timeout: 10000 });
    expect(captured).not.toBeNull();
    const body = captured as Record<string, unknown>;
    expect(body.compensation_role).toBe("none");
    expect("price_usd" in body).toBe(false);
  });
});
