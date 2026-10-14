import { FIXED_RATE, SERVICE_PRICE_USD_NULL_ERROR } from "./fixtures";
import type { MockExpense, MockSale, MockService, MockVisit } from "./fixtures";
import { seedServices, seedVisit } from "./fixtures";

/**
 * In-memory state shared across a single test. Mirrors the real backend's
 * mutable resources so multi-step flows (reserve -> complete -> checkout) stay
 * stateful within one test.
 */
export interface MockState {
  services: MockService[];
  visits: MockVisit[];
  sales: MockSale[];
  expenses: MockExpense[];
  rate: string;
  nextIds: { service: number; visit: number; sale: number; expense: number };
}

export function createMockState(): MockState {
  return {
    services: seedServices.map((s) => ({ ...s })),
    visits: [{ ...seedVisit }],
    sales: [],
    expenses: [],
    rate: FIXED_RATE,
    nextIds: { service: 3, visit: 2, sale: 1, expense: 1 },
  };
}

export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

/** A parsed request the pure handlers operate on. */
export interface MockRequest {
  method: HttpMethod;
  /** Path without the `/api` prefix, e.g. `/services/` or `/visits/1/complete/`. */
  path: string;
  body: Record<string, unknown>;
}

export interface MockReply {
  status: number;
  body: unknown;
}

const ok = (body: unknown): MockReply => ({ status: 200, body });
const bad = (body: unknown): MockReply => ({ status: 400, body });

/** Cents of a USD value; used to compare money without float drift. */
function toCents(usd: number): number {
  return Math.round(usd * 100);
}

/** Banker's rounding to fixed decimals (half-even), like the backend. */
export function roundHalfEven(value: number, decimals: number): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  const scaled = value * factor;
  const floor = Math.floor(scaled);
  const diff = scaled - floor;
  let rounded: number;
  if (diff > 0.5) rounded = floor + 1;
  else if (diff < 0.5) rounded = floor;
  else rounded = floor % 2 === 0 ? floor : floor + 1; // exactly .5 -> to even
  return rounded / factor;
}

/**
 * POST /services/ — `customers/serializers.py:42-70` + DRF null rule.
 * An explicit `price_usd: null` key is rejected; when the key is absent the
 * backend derives it from `price` (2dp half-even) and accepts.
 */
export function handleCreateService(state: MockState, req: MockRequest): MockReply {
  const body = req.body as {
    name?: string;
    time?: number;
    price?: string;
    price_usd?: unknown;
  };

  // DRF treats a present-but-null field as an explicit value -> validation error.
  if ("price_usd" in body && body.price_usd === null) {
    return bad({ price_usd: [SERVICE_PRICE_USD_NULL_ERROR] });
  }

  const price = Number(body.price ?? 0);
  const rate = Number(state.rate);
  const derived = price > 0 && rate > 0 ? roundHalfEven(price / rate, 2) : 0;

  const service: MockService = {
    id: state.nextIds.service++,
    name: String(body.name ?? ""),
    time: Number(body.time ?? 0),
    price: String(body.price ?? "0"),
    price_usd: body.price_usd != null ? String(body.price_usd) : derived.toFixed(2),
    compensation_role: "none",
    description: "",
    is_active: true,
  };
  state.services.push(service);
  return ok(service);
}

/**
 * POST /visits/:id/complete/ — `customers/views.py:655-675`.
 * Any service with compensation_role !== "none" requires staff. The serializer
 * field is read-only, so a compensable visit 400s until staff is set in state.
 */
export function handleCompleteVisit(state: MockState, req: MockRequest): MockReply {
  const id = parseId(req.path, "/visits/", "/complete/");
  const visit = state.visits.find((v) => v.id === id);
  if (!visit) return bad({ error: "Not found." });

  const compensable = visit.services.some((sid) => {
    const svc = state.services.find((s) => s.id === sid);
    return svc != null && svc.compensation_role !== "none";
  });

  if (compensable && visit.staff == null) {
    return bad({
      error:
        "This visit has a service that requires a staff member. Assign staff before completing it.",
    });
  }

  visit.status = "COMPLETED";
  return ok(visit);
}

/**
 * POST /finance/checkout/ — `finance/services/payments.py:76-203`.
 * Components must sum to amount_usd after half-even conversion; replay of a
 * prior idempotency_key returns the original sale.
 */
export function handleCheckout(state: MockState, req: MockRequest): MockReply {
  const body = req.body as {
    customer?: number;
    amount_usd?: string | number;
    components?: { method?: string; amount_usd?: string | number }[];
    discount_usd?: string;
    visit?: number | null;
    package?: number | null;
    idempotency_key?: string;
  };

  const key = body.idempotency_key ?? null;
  if (key) {
    const existing = state.sales.find((s) => s.idempotency_key === key);
    if (existing) return ok(existing);
  }

  const amountUsd = Number(body.amount_usd ?? 0);
  const components = body.components ?? [];
  const rate = Number(state.rate);
  const sumCents = components.reduce((acc, c) => acc + toCents(Number(c.amount_usd ?? 0)), 0);

  if (toCents(amountUsd) !== sumCents) {
    return bad({
      error: "Payment components must sum to the sale amount (after currency conversion).",
    });
  }

  const sale: MockSale = {
    id: state.nextIds.sale++,
    customer: Number(body.customer ?? 0),
    visit: body.visit ?? null,
    package: body.package ?? null,
    amount_usd: amountUsd.toFixed(2),
    discount_usd: String(body.discount_usd ?? "0.00"),
    amount_toman: Math.round(amountUsd * rate).toString(),
    exchange_rate: state.rate,
    status: "PAID",
    idempotency_key: key,
  };
  state.sales.push(sale);
  return ok(sale);
}

/**
 * POST /finance/expenses/ — `finance/services/expenses.py:17-32`.
 * Stores amount_usd (2dp half-even) and derives amount_toman = usd x rate.
 * The response never includes `category_name` (mirrors the real contract).
 */
export function handleCreateExpense(state: MockState, req: MockRequest): MockReply {
  const body = req.body as {
    category?: number | null;
    amount_usd?: string | number;
    description?: string;
    status?: string;
  };

  const rate = Number(state.rate);
  const amountUsd = roundHalfEven(Number(body.amount_usd ?? 0), 2);
  const amountToman = Math.round(amountUsd * rate);

  const expense: MockExpense = {
    id: state.nextIds.expense++,
    category: body.category ?? null,
    category_name: null, // never in the create response
    amount_usd: amountUsd.toFixed(2),
    amount_toman: amountToman.toString(),
    description: String(body.description ?? ""),
    status: (body.status as MockExpense["status"]) ?? "draft",
  };
  state.expenses.push(expense);
  return ok(expense);
}

/** Extract an integer id between a prefix and a suffix in a path. */
function parseId(path: string, prefix: string, suffix: string): number {
  const start = path.indexOf(prefix);
  const from = start >= 0 ? start + prefix.length : 0;
  const end = path.indexOf(suffix, from);
  const segment = end >= 0 ? path.slice(from, end) : path.slice(from);
  return Number(segment.replace(/\/$/, ""));
}
