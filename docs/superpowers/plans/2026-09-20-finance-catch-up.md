# Finance Catch-Up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Bring the dashboard frontend in sync with backend commits `1057707..2bc53f1` — finance domain (sales/checkout, staff payouts, reports), service categories + USD pricing + consumables, packages, warehouse cost/purchases, patient birthday — replacing legacy payments with the Sale flow. Wallet subsystem, **expense subsystem**, and v2 API are **excluded**.

**Architecture:** Follow the existing per-module pattern: `src/types/<domain>.ts` → `endpoints.<domain>` in `src/config/api.ts` → `queryKeys.<domain>` in `src/lib/query-keys.ts` → `src/services/<domain>.ts` (Raw type + camelCase mapper + payload builder) → `src/hooks/api/use<Domain>Query.ts` (react-query, invalidate on `.all`, Persian toasts) → page/tab UI. The axios client already snake⇄camel transforms payloads, so services work in camelCase. All money arrives as **strings** (DRF decimals); USD is authoritative, Toman is displayed primary and is what forms input (converted to USD via the current exchange rate).

**Tech Stack:** React 19, TypeScript (~6.0, `verbatimModuleSyntax`, `erasableSyntaxOnly`), react-router v7, @tanstack/react-query, axios, Tailwind v4, zod/v4 (`zod/v4` import), jalaali-js, recharts, Vitest + Testing Library, Playwright. pnpm.

**Source of truth for decisions:** `docs/backend-sync-gap-analysis.md` §4 (access matrix §4.4, testing plan §4.5).

---

## Global conventions (apply to every task)

- **Money:** backend returns decimals as **strings**. Keep them as `string` in TS types; convert with `Number(x)` only for display via `formatPrice` (`src/lib/format.ts`) or math.
- ⚠️ **RESOLVED during execution (Tasks 3–4) — response shape:** `src/lib/api-client.ts` runs `toCamelCase` on every response (keys only). So service **mappers must read camelCase keys** (`raw.priceUsd`), not snake_case — the snake_case snippets in later tasks are illustrative of the *wire* format only. Raw types in existing services (e.g. `src/services/services.ts`) follow the local convention; match the neighbouring file.
- ⚠️ **`toPaginatedResponse` real signature:** `toPaginatedResponse(drfPayload, page, perPage)` and it maps `drfPayload.data` — NOT `toPaginatedResponse(data, mapper)`. Copy the pattern from `src/services/services.ts` (including its `DEFAULT_PER_PAGE = 20` and `page`/`per_page` request params).
- **Dates:** customer/visit dates are Shamsi; **finance report params are Gregorian `YYYY-MM-DD`** (convert with `jalaliToGregorianISO` from `src/lib/date.ts`). Birthday field is Shamsi `YYYY-MM-DD` (use `jalaliToShamsiApiDate`).
- **Access gating:** `usePermissions()` (`src/hooks/usePermissions.ts`) currently exposes `canDelete`, `canManageUsers`, `canViewLogs` (all = isAdmin). Task 2 extends it.
- ⚠️ **`queryKeys.finance.*` report keys are key *factories*** (`(params) => [...]`). Use them for `useQuery({ queryKey })`, but for invalidation pass the literal prefix array (e.g. `["finance", "dashboard"]`) — a function is not a valid `QueryKey`.
- ⚠️ **`toQueryParams` only maps page/perPage/search/sort/order.** Domain filters (`customer`, `status`, `staff`, `role`) must be appended manually (see Task 5's `listSales`).
- **TDD:** each task writes the failing test first, runs it, implements, re-runs, commits. Commit prefix per TBD rules (`feat:`, `test:`, `refactor:` …). Keep commits 50–200 lines.
- **Tests:** unit/component beside code in `__tests__`; run `pnpm test:unit`. Full gate before merge: `pnpm lint && pnpm typecheck && pnpm test:unit && pnpm build`.
- **e2e:** Playwright specs in `e2e/`. The critical new spec is `e2e/checkout-flow.spec.ts` (Task 13).

---

## Phase 0 — Foundations

### Task 1: Currency library (Toman⇄USD)

**Files:**
- Create: `src/lib/currency.ts`
- Test: `src/lib/__tests__/currency.test.ts`

- [x] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { tomanToUsd, usdToToman, formatUsd, formatToman } from "../currency";

describe("currency", () => {
  it("converts toman to usd with 2dp rounding", () => {
    expect(tomanToUsd(1_000_000, 100_000)).toBe("10.00");
  });
  it("returns null when rate is null/0", () => {
    expect(tomanToUsd(100, null)).toBeNull();
    expect(tomanToUsd(100, 0)).toBeNull();
  });
  it("converts usd to toman (rounded to integer)", () => {
    expect(usdToToman("12.34", 100_000)).toBe(1_234_000);
  });
  it("formats display strings", () => {
    expect(formatToman("1234567")).toContain("۱"); // Persian digits via formatPrice
    expect(formatUsd("12.34")).toBe("$12.34");
  });
});
```

- [x] **Step 2: Run** `pnpm vitest run src/lib/__tests__/currency.test.ts` — expect FAIL (module missing).
- [x] **Step 3: Implement** `src/lib/currency.ts`:

```ts
import { formatPrice } from "./format";

/** Convert Toman (integer) to USD string with 2 decimal places. Null when no usable rate. */
export function tomanToUsd(toman: number, rate: number | null): string | null {
  if (!rate || rate <= 0) return null;
  return (toman / rate).toFixed(2);
}

/** Convert USD decimal string to integer Toman using rate. */
export function usdToToman(usd: string, rate: number | null): number {
  if (!rate || rate <= 0) return 0;
  return Math.round(Number(usd) * rate);
}

/** Display helpers — Toman primary (Persian digits), USD secondary. */
export function formatToman(amount: string | number): string {
  return formatPrice(Number(amount));
}


---

### Task 2: Permissions extension + finance query keys + endpoints

**Files:**
- Modify: `src/hooks/usePermissions.ts`
- Modify: `src/lib/query-keys.ts`
- Modify: `src/config/api.ts`
- Test: `src/hooks/__tests__/usePermissions.test.tsx` (extend existing if present)

- [x] **Step 1: Failing test** — assert `canManageFinance` is `true` for admin, `false` for employee.
- [x] **Step 2: Run** — FAIL (properties missing).
- [x] **Step 3: Implement** — extend `Permissions` interface + return (both new flags = `isAdmin`; non-authed → all false):

```ts
interface Permissions {
  canDelete: boolean;
  canManageUsers: boolean;
  canViewLogs: boolean;
  canManageFinance: boolean;   // admin: refund sales, manage rates/categories/rules
}
```

- [x] **Step 4: Add query keys** to `src/lib/query-keys.ts` (inside `queryKeys` object):

```ts
sales: {
  all: ["sales"] as const,
  list: (params?: Record<string, unknown>) => ["sales", "list", params] as const,
  detail: (id: number) => ["sales", id] as const,
},
payouts: {
  all: ["payouts"] as const,
  list: (params?: Record<string, unknown>) => ["payouts", "list", params] as const,
  summary: (params?: Record<string, unknown>) => ["payouts", "summary", params] as const,
  rules: ["payouts", "rules"] as const,
},
packages: {
  all: ["packages"] as const,
  list: (params?: Record<string, unknown>) => ["packages", "list", params] as const,
  detail: (id: number) => ["packages", id] as const,
},
serviceCategories: {
  all: ["serviceCategories"] as const,
  list: ["serviceCategories", "list"] as const,
},
finance: {
  exchangeRates: ["finance", "exchangeRates"] as const,
  currentRate: ["finance", "currentRate"] as const,
  backupRate: ["finance", "backupRate"] as const,
  financialSummary: (params?: Record<string, unknown>) => ["finance", "financialSummary", params] as const,
  profitByService: (params?: Record<string, unknown>) => ["finance", "profitByService", params] as const,
  profitByPackage: (params?: Record<string, unknown>) => ["finance", "profitByPackage", params] as const,
  profitByStaff: (params?: Record<string, unknown>) => ["finance", "profitByStaff", params] as const,
  dashboard: (params?: Record<string, unknown>) => ["finance", "dashboard", params] as const,
  purchases: (params?: Record<string, unknown>) => ["finance", "purchases", params] as const,
  usages: (params?: Record<string, unknown>) => ["finance", "usages", params] as const,
  costHistory: (productId: number) => ["finance", "costHistory", productId] as const,
},
```

- [x] **Step 5: Add endpoints** to `src/config/api.ts` (paths exactly as backend, leading slash, relative to `API_URL`):

```ts
sales: {
  list: "/finance/sales/",
  detail: (id: number) => `/finance/sales/${id}/`,
  refund: (id: number) => `/finance/sales/${id}/refund/`,
  checkout: "/finance/checkout/",
},
payouts: {
  list: "/finance/staff-payouts/",
  summary: "/finance/reports/staff-payout-summary/",
  rules: "/finance/staff-compensation-rules/",
  ruleDetail: (id: number) => `/finance/staff-compensation-rules/${id}/`,
},
packages: {
  list: "/finance/packages/",
  detail: (id: number) => `/finance/packages/${id}/`,
  items: "/finance/package-items/",
  services: "/finance/package-services/",
},
serviceCategories: {
  list: "/service-categories/",
  detail: (id: number) => `/service-categories/${id}/`,
},
finance: {
  exchangeRates: "/finance/exchange-rates/",
  exchangeRateDetail: (id: number) => `/finance/exchange-rates/${id}/`,
  exchangeDollar: "/reports/exchange-dollar/",
  backupExchange: "/reports/backup-exchange/",
  serviceItems: "/finance/service-items/",
  serviceItemDetail: (id: number) => `/finance/service-items/${id}/`,
  purchases: "/finance/product-purchases/",
  usages: "/finance/product-usages/",
  costHistory: "/finance/product-cost-history/",
  recordConsumption: (visitId: number) => `/finance/visits/${visitId}/record-consumption/`,
  financialSummary: "/finance/reports/financial-summary/",
  profitByService: "/finance/reports/profit-by-service/",
  profitByPackage: "/finance/reports/profit-by-package/",
  profitByStaff: "/finance/reports/profit-by-staff/",
  dashboard: "/finance/reports/dashboard/",
},
```

- [x] **Step 6: Run tests** (`pnpm test:unit`) — PASS.
- [x] **Step 7: Commit** `feat(config): add finance endpoints, query keys, and finance permissions`

export function formatUsd(amount: string | number): string {
  return `$${Number(amount).toFixed(2)}`;
}
```

- [x] **Step 4: Run test** — expect PASS.
- [x] **Step 5: Commit** `git add src/lib/currency.ts src/lib/__tests__/currency.test.ts && git commit -m "feat(lib): add Toman⇄USD currency helpers"`


---

### Task 3: Finance domain types

**Files:**
- Create: `src/types/finance.ts`
- Modify: `src/types/index.ts`
- Test: none (types only; covered by consumers' tests)

- [x] **Step 1: Create `src/types/finance.ts`** — string decimals, camelCase (post-interceptor):

```ts
export type SaleStatus = "pending" | "paid" | "refunded" | "partiallyRefunded" | "cancelled";
export type PaymentMethod = "cash" | "card";
export type PayoutStatus = "pending" | "approved" | "paid" | "cancelled";
export type CompensationRole = "none" | "doctor" | "facial" | "laser";
export type PayoutType = "cash" | "product" | "hybrid";
export type CalculationType = "percentProfit" | "fixedPerSession" | "monthlySalary";
export type ReportPeriod = "today" | "this_week" | "this_month" | "prev_month" | "this_year";

export interface Sale {
  id: number; customer: number; visit: number | null; package: number | null;
  amountUsd: string; discountUsd: string; exchangeRate: string | null;
  amountToman: string; status: SaleStatus; idempotencyKey: string | null; createdAt: string;
}
export interface PaymentComponentInput { method: PaymentMethod; amountUsd: string }
export interface CheckoutPayload {
  customer: number; amountUsd: string; components: PaymentComponentInput[];
  discountUsd?: string; visit?: number | null; package?: number | null;
  idempotencyKey: string; description?: string;
}
export interface ExchangeRate {
  id: number; currencyFrom: string; currencyTo: string; rate: string;
  effectiveAt: string; source: string; isActive: boolean; createdAt: string;
}
export interface CurrentRate {
  rate: string; rateTomanPerUsd: string; effectiveAt: string | null; source: string;
}
```

> ✅ **RESOLVED during execution (Task 3):** `src/lib/transform.ts` transforms **object keys only** — string values pass through untouched. Therefore enum-like values stay **snake_case** in TS unions: `SaleStatus` uses `"partially_refunded"`, `CalculationType` uses `"percent_profit" | "fixed_per_session" | "monthly_salary"`, `ReportPeriod` uses `"this_week" | "this_month" | "prev_month" | "this_year"`. Single-word values (`"cash"`, `"card"`, `"doctor"`, `"facial"`, `"laser"`, `"pending"`, `"paid"`, …) are unaffected. Field names remain camelCase (keys are transformed).


- [x] **Step 2: Continue `src/types/finance.ts`** — payout/package/inventory interfaces:

```ts
export interface StaffCompensationRule {
  id: number; role: Exclude<CompensationRole, "none">; payoutType: PayoutType;
  calculationType: CalculationType; percentProfit: string | null;
  fixedAmountUsd: string | null; fixedAmountToman: string | null;
  transportUsd: string; transportToman: string;
  product: number | null; productQty: string; isActive: boolean;
}
export interface StaffPayout {
  id: number; staff: number; staffName: string; visit: number; service: number;
  serviceName: string | null; role: CompensationRole;
  revenueUsd: string; revenueToman: string; productCostUsd: string; productCostToman: string;
  profitUsd: string; profitToman: string; payoutCashUsd: string; payoutCashToman: string;
  payoutProduct: number | null; productName: string | null; payoutProductQty: string;
  payoutProductValueUsd: string; payoutProductValueToman: string;
  totalPayoutUsd: string; totalPayoutToman: string;
  exchangeRate: string; status: PayoutStatus; payoutMode: "cash" | "product"; notes: string;
  approvedBy: number | null; approvedAt: string | null; paidAt: string | null; createdAt: string;
}
export interface StaffPayoutSummary {
  totalCashUsd: string; totalCashToman: string; totalProductValueUsd: string;
  totalProductValueToman: string; totalPayoutUsd: string; totalPayoutToman: string; payoutCount: number;
}
export interface Package {
  id: number; name: string; description: string; priceUsd: string;
  priceToman: string | null; exchangeRate: string | null; isActive: boolean;
  services: number[]; items: { product: number; quantity: string }[];
}
export interface ServiceCategory {
  id: number; name: string; slug: string; description: string; isActive: boolean; sortOrder: number;
}
export interface ServiceItem { id: number; service: number; product: number; productName: string; quantity: string }
export interface ProductPurchase {
  id: number; product: number; quantity: string; unitCostUsd: string; totalCostUsd: string;
  supplier: string; purchaseDate: string; exchangeRateSnapshot: string | null; createdAt: string;
}
export interface ProductUsage {
  id: number; product: number; visit: number | null; service: number | null; packageSale: number | null;
  quantity: string; unitCostUsdSnapshot: string; totalCostUsdSnapshot: string;
  exchangeRateSnapshot: string; createdAt: string;
}
export interface ProductCostHistory {
  id: number; product: number; costUsd: string; effectiveFrom: string; effectiveTo: string | null;
}
```

> `paymentMethods.wallet` exists in backend report payloads but is never displayed (wallet out of scope).

- [x] **Step 3: Report types** in the same file:

```ts
export interface FinancialSummary {
  period: { start: string; end: string };
  revenue: { usd: string; toman: string }; productCost: { usd: string; toman: string };
  grossProfit: { usd: string; toman: string }; expenses: { usd: string; toman: string };
  netProfit: { usd: string; toman: string };
  paymentMethods: { cash: string; card: string; wallet: string };
  counts: { appointments: number; packagesSold: number; productsSoldQuantity: string; paidSales: number; averageTransactionValue: string };
}
export interface ProfitRow {
  serviceId?: number; packageId?: number; staffId?: number;
  serviceName?: string; packageName?: string; staffName?: string;
  revenueUsd: string; productCostUsd: string; count?: number; visitCount?: number;
  profitUsd: string; profitMarginPercent?: string;
  revenueToman?: string; productCostToman?: string; profitToman?: string;
}
export interface FinanceDashboard {
  period: { start: string; end: string };
  salesSummary: {
    revenueUsd: string; revenueToman: string; grossProfitUsd: string; grossProfitToman: string;
    expensesUsd: string; expensesToman: string; netProfitUsd: string; netProfitToman: string;
    totalPayoutUsd: string; totalPayoutToman: string; saleCount: number; avgTicketUsd: string;
    paymentMethods: { cash: string; card: string; wallet: string };
  };
  operational: { visitsCompleted: number; newCustomers: number; staffPayoutCount: number };
}
export interface ConsumptionSelection { [serviceId: number]: { product: number; quantity: string }[] }
```

- [x] **Step 4: Re-export** from `src/types/index.ts` with `export type { … } from "./finance";`
- [x] **Step 5: Run** `pnpm typecheck` — PASS.
- [x] **Step 6: Commit** `feat(types): add finance domain types`

---


## Phase 1 — Services & hooks layer

### Task 4: Exchange-rate service + hooks (foundation for currency conversion)

**Files:**
- Create: `src/services/exchangeRates.ts`
- Create: `src/hooks/api/useExchangeRatesQuery.ts`
- Test: `src/services/__tests__/exchangeRates.test.ts`

- [x] **Step 1: Failing test** — mock `apiClient.get`; assert `getCurrentRate()` maps `{rate, rate_toman_per_usd, effective_at, source}` → camelCase `CurrentRate`; assert `listExchangeRates` paginates via `toPaginatedResponse`; assert `rate` stays a string.
- [x] **Step 2: Run** — FAIL.
- [x] **Step 3: Implement** `src/services/exchangeRates.ts`:

```ts
import { apiClient } from "../lib/api-client";
import { endpoints } from "../config/api";
import { toPaginatedResponse } from "../lib/pagination";
import type { CurrentRate, ExchangeRate } from "../types/finance";

interface RawRate { id: number; currency_from: string; currency_to: string; rate: string; effective_at: string; source: string; is_active: boolean; created_at: string }

const toRate = (r: RawRate): ExchangeRate => ({
  id: r.id, currencyFrom: r.currency_from, currencyTo: r.currency_to, rate: r.rate,
  effectiveAt: r.effective_at, source: r.source, isActive: r.is_active, createdAt: r.created_at,
});

export async function listExchangeRates(params?: { page?: number }) {
  const { data } = await apiClient.get(endpoints.finance.exchangeRates, { params });
  return toPaginatedResponse(data, toRate);
}

/** Current USD→Toman rate; 503 → throws (caller shows «نرخ ارز در دسترس نیست»). */
export async function getCurrentRate(): Promise<CurrentRate> {
  const { data } = await apiClient.get(endpoints.finance.exchangeDollar);
  return { rate: data.rate, rateTomanPerUsd: data.rate_toman_per_usd, effectiveAt: data.effective_at, source: data.source };
}

export async function getBackupRate(): Promise<CurrentRate & { provider: string }> {
  const { data } = await apiClient.get(endpoints.finance.backupExchange);
  return { rate: data.rate, rateTomanPerUsd: data.rate_toman_per_usd, effectiveAt: data.effective_at, source: data.source, provider: data.provider };
}

export async function createExchangeRate(payload: { rate: string; source?: string }) {
  const { data } = await apiClient.post(endpoints.finance.exchangeRates, payload);
  return toRate(data);
}
```

- [x] **Step 4: Hooks** — `useCurrentRate` (`staleTime: 60_000`, `retry: 1`), `useExchangeRates`, `useCreateExchangeRate` (invalidate `queryKeys.finance.exchangeRates` + `queryKeys.finance.currentRate`; toast «نرخ ارز ثبت شد» / error via `extractApiError`). Re-export from `src/hooks/api/index.ts`.
- [x] **Step 5: Run** — PASS.
- [x] **Step 6: Commit** `feat(api): exchange-rate service and hooks`

> All money forms consume `useCurrentRate()` + `tomanToUsd()` (Task 1). When the rate is unavailable, disable submit with alert «نرخ ارز در دسترس نیست».

---


### Task 5: Sales service + hooks + checkout payload builder

**Files:**
- Create: `src/services/sales.ts`
- Create: `src/hooks/api/useSalesQuery.ts`
- Test: `src/services/__tests__/sales.test.ts`

- [x] **Step 1: Failing tests**:

```ts
it("builds checkout payload whose components sum to amount_usd", () => {
  const p = buildCheckoutPayload({ customerId: 1, totalToman: 1_000_000, rate: 100_000, cashToman: 400_000, cardToman: 600_000, visitId: 9 });
  const sum = p.components.reduce((a, c) => a + Number(c.amountUsd), 0);
  expect(sum.toFixed(2)).toBe(p.amountUsd);
  expect(p.idempotencyKey).toBeTruthy();
  expect(p.visit).toBe(9);
});
it("rejects when split does not equal total", () => {
  expect(() => buildCheckoutPayload({ customerId: 1, totalToman: 100, rate: 100_000, cashToman: 40, cardToman: 50 })).toThrow();
});
it("omits zero-amount components", () => {
  const p = buildCheckoutPayload({ customerId: 1, totalToman: 500_000, rate: 100_000, cashToman: 500_000, cardToman: 0 });
  expect(p.components).toHaveLength(1);
  expect(p.components[0].method).toBe("cash");
});
```

- [x] **Step 2: Run** — FAIL.
- [x] **Step 3: Implement** `src/services/sales.ts` — key parts:

```ts
export interface CheckoutInput {
  customerId: number; totalToman: number; rate: number | null;
  cashToman: number; cardToman: number;
  visitId?: number | null; packageId?: number | null; discountToman?: number; description?: string;
}

export function buildCheckoutPayload(i: CheckoutInput): CheckoutPayload {
  if (i.cashToman + i.cardToman !== i.totalToman)
    throw new Error("Payment components must sum to the sale amount.");
  const amountUsd = tomanToUsd(i.totalToman, i.rate);
  if (amountUsd === null) throw new Error("Exchange rate unavailable.");
  const components: PaymentComponentInput[] = [];
  if (i.cashToman > 0 && i.cardToman > 0) {
    const cashUsd = tomanToUsd(i.cashToman, i.rate)!;
    // remainder goes to the last component so components sum exactly to amountUsd
    const cardUsd = (Number(amountUsd) - Number(cashUsd)).toFixed(2);
    components.push({ method: "cash", amountUsd: cashUsd }, { method: "card", amountUsd: cardUsd });
  } else {
    components.push({ method: i.cashToman > 0 ? "cash" : "card", amountUsd });
  }
  return {
    customer: i.customerId, amountUsd, components,
    ...(i.discountToman ? { discountUsd: tomanToUsd(i.discountToman, i.rate)! } : {}),
    visit: i.visitId ?? null, package: i.packageId ?? null,
    idempotencyKey: crypto.randomUUID(), description: i.description ?? "",
  };
}

export async function checkout(payload: CheckoutPayload): Promise<Sale> {
  const { data } = await apiClient.post(endpoints.sales.checkout, payload);
  return toSale(data);
}
export async function listSales(params?: PaginationParams & { customer?: number; status?: string; package?: number }) {
  const { data } = await apiClient.get(endpoints.sales.list, { params: toQueryParams(params) });
  return toPaginatedResponse(data, toSale);
}
export async function getSale(id: number): Promise<Sale> {
  const { data } = await apiClient.get(endpoints.sales.detail(id));
  return toSale(data);
}
export async function refundSale(id: number, payload: { refundAmountUsd?: string; reason?: string }): Promise<Sale> {
  const { data } = await apiClient.post(endpoints.sales.refund(id), payload);
  return toSale(data);
}
```

  (`toSale` maps the `SaleSerializer` fields to the `Sale` interface, keeping money as strings.)
- [x] **Step 4: Hooks** — `useSalesList(params)` (`placeholderData: (p) => p`), `useSale(id)`, `useCheckout()` (invalidate `queryKeys.sales.all` + `queryKeys.finance.dashboard` + `queryKeys.visits.all`; toast «فروش ثبت شد»), `useRefundSale()` (admin-gated at UI; toast «وجه بازگردانده شد»). Re-export from `src/hooks/api/index.ts`.
- [x] **Step 5: Run** — PASS.
- [x] **Step 6: Commit** `feat(api): sales/checkout service, hooks, payload builder`

---


### Task 6: ~~Expenses~~ — REMOVED

Expense subsystem cut per user decision (grouped with wallet scope). Verified: nothing else in our scope depends on expense CRUD — only the backend's report aggregations (`financial-summary`, `dashboard`) read expenses; their `expenses`/`net_profit` fields remain in the report types (Task 3) but will show 0 until expenses are entered (out of scope this iteration).

---

### Task 7: Staff payouts + compensation rules service & hooks

**Files:**
- Create: `src/services/payouts.ts`
- Create: `src/hooks/api/usePayoutsQuery.ts`
- Test: `src/services/__tests__/payouts.test.ts`

- [x] **Step 1: Failing test** — `toStaffPayout` mapper (nested SMF strings: `staff_name`, `total_payout_usd`); `listPayouts` passes `staff`, `role`, `status` filters; `listPayoutSummary` sends Gregorian `start_date/end_date` or `period`.
- [x] **Step 2: Run** — FAIL.
- [x] **Step 3: Implement**:

```ts
export async function listPayouts(params?: PaginationParams & { staff?: number; role?: string; status?: string; visit?: number }) {
  const { data } = await apiClient.get(endpoints.payouts.list, { params: toQueryParams(params) });
  return toPaginatedResponse(data, toStaffPayout);
}
export async function listPayoutSummary(params?: { staff?: number; role?: string; startDate?: string; endDate?: string; period?: ReportPeriod }): Promise<StaffPayoutSummary> {
  const { data } = await apiClient.get(endpoints.payouts.summary, { params });
  return toStaffPayoutSummary(data);
}
export async function listCompensationRules() { /* paginated list of StaffCompensationRule */ }
export async function upsertCompensationRule(payload: Partial<StaffCompensationRule> & { role: string }, id?: number) {
  // id ? PUT ruleDetail(id) : POST rules
}
```

- [x] **Step 4: Hooks** — `usePayoutsList`, `usePayoutSummary(params)`, `useCompensationRules`, `useUpsertCompensationRule` (invalidates `queryKeys.payouts.rules`; toast «قانون تسویه ذخیره شد»). Re-export.
- [x] **Step 5: Run** — PASS.
- [x] **Step 6: Commit** `feat(api): staff payouts + compensation rules service/hooks`

---


### Task 8: Packages + service categories + service-items services & hooks

**Files:**
- Create: `src/services/packages.ts`, `src/services/serviceCategories.ts`, `src/services/serviceItems.ts`
- Create: `src/hooks/api/usePackagesQuery.ts`, `useServiceCategoriesQuery.ts`, `useServiceItemsQuery.ts`
- Tests: `src/services/__tests__/packages.test.ts`, `serviceCategories.test.ts`, `serviceItems.test.ts`

- [x] **Step 1: Failing tests** — `toPackage` (nested `items` with string quantities, `services: number[]`); `savePackage` orchestration: create/update package → sync `package-services` (POST missing ids, DELETE removed) → sync `package-items` likewise; category `toCategory`; service-item `toServiceItem`.
- [x] **Step 2: Run** — FAIL.
- [x] **Step 3: Implement** —
  - `packages.ts`: `listPackages`, `getPackage`, `savePackage({ id?, name, description, priceUsd, isActive, serviceIds, items })` performing the orchestrated sync (sequential awaits; on failure throw with first backend error message).
  - `serviceCategories.ts`: `listCategories` (verify pagination; if paginated, follow `next` until exhausted), `createCategory`, `updateCategory`, `deleteCategory` (surfaces 400 "has services" via `extractApiError`).
  - `serviceItems.ts`: `listServiceItems(serviceId)`, `syncServiceItems(serviceId, items: { product: number; quantity: string }[])` (diff existing vs new → POST/PATCH/DELETE each).
- [x] **Step 4: Hooks** with invalidation (`packages.all`, `serviceCategories.all`, `services.all` after item sync since service detail embeds consumables). Re-export.
- [x] **Step 5: Run** — PASS.
- [x] **Step 6: Commit** `feat(api): packages, service categories, service-items services/hooks`

---

### Task 9: Warehouse finance service & hooks (purchases, usages, cost history)

**Files:**
- Create: `src/services/inventoryFinance.ts`
- Create: `src/hooks/api/useInventoryFinanceQuery.ts`
- Test: `src/services/__tests__/inventoryFinance.test.ts`

- [x] **Step 1: Failing tests** — mappers for `ProductPurchase`, `ProductUsage`, `ProductCostHistory`; `buildPurchasePayload({ productId, quantity, unitCostToman, rate, supplier, purchaseDateJalali })` → `{ product, quantity, unit_cost_usd, total_cost_usd, supplier, purchase_date(gregorian) }` with `total = unit × quantity` quantized to 2dp.
- [x] **Step 2: Run** — FAIL.
- [x] **Step 3: Implement** — `listPurchases(params)`, `createPurchase`, `listUsages({ visit?, service? })`, `listCostHistory(productId)`. Hooks with invalidation on `finance.purchases` + `products.all` (purchase updates product cost/count server-side).
- [x] **Step 4: Run** — PASS.
- [x] **Step 5: Commit** `feat(api): product purchases/usages/cost-history service/hooks`

---

### Task 10: Finance reports service & hooks

**Files:**
- Create: `src/services/financeReports.ts`
- Create: `src/hooks/api/useFinanceReportsQuery.ts`
- Test: `src/services/__tests__/financeReports.test.ts`

- [x] **Step 1: Failing test** — `getFinancialSummary({ period: "today" })` hits endpoint with `?period=today`; with `{ startDateJalali, endDateJalali }` sends Gregorian `start_date/end_date` (assert `jalaliToGregorianISO` applied); `getProfitByService` returns array of `ProfitRow`.
- [x] **Step 2: Run** — FAIL.
- [x] **Step 3: Implement** — `getFinancialSummary`, `getProfitByService`, `getProfitByPackage`, `getProfitByStaff`, `getFinanceDashboard`; shared param builder `toReportParams({ period, startDateJalali, endDateJalali, service, package, product, personnel, staff, role })` (period wins; dates only when no period).
- [x] **Step 4: Hooks** — one query hook per report keyed by `queryKeys.finance.*` with params. Re-export.
- [x] **Step 5: Run** — PASS.
- [x] **Step 6: Commit** `feat(api): finance reports service/hooks`

---


## Phase 2 — Feature UI

### Task 11: Patient birthday + file_sys_id

**Files:**
- Modify: `src/types/patient.ts` (add `birthday?: string | null`, `fileSysId?: string | null` to `Patient` and `PatientFormData`)
- Modify: `src/services/customers.ts` (mapper + payload)
- Modify: `src/lib/validations.ts` (optional birthday — no format check; picker guarantees format)
- Modify: `src/components/patients/PatientFormModal.tsx` (JalaliDatePicker + file_sys_id input)
- Modify: `src/routes/Patients.tsx` (detail shows birthday; search covers fileSysId)
- Tests: extend `src/services/__tests__/customers.test.ts`, `src/components/patients/__tests__/PatientFormModal.test.tsx`

- [x] **Step 1: Failing test** — submit form with birthday `1404/06/28` → payload contains `birthday: "1404-06-28"` (via `jalaliToShamsiApiDate`); cleared field → `birthday: null`.
- [x] **Step 2: Run** — FAIL.
- [x] **Step 3: Implement** — wire clearable `JalaliDatePicker` into the modal; optional `file_sys_id` text input; update mapper/payload; optional birthday in zod schema.
- [x] **Step 4: Run** — PASS.
- [x] **Step 5: Commit** `feat(patients): add Shamsi birthday and file_sys_id fields`

---

### Task 12: Services page — categories, USD pricing, compensation role, consumables

**Files:**
- Modify: `src/types/service.ts` — add to `Service`: `priceUsd: string`, `priceToman: string | null`, `exchangeRate: string | null`, `category: ServiceCategory | null`, `compensationRole: CompensationRole`, `products: { product: number; name: string; quantity: string; unitCostUsd: string; totalCostUsd: string }[]`, `estimatedCostUsd: string`, `estimatedCostToman: string | null`, `estimatedGrossProfitUsd: string`, `estimatedGrossProfitToman: string | null`, `estimatedMarginPercent: string`
- Modify: `src/services/services.ts` (mapper + payload: `price_usd`, `category_id`, `compensation_role`)
- Modify: `src/lib/validations.ts` (`serviceFormSchema`: Toman price, optional category, role)
- Modify: `src/routes/Services.tsx` (badges, category filter, detail sections)
- Modify/Create: service form modal (wherever it currently lives — check `src/routes/Services.tsx` first; extract to `src/components/services/ServiceFormModal.tsx` only if it is currently inline) including «مواد مصرفی» rows
- Tests: `src/services/__tests__/services.test.ts` + component test for the modal

- [x] **Step 1: Failing tests** — payload sends `price_usd` converted from Toman input; `category_id` & `compensation_role` included; consumables rows add/remove update local state; save sequence calls service save then `syncServiceItems`.
- [x] **Step 2: Run** — FAIL.
- [x] **Step 3: Implement**:
  - List columns: name, category `Badge`, Toman price (primary) + USD (muted), compensation-role `Badge` (پزشک/فیشال/لیزر/بدون پورسانت), status.
  - Category filter `Select` above the table (from `useServiceCategories`).
  - Form modal: Toman price `Input` (converted via `useCurrentRate` + `tomanToUsd`; disable submit + alert when rate unavailable), category `Select`, compensation-role `Select`, «مواد مصرفی» repeatable rows (product `Select` from products hook + quantity `Input`), zod validation.
  - Detail view: consumables table, estimated cost/gross-profit/margin cards (Toman primary, USD secondary; «—» when null).
- [x] **Step 4: Run** — PASS.
- [x] **Step 5: Commit** `feat(services): categories, USD pricing, compensation role, consumables`

---


### Task 13: Checkout dialog + e2e critical flow

**Files:**
- Create: `src/components/accounting/CheckoutModal.tsx`
- Create: `src/components/accounting/ConsumptionStep.tsx` («ثبت مصرف مواد» — per visit-service rows: product name, prefilled qty from `service.products`, editable `Input`)
- Modify: visit detail / calendar completion UI (add «تسویه و ثبت فروش» button on completed visits without a sale)
- Test: `src/components/accounting/__tests__/CheckoutModal.test.tsx`
- e2e: `e2e/checkout-flow.spec.ts`

- [x] **Step 1: Failing component test**:
  - renders total (Toman) from visit services sum; cash input defaults to total, card to 0;
  - changing cash auto-fills card = total − cash;
  - submit disabled when split ≠ total or rate missing;
  - on submit calls `checkout` with payload from `buildCheckoutPayload` and toasts «فروش ثبت شد».
- [x] **Step 2: Run** — FAIL.
- [x] **Step 3: Implement** `CheckoutModal`:
  - Props: `{ customerId, visitId?, packageId?, defaultTotalToman, consumables?: ConsumptionSelection, onClose }`.
  - Sections: مبلغ کل (Toman, editable in standalone mode), تخفیف (optional), روش پرداخت (نقدی/کارتی split inputs), توضیحات, consumption step (only when `visitId` provided and consumables exist).
  - Submit order: `POST record-consumption` (if consumption edited) → `POST checkout` (payload from Task 5) → invalidate + toast.
  - Idempotency: `crypto.randomUUID()` generated once per modal open; regenerate after a failed attempt.
- [x] **Step 4: Run component tests** — PASS.
- [x] **Step 5: e2e `e2e/checkout-flow.spec.ts`** — mirror `e2e/complete-flow.spec.ts` conventions:
  1. create patient + service, schedule visit, complete visit → toast contains «تسویه پرسنل»;
  2. open checkout from visit, split cash/card, submit → success toast;
  3. navigate to حسابداری → فروش tab → row exists with correct amount + paid badge;
  4. standalone: فروش tab → «فروش جدید» → select package → checkout → appears in list.
- [x] **Step 6: Commits** — `feat(accounting): checkout modal with split payment + consumption step` and `test(e2e): visit→checkout→sale critical flow`

---


### Task 14: Accounting page rebuild — Sales / Payouts tabs (payments removed)

**Files:**
- Modify: `src/routes/Accounting.tsx` (replace content with `Tabs` + two `TabPanel`s)
- Create: `src/components/accounting/SalesTab.tsx`, `PayoutsTab.tsx`, `RefundModal.tsx`
- Delete: `src/components/accounting/AddTransactionModal.tsx`, `src/components/accounting/TransactionDetailModal.tsx` (full payments-module deletion is Task 18)
- Tests: `src/components/accounting/__tests__/SalesTab.test.tsx`, `PayoutsTab.test.tsx`

- [x] **Step 1: Failing tests**:
  - **SalesTab**: paginated sales (Toman primary + USD secondary; status badges پرداخت‌شده/مسترد/جزئی/لغو); «فروش جدید» opens `CheckoutModal` standalone (package select); refund button only when `canManageFinance` (admin) → opens `RefundModal`; employee → no refund button.
  - **PayoutsTab**: summary cards from `usePayoutSummary` (total cash / total product value / count, Toman primary); table with staff/service/role/amount/status; period `Select` (امروز/این هفته/این ماه/ماه قبل/امسال) → sends `period` param.
- [x] **Step 2: Run** — FAIL.
- [x] **Step 3: Implement** the two tabs + page shell. **Payout status note:** backend `StaffPayoutViewSet` is read-only (only `summary`/`detail_report` actions) — there is **no approve/pay endpoint**. Therefore payouts UI is a **reporting view** (list + summary + status badges); approve/pay is deferred to backlog pending backend support. Update access matrix §4.4 accordingly during Task 19.
- [x] **Step 4: Run** — PASS.
- [x] **Step 5: Commit** `feat(accounting): rebuild as finance hub with sales/payouts tabs`

---

### Task 15: Packages tab on Services page

**Files:**
- Create: `src/components/services/PackagesTab.tsx`, `PackageFormModal.tsx`
- Modify: `src/routes/Services.tsx` (add `Tabs`: خدمات / پکیج‌ها)
- Test: `src/components/services/__tests__/PackagesTab.test.tsx`

- [x] **Step 1: Failing test** — package form with name/Toman price + service multi-select + product quantity rows → `savePackage` called with converted `priceUsd`, `serviceIds`, `items`; list renders Toman primary + USD secondary.
- [x] **Step 2: Run** — FAIL.
- [x] **Step 3: Implement** — PackagesTab (paginated table + «پکیج جدید»), PackageFormModal (zod-validated; service multi-select; product rows), delete with confirm dialog.
- [x] **Step 4: Run** — PASS.
- [x] **Step 5: Commit** `feat(services): packages tab with CRUD`

---


### Task 16: Warehouse page — cost, purchases, usages, cost history

**Files:**
- Modify: `src/types/warehouse.ts` (`costUsd: string`), `src/services/products.ts` (mapper/payload; `cost_usd` Toman-input converted)
- Modify: `src/routes/Warehouse.tsx` (tabs: محصولات / خریدها / مصرف)
- Create: `src/components/warehouse/PurchasesTab.tsx`, `UsagesTab.tsx`, `PurchaseFormModal.tsx`, `CostHistoryModal.tsx`
- Tests: `src/components/warehouse/__tests__/PurchasesTab.test.tsx` + extend products service tests

- [x] **Step 1: Failing tests** — product payload includes `cost_usd` (converted from Toman); purchase form computes `total_cost_usd = unit × qty` (2dp); product delete 400 → toast shows backend error («به خدمت متصل است»).
- [x] **Step 2: Run** — FAIL.
- [x] **Step 3: Implement** — product form «هزینه تمام‌شده (تومان)» field; PurchasesTab (list + create modal); UsagesTab (table: product, visit, service, quantity, snapshot costs); product row action «تاریخچه هزینه» → CostHistoryModal (timeline of `cost_usd` effective ranges); delete error via `extractApiError`.
- [x] **Step 4: Run** — PASS.
- [x] **Step 5: Commit** `feat(warehouse): cost_usd, purchases, usages, cost history`

---

### Task 17: Settings tabs + Dashboard redesign + Analytics مالی tab

**Files:**
- Modify: `src/routes/Settings.tsx` (tabs: کاربران / نرخ ارز / قوانین تسویه / دسته‌بندی خدمات — non-users tabs admin-gated via `canManageFinance`; employees see only کاربران)
- Create: `src/components/settings/ExchangeRatesTab.tsx`, `CompensationRulesTab.tsx`, `ServiceCategoriesTab.tsx`
- Modify: `src/routes/Dashboard.tsx` (finance redesign)
- Create: `src/components/dashboard/FinanceKpiCards.tsx`, `ProfitTrendChart.tsx`, `PaymentMethodPie.tsx`, `TopServicesByProfit.tsx`, `ExchangeRateCard.tsx`
- Modify: `src/routes/Analytics.tsx` (add «مالی» tab group)
- Create: `src/components/analytics/FinancialSummaryTab.tsx`, `ProfitBreakdownTab.tsx`
- Tests: one component test per new component (render with mocked hook data)

- [x] **Step 1: Failing tests** — ExchangeRatesTab renders current-rate card + «به‌روزرسانی از منبع پشتیبان» button (calls `getBackupRate`, shows provider) + admin CRUD table; CompensationRulesTab: role select (پزشک/فیشال/لیزر), payout-type/calculation-type selects, conditional fields (percent vs fixed amount), product picker when type ≠ cash; ServiceCategoriesTab: CRUD + delete-400 toast; Dashboard: KPI cards from `useFinanceDashboard({ period: "today" })` (revenue, net profit, payout liability, sale count), charts receive transformed data; FinancialSummaryTab: period select → Gregorian params, cards + payment-method breakdown (cash/card only); ProfitBreakdownTab: tabs خدمت/پکیج/پرسنل with sortable tables + recharts bar charts.
- [x] **Step 2: Run** — FAIL.
- [x] **Step 3: Implement** all components (charts with `recharts`, already a dependency; Toman primary + USD secondary; «—» for nulls).
- [x] **Step 4: Run** — PASS.
- [x] **Step 5: Commits** (split): `feat(settings): finance config tabs`, `feat(dashboard): finance KPIs and charts`, `feat(analytics): financial reports tabs`

---


## Phase 3 — Removal & regression

### Task 18: Remove legacy payments module

**Files:**
- Delete: `src/services/payments.ts`, `src/hooks/api/usePaymentsQuery.ts`, `src/types/accounting.ts` (Transaction types), `src/components/accounting/AddTransactionModal.tsx`, `src/components/accounting/TransactionDetailModal.tsx`, their `__tests__`, `e2e/payment-creation-flow.spec.ts`
- Modify: `src/types/index.ts`, `src/lib/query-keys.ts` (drop `payments`), `src/config/api.ts` (drop payment endpoints), `src/hooks/api/index.ts`, `src/routes/Analytics.tsx` if it uses `usePaymentsByService`, `src/data/walkthroughSteps.ts` if it references payments, `e2e/accounting.spec.ts` (rewrite against Sales tab)

- [x] **Step 1:** Search all references — `payments`, `usePayments`, `Transaction`, `AddTransaction` across `src/` and `e2e/`; list them before editing.
- [x] **Step 2:** Remove/repoint each reference (Analytics payment-based charts → profit-by-service data, or drop).
- [x] **Step 3: e2e regression** — rewrite `e2e/accounting.spec.ts` to exercise the Sales tab; delete `payment-creation-flow.spec.ts`.
- [x] **Step 4: Run full gate** — `pnpm lint && pnpm typecheck && pnpm test:unit && pnpm build` all green.
- [x] **Step 5: Commit** `refactor(accounting): remove legacy payments module (superseded by sales)`

---

### Task 19: Role/access verification pass

- [x] **Step 1: Extend e2e** — new `e2e/finance-roles.spec.ts`: as employee — Settings shows only کاربران tab; SalesTab has no refund button. As admin — all actions visible.
- [x] **Step 2: Verify access matrix** in `docs/backend-sync-gap-analysis.md` §4.4 matches implementation; update doc where backend reality differed (payout approve/pay deferred — no backend endpoint).
- [x] **Step 3: Commit** `test(e2e): role-based finance access verification` + `docs: update access matrix`

---

## Backlog (explicitly deferred)

- Wallet subsystem UI (wallets, reward rules, wallet payment method, wallet-summary report).
- Expense subsystem UI (expenses + expense categories CRUD) — grouped with wallet scope per user decision; report `expenses`/`net_profit` fields will read 0 until this is built.
- Staff payout approve/pay actions (blocked: backend `StaffPayoutViewSet` has no approve/pay endpoints — request backend addition).
- Birthday reminders/dashboard widget.
- v2 API (`/api/v2/`) and `website/` frontend.

---

## Self-review notes

- **Spec coverage:** every decision in §4.2–4.4 of the gap doc maps to a task: currency (T1), checkout/sales (T5, T13), payouts reporting (T7, T14; approve/pay → backlog with reason), packages (T8, T15), services upgrade (T12), warehouse finance (T9, T16), settings tabs (T17), dashboard redesign (T17), analytics مالی (T17), birthday/file_sys_id (T11), payments removal + e2e regression (T13, T18), access verification (T19), testing per feature (each task's steps + §4.5). Expenses cut with wallet scope.
- **Type consistency:** `buildCheckoutPayload`, `ConsumptionSelection`, `StaffPayoutSummary`, `ReportPeriod` used identically across tasks; camelCase field names match interceptor behavior.

