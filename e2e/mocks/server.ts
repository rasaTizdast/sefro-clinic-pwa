import type { Page, Route } from "@playwright/test";

import { mockAllApiEndpoints } from "../helpers";
import {
  type MockReply,
  type MockState,
  createMockState,
  handleCancelVisit,
  handleCheckout,
  handleCompleteVisit,
  handleConfirmVisit,
  handleCreateExpense,
  handleCreateService,
  handleReserveVisit,
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
      test: (p) => p === "/visits/",
      handle: (state, req) => handleReserveVisit(state, req),
    },
    {
      method: "POST",
      test: (p) => /^\/visits\/\d+\/confirm\/$/.test(p),
      handle: (state, req) => handleConfirmVisit(state, req),
    },
    {
      method: "POST",
      test: (p) => /^\/visits\/\d+\/cancel\/$/.test(p),
      handle: (state, req) => handleCancelVisit(state, req),
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
 * Install a self-contained mock backend: `mockAllApiEndpoints` provides auth
 * (token/me/refresh/logout) and sensible GET defaults for every endpoint, then
 * one catch-all page.route handler dispatches stateful POSTs to the pure
 * contract handlers. The catch-all is registered last (Playwright prefers the
 * most recent route) and `route.fallback()`s anything it does not own, so
 * GETs — including auth — fall through to the base layer and nothing ever
 * leaks to a real server. Specs may still layer their own fixtures on top.
 */
export async function installMockBackend(
  page: Page,
  state: MockState = createMockState()
): Promise<void> {
  await mockAllApiEndpoints(page);

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
