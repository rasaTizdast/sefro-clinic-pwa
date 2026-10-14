import type { Page, Route } from "@playwright/test";

import {
  type MockReply,
  type MockState,
  createMockState,
  handleCheckout,
  handleCompleteVisit,
  handleCreateExpense,
  handleCreateService,
} from "./contracts";

/**
 * A pure route: match a request path (after the `/api` prefix) and produce a
 * reply from in-memory state. Kept tiny so the real validation logic lives in
 * the unit-tested contracts.ts.
 */
interface MockRoute {
  method: string;
  /** Matches the `/api`-relative path, e.g. `/services/` or `/visits/1/complete/`. */
  test: (path: string) => boolean;
  handle: (
    state: MockState,
    req: { method: string; path: string; body: Record<string, unknown> }
  ) => MockReply;
}

const API = "/api";

function routes(): MockRoute[] {
  return [
    {
      method: "POST",
      test: (p) => p === "/services/",
      handle: (state, req) => handleCreateService(state, req),
    },
    {
      method: "POST",
      test: (p) => /^\/visits\/\d+\/complete\/$/.test(p),
      handle: (state, req) => handleCompleteVisit(state, req),
    },
    {
      method: "POST",
      test: (p) => p === "/finance/checkout/",
      handle: (state, req) => handleCheckout(state, req),
    },
    {
      method: "POST",
      test: (p) => p === "/finance/expenses/",
      handle: (state, req) => handleCreateExpense(state, req),
    },
  ];
}

function apiPath(url: string): string | null {
  const idx = url.indexOf(API + "/");
  if (idx < 0) return url.includes(API) ? "/" : null;
  return url.slice(idx + API.length);
}

/**
 * Install the contract-faithful mock backend. One catch-all page.route handler
 * dispatches each request to the pure contract handlers, keeping an in-memory
 * state object alive across the test so multi-step flows behave statefully.
 */
export async function installMockBackend(
  page: Page,
  state: MockState = createMockState()
): Promise<void> {
  await page.route("**/*", async (route: Route) => {
    const request = route.request();
    const relPath = apiPath(request.url());
    if (relPath === null) return route.fallback();

    const match = routes().find((r) => r.method === request.method() && r.test(relPath));
    if (!match) return route.fallback();

    let body: Record<string, unknown> = {};
    try {
      body = (request.postDataJSON() ?? {}) as Record<string, unknown>;
    } catch {
      body = {};
    }

    const reply = match.handle(state, {
      method: request.method(),
      path: relPath,
      body,
    });

    await route.fulfill({
      status: reply.status,
      contentType: "application/json",
      body: JSON.stringify(reply.body),
    });
  });
}
