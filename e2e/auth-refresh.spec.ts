import { expect, test } from "@playwright/test";

import { installMockBackend, login } from "./helpers";

/**
 * Issue #1: an unsafe request must be preceded by a token refresh when the
 * session module state is stale. Logout is the simplest unsafe POST on the
 * dashboard — the proactive-refresh interceptor fires before it. A spy route
 * registered after the mock backend records the order and defers (fallback)
 * so the real mocks still answer.
 */
test.describe("Auth token proactive refresh (issue #1)", () => {
  test("refreshes before the logout POST when token is stale", async ({ page }) => {
    await installMockBackend(page);
    await login(page);
    // Fresh navigation resets module state (lastRotatedAt = null), so the
    // next unsafe POST must rotate first — exactly the stale-token case.
    await page.goto("/dashboard");

    const order: string[] = [];
    await page.route("**/api/**", async (route) => {
      const url = route.request().url();
      if (url.includes("/auth/token/refresh/")) order.push("refresh");
      if (url.includes("/auth/logout/")) order.push("logout");
      await route.fallback();
    });

    await page.getByRole("button", { name: "خروج از سیستم" }).click();

    await expect
      .poll(() => order, { timeout: 10000 })
      .toEqual(expect.arrayContaining(["refresh", "logout"]));
    expect(order.indexOf("refresh")).toBeLessThan(order.indexOf("logout"));
  });
});
