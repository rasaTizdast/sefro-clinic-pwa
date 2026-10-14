import { test, expect } from "@playwright/test";
import { login, installMockBackend } from "./helpers";

test.describe("Extra products auto-add (issue #4)", () => {
  test("selecting product adds row without add button", async ({ page }) => {
    await installMockBackend(page);
    await login(page);
    await page.goto("/wizard/service");
    // Open the extra products block
    await page.getByRole("button", { name: "محصولات این صورتحساب" }).click();
    // Select a product - it should auto-add
    await page.locator("select").first().selectOption("50");
    // Row should appear
    await expect(page.getByText("سرم ویتامین")).toBeVisible();
    // The add button should be gone
    await expect(page.getByRole("button", { name: "افزودن محصول" })).not.toBeVisible();
  });
});
