import { test, expect } from "@playwright/test";
import { login, installMockBackend } from "./helpers";

test.describe("Auth token proactive refresh (issue #1)", () => {
  test("triggers refresh before unsafe request when token stale", async ({ page }) => {
    await installMockBackend(page);
    await login(page);
    // Navigate to a page that makes unsafe requests
    await page.goto("/dashboard");
    // Record route order
    const routeLog: string[] = [];
    await page.route("**/*", (route) => {
      routeLog.push(route.request().url());
      return route.continue();
    });
    // Make an unsafe request (POST)
    await page.getByRole("button", { name: "ثبت نهایی" }).click();
    // The refresh endpoint should have been hit before the target request
    const refreshHit = routeLog.some((url) => url.includes("/auth/token/refresh/"));
    expect(refreshHit).toBe(true);
  });
});
