import { describe, expect, it } from "vitest";

import {
  type MockRequest,
  createMockState,
  handleCheckout,
  handleCompleteVisit,
  handleCreateExpense,
  handleCreateService,
  roundHalfEven,
} from "../contracts";

function req(path: string, body: Record<string, unknown> = {}): MockRequest {
  return { method: "POST", path, body };
}

describe("roundHalfEven", () => {
  it("rounds .5 to the nearest even last digit", () => {
    expect(roundHalfEven(0.125, 2)).toBe(0.12);
    expect(roundHalfEven(0.135, 2)).toBe(0.14);
    expect(roundHalfEven(1.005, 2)).toBe(1.0); // 1.00
  });

  it("rounds non-half values normally", () => {
    expect(roundHalfEven(1.644, 2)).toBe(1.64);
    expect(roundHalfEven(1.646, 2)).toBe(1.65);
  });
});

describe("handleCreateService (issue #2: price_usd null rejection)", () => {
  it("rejects an explicit price_usd: null with the fa message", () => {
    const state = createMockState();
    const reply = handleCreateService(
      state,
      req("/services/", { name: "x", time: 30, price: "150000", price_usd: null })
    );
    expect(reply.status).toBe(400);
    expect(reply.body).toEqual({ price_usd: ["این مقدار نباید توهی باشد."] });
  });

  it("derives price_usd from price when the key is absent", () => {
    const state = createMockState();
    const reply = handleCreateService(
      state,
      req("/services/", { name: "کوتاهی مو", time: 30, price: "150000" })
    );
    expect(reply.status).toBe(200);
    // 150000 / 88000 = 1.7045... -> 1.70
    expect((reply.body as { price_usd: string }).price_usd).toBe("1.70");
    expect(state.services.at(-1)?.name).toBe("کوتاهی مو");
  });
});

describe("handleCompleteVisit (issue #5: compensable visit needs staff)", () => {
  it("400s when a compensable service has no staff", () => {
    const state = createMockState();
    // seed visit 1 uses service 1 (compensation_role: doctor), staff null.
    const reply = handleCompleteVisit(state, req("/visits/1/complete/"));
    expect(reply.status).toBe(400);
    expect(reply.body).toEqual({
      error:
        "This visit has a service that requires a staff member. Assign staff before completing it.",
    });
  });

  it("completes once staff is assigned", () => {
    const state = createMockState();
    state.visits[0].staff = 1;
    const reply = handleCompleteVisit(state, req("/visits/1/complete/"));
    expect(reply.status).toBe(200);
    expect(state.visits[0].status).toBe("COMPLETED");
  });
});

describe("handleCheckout (issue: components must sum to amount)", () => {
  it("accepts components that sum to amount_usd", () => {
    const state = createMockState();
    const reply = handleCheckout(
      state,
      req("/finance/checkout/", {
        customer: 1,
        amount_usd: "10.00",
        components: [
          { method: "cash", amount_usd: "4.00" },
          { method: "card", amount_usd: "6.00" },
        ],
        idempotency_key: "k1",
      })
    );
    expect(reply.status).toBe(200);
    expect((reply.body as { amount_toman: string }).amount_toman).toBe("880000");
  });

  it("converts cash_toman components from Toman before summing (backend from_toman)", () => {
    const state = createMockState();
    // 150000 Toman at rate 88000 -> 1.7045 USD -> half-even 1.70
    const reply = handleCheckout(
      state,
      req("/finance/checkout/", {
        customer: 1,
        amount_usd: "1.70",
        components: [{ method: "cash_toman", amount_usd: "150000" }],
        idempotency_key: "toman",
      })
    );
    expect(reply.status).toBe(200);
  });

  it("rejects a cash_toman component that converts to a different sum", () => {
    const state = createMockState();
    // Naive summing would see 150000 as USD; the converted sum is 1.70.
    const reply = handleCheckout(
      state,
      req("/finance/checkout/", {
        customer: 1,
        amount_usd: "150000.00",
        components: [{ method: "cash_toman", amount_usd: "150000" }],
        idempotency_key: "toman-bad",
      })
    );
    expect(reply.status).toBe(400);
  });

  it("rejects when components do not sum to amount_usd", () => {
    const state = createMockState();
    const reply = handleCheckout(
      state,
      req("/finance/checkout/", {
        customer: 1,
        amount_usd: "10.00",
        components: [{ method: "cash", amount_usd: "9.99" }],
        idempotency_key: "k2",
      })
    );
    expect(reply.status).toBe(400);
  });

  it("replays an idempotency key without creating a duplicate sale", () => {
    const state = createMockState();
    const first = handleCheckout(
      state,
      req("/finance/checkout/", {
        customer: 1,
        amount_usd: "5.00",
        components: [{ method: "cash", amount_usd: "5.00" }],
        idempotency_key: "same",
      })
    );
    const second = handleCheckout(
      state,
      req("/finance/checkout/", {
        customer: 1,
        amount_usd: "5.00",
        components: [{ method: "cash", amount_usd: "5.00" }],
        idempotency_key: "same",
      })
    );
    expect((first.body as { id: number }).id).toBe((second.body as { id: number }).id);
    expect(state.sales).toHaveLength(1);
  });
});

describe("handleCreateExpense (issue #6a: half-even USD + derived Toman)", () => {
  it("stores half-even USD and derives amount_toman at the fixed rate", () => {
    const state = createMockState();
    // 500000 Toman at rate 91000 -> 5.4945 USD -> half-even 5.49; toman 5.49*91000
    const reply = handleCreateExpense(
      state,
      req("/finance/expenses/", {
        category: 1,
        amount_usd: "5.4945",
        description: "کرایه تاکسی",
      })
    );
    expect(reply.status).toBe(200);
    const body = reply.body as { amount_usd: string; amount_toman: string; category_name: unknown };
    expect(body.amount_usd).toBe("5.49");
    expect(body.amount_toman).toBe(String(Math.round(5.49 * 88000)));
    expect(body.category_name).toBeNull();
  });
});
