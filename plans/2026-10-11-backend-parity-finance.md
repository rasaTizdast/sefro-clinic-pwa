# Backend-Parity Finance & Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the frontend in line with backend commits `7749d6d7` and `0818f20` (backend `master`, Oct 10 2026) — the revenue-based staff commission rename, sales-ledger report semantics, clinic-share surfacing, server-derived service pricing, and welcome-pack item costs.

**Architecture:** Pure frontend changes (React 19 + TS). Each phase touches a disjoint vertical (types → services → hooks → components → tests) except `src/types/finance.ts`, which is shared by Phases 1, 3 and 5 and therefore must be sequenced across agents (see Parallelization). No backend files are edited (forbidden by AGENTS.md).

**Tech Stack:** React 19, TypeScript ~6.0 (`verbatimModuleSyntax`, `import type` required), TanStack Query v5, Vitest + Testing Library, react-icons, Tailwind v4 design tokens.

---

## Hard constraints (every agent, every task)

- **The `backend/` directory is READ-ONLY.** Never edit, create, rename, or delete any file under `backend/`. Reading it for reference is allowed and encouraged; writing it is forbidden. All changes live under `src/`, `e2e/`, and plan/docs files.
- Frontend-only parity: when backend and frontend disagree, change the **frontend** to match the backend.
- Conventional commits, 50–200 lines per commit, `main` always releasable (Trunk-Based Development).
- Commands: `pnpm typecheck`, `pnpm lint`, `pnpm test:unit`, `pnpm build`.

---

## Status board

| Phase | Topic                                                                  | Status         |
| ----- | ---------------------------------------------------------------------- | -------------- |
| 1     | `percent_profit` → `percent_revenue` rename (BREAKING)                 | ✅ Done       |
| 2     | Invalidate payout cache after checkout/refund                          | ✅ Done       |
| 3     | Finance report parity (clinic share, profit-row fields, revenue basis) | ✅ Done       |
| 4     | Let the backend derive `price_usd` for services                        | ✅ Done       |
| 5     | Welcome-pack per-item cost fields                                      | ✅ Done       |
| 6     | Dashboard KPI: clinic share (optional polish)                          | ✅ Done       |
| 7     | Remove service category from the frontend                              | ✅ Done       |
| 8     | Full verification (typecheck, lint, unit, build)                       | ✅ Done       |

Legend: ⬜ Not started · 🔄 In progress · ✅ Done · ⛔ Blocked

## Parallelization map (for multiple agents)

- **Shared file:** `src/types/finance.ts` is edited by Phases 1, 3 and 5. Run those phases **sequentially** (or in separate worktrees with rebase). Everything else can be parallel:
  - Fully parallel, no shared files: **Phase 2**, **Phase 4**, **Phase 7**.
  - Phase 6 depends on Phase 3 (uses `summary.clinicShare`).
  - Phase 8 runs after everything merges.

## Backend reference (what changed, commit `0818f20` + `7749d6d7`)

| Backend change                                                                                                                                                                                                                     | Frontend gap it creates                                                                                                                                                             |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `StaffCompensationRule.percent_profit` → `percent_revenue`; `CalculationType.PERCENT_PROFIT('percent_profit')` → `PERCENT_REVENUE('percent_revenue')` (migration 0016). Percent payouts now settle against **collected revenue**.  | Frontend still reads/sends `percentProfit` / `"percent_profit"` → the field is silently dropped by DRF and rules save/display as empty. **Breaking.**                               |
| Checkout re-runs `generate_visit_payouts(visit)`; cancelled payouts are never revived.                                                                                                                                             | `useCheckout` does not invalidate `queryKeys.payouts.*` → the payouts tab shows stale amounts after a sale.                                                                         |
| Report views (`/reports/*`) aggregate the **Sale ledger** (net of refunds) via `amount_toman` instead of raw payments.                                                                                                             | Semantic-only; response shapes unchanged. Verify labels/mocks still tell the truth.                                                                                                 |
| `ServiceSerializer.validate` keeps `price`/`price_usd` consistent; USD is authoritative, Toman derived at the server's current rate (errors on inconsistent pairs / missing rate).                                                 | `ServiceFormModal` still sends a **client-computed** `priceUsd` alongside `price` — competing sources that can disagree after a rate change.                                        |
| `WelcomePackItemSerializer` now exposes `unit_cost_usd/toman`, `line_cost_usd/toman`.                                                                                                                                              | `WelcomePackItem` type + `toWelcomePackItem` mapper drop these fields.                                                                                                              |
| `DashboardView` (`/finance/reports/dashboard/`) exposes `clinic_share_usd/toman` in `sales_summary`; `financial_summary` includes `clinic_share: {usd, toman}`.                                                                    | `FinancialSummary` / `FinanceDashboard` types and mappers lack clinic share; dashboard KPI cards don't show it.                                                                     |
| profit-by-service/package/staff rows extended with `operator_compensation_usd`, `welcome_pack_cost_usd`, `recipe_estimate_cost_usd`, `clinic_share_usd`, `revenue_basis`, `welcome_pack_cost_basis: 'allocated_by_revenue_share'`. | `ProfitRow` type + `toProfitRow` drop them; `ProfitBreakdownTab` hardcodes the revenue header as "درآمد بالقوه (قیمت لیست)" even when the backend now labels the row `sale_ledger`. |
| `staff_payout_summary` drops the bogus `count` aggregate (`payout_count` stays).                                                                                                                                                   | None — frontend only uses `payoutCount`. Verified.                                                                                                                                  |

---

### Task 1: Rename `percent_profit` → `percent_revenue` (BREAKING — do first)

**Files:**

- Modify: `src/types/finance.ts:160` and `:217`
- Modify: `src/services/payouts.ts:73`, `:126-139`
- Modify: `src/components/settings/CompensationRulesTab.tsx:33-37`, `:56-80`, `:102-116`, `:134-150`, `:282-291`
- Modify: `src/components/accounting/PayoutsTab.tsx:28-33`
- Test: `src/services/__tests__/payouts.test.ts`, `src/hooks/api/__tests__/usePayoutsQuery.test.tsx`

- [ ] **Step 1: Update the payouts service test fixture and assertions (failing first)**

In `src/services/__tests__/payouts.test.ts` change the `rawRule` fixture (lines 59-72):

```ts
const rawRule = {
  id: 3,
  role: "doctor",
  payoutType: "cash",
  calculationType: "percent_revenue",
  percentRevenue: "30.00",
  fixedAmountUsd: null,
  fixedAmountToman: null,
  transportUsd: "1.00",
  transportToman: "100000",
  product: null,
  productQty: "0.00",
  isActive: true,
};
```

and in the `toCompensationRule` defaults test (lines 143-155):

```ts
expect(rule.calculationType).toBe("percent_revenue");
expect(rule.percentRevenue).toBeNull();
```

- [ ] **Step 2: Update the hooks test fixture (failing first)**

In `src/hooks/api/__tests__/usePayoutsQuery.test.tsx` change the `rule` fixture (lines 65-78):

```ts
const rule: StaffCompensationRule = {
  id: 3,
  role: "doctor",
  payoutType: "cash",
  calculationType: "percent_revenue",
  percentRevenue: "30.00",
  fixedAmountUsd: null,
  fixedAmountToman: null,
  transportUsd: "1.00",
  transportToman: "100000",
  product: null,
  productQty: "0.00",
  isActive: true,
};
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm test:unit src/services/__tests__/payouts.test.ts src/hooks/api/__tests__/usePayoutsQuery.test.tsx`
Expected: FAIL — `percentRevenue` does not exist on `StaffCompensationRule` (type error) and `calculationType` default mismatch.

- [ ] **Step 4: Update the domain types**

In `src/types/finance.ts:160`:

```ts
export type CalculationType = "percent_revenue" | "fixed_per_session" | "monthly_salary";
```

In `src/types/finance.ts` `StaffCompensationRule` (line 217) replace `percentProfit` with:

```ts
/** Percentage of collected service revenue the staff earns (backend `percent_revenue`). */
percentRevenue: string | null;
```

- [ ] **Step 5: Update the payouts service mapper**

In `src/services/payouts.ts` `RawCompensationRule` (line 73) replace `percentProfit?: string | null;` with:

```ts
  percentRevenue?: string | null;
```

In `toCompensationRule` (lines 126-139) replace the two relevant lines:

```ts
  calculationType: raw.calculationType ?? "percent_revenue",
  percentRevenue: raw.percentRevenue ?? null,
```

- [ ] **Step 6: Update CompensationRulesTab**

In `src/components/settings/CompensationRulesTab.tsx` (lines 33-37):

```ts
const calculationTypeOptions = [
  { value: "percent_revenue", label: "درصد درآمد" },
  { value: "fixed_per_session", label: "مبلغ ثابت هر ویزیت" },
  { value: "monthly_salary", label: "حقوق ماهانه" },
];
```

In `RuleForm` (line 60) replace `percentProfit: string;` with `percentRevenue: string;`.
In `emptyForm` (lines 72-73):

````ts
  calculationType: "percent_revenue",
### Task 2: Invalidate payout queries after checkout and refund

Backend checkout now re-runs visit payout settlement, so any open payouts view is stale the moment a sale posts.

**Files:**

- Modify: `src/hooks/api/useSalesQuery.ts:41-77`
- Test: `src/hooks/api/__tests__/useSalesQuery.test.tsx`

- [ ] **Step 1: Extend the checkout test (failing first)**

In `src/hooks/api/__tests__/useSalesQuery.test.tsx`, import `useRefundSale` alongside the other hooks (line 18):

```ts
import { useCheckout, useRefundSale, useSale, useSalesList } from "../useSalesQuery";
````

Update the checkout test title and add the payout assertion (lines 90-105):

```ts
it("useCheckout invalidates sales, finance dashboard, visits and payouts, then toasts success", async () => {
  vi.mocked(salesService.checkout).mockResolvedValue(sale);

  const { wrapper, invalidateQueries } = createWrapper();
  const { result } = renderHook(() => useCheckout(), { wrapper });

  await act(async () => {
    await result.current.mutateAsync(checkoutPayload);
  });

  expect(salesService.checkout).toHaveBeenCalledWith(checkoutPayload);
  expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.sales.all });
  expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["finance", "dashboard"] });
  expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.visits.all });
  // Checkout re-runs visit payout settlement server-side — refresh payout rows.
  expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.payouts.all });
  expect(toast.success).toHaveBeenCalledWith("فروش ثبت شد");
});

it("useRefundSale invalidates payouts so settled amounts refresh", async () => {
  vi.mocked(salesService.refundSale).mockResolvedValue(sale);

  const { wrapper, invalidateQueries } = createWrapper();
  const { result } = renderHook(() => useRefundSale(), { wrapper });

  await act(async () => {
    await result.current.mutateAsync({ id: 12, payload: { reason: "مرجوعی" } });
  });

  expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.payouts.all });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:unit src/hooks/api/__tests__/useSalesQuery.test.tsx`
Expected: FAIL — `invalidateQueries` never called with `["payouts"]`.

- [ ] **Step 3: Implement the invalidation**

In `src/hooks/api/useSalesQuery.ts` `useCheckout.onSuccess` (lines 43-49):

```ts
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sales.all });
      // `finance.dashboard` is a key *factory* — invalidate its prefix so every period matches.
      queryClient.invalidateQueries({ queryKey: ["finance", "dashboard"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.visits.all });
      // Checkout re-runs visit payout settlement server-side, so payout rows changed.
      queryClient.invalidateQueries({ queryKey: queryKeys.payouts.all });
      toast.success("فروش ثبت شد");
    },
```

And in `useRefundSale.onSuccess` (lines 68-73):

````ts
    onSuccess: (_sale, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sales.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.sales.detail(id) });
### Task 3: Finance report parity — clinic share, profit-row fields, revenue-basis labels

**Files:**

- Modify: `src/types/finance.ts` (`FinancialSummary` ~line 395, `ProfitRow` ~424, `FinanceDashboard` ~442)
- Modify: `src/services/financeReports.ts` (`RawFinancialSummary` ~68, `RawProfitRow` ~94, `toFinancialSummary` ~179, `toProfitRow` ~210, `toFinanceDashboard` ~227)
- Modify: `src/components/analytics/ProfitBreakdownTab.tsx:33-50`
- Test: `src/services/__tests__/financeReports.test.ts`, `src/components/analytics/__tests__/ProfitBreakdownTab.test.tsx:98-111`

- [ ] **Step 1: Write the failing mapper tests**

In `src/services/__tests__/financeReports.test.ts`, after the welcome-pack cost tests (around line 116) add:

```ts
  it("keeps the clinic share the backend computed", () => {
    const summary = toFinancialSummary({ clinicShare: { usd: "40.00", toman: "4000000" } });
    expect(summary.clinicShare).toEqual({ usd: "40.00", toman: "4000000" });
  });

  it("defaults a missing clinic share to zero money", () => {
    expect(toFinancialSummary({}).clinicShare).toEqual({ usd: "0.00", toman: "0" });
  });
````

And at the end of the `financeReports service` describe (after the `getProfitByService` test, ~line 256) add:

```ts
it("maps the extended profit-row fields the backend now sends", async () => {
  mock.get.mockResolvedValue({
    data: [
      {
        serviceId: 1,
        serviceName: "فیشال",
        revenueUsd: "50.00",
        productCostUsd: "10.00",
        profitUsd: "40.00",
        count: 2,
        operatorCompensationUsd: "8.00",
        welcomePackCostUsd: "2.00",
        recipeEstimateCostUsd: "1.50",
        clinicShareUsd: "28.50",
        revenueBasis: "sale_ledger",
        welcomePackCostBasis: "allocated_by_revenue_share",
      },
    ],
  });

  const rows = await getProfitByService({ period: "this_month" });

  expect(rows[0].clinicShareUsd).toBe("28.50");
  expect(rows[0].revenueBasis).toBe("sale_ledger");
  expect(rows[0].welcomePackCostBasis).toBe("allocated_by_revenue_share");
  expect(rows[0].operatorCompensationUsd).toBe("8.00");
  expect(rows[0].welcomePackCostUsd).toBe("2.00");
  expect(rows[0].recipeEstimateCostUsd).toBe("1.50");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:unit src/services/__tests__/financeReports.test.ts`
Expected: FAIL — `clinicShare` is not on `FinancialSummary`; new profit-row fields are dropped by `toProfitRow`.

- [ ] **Step 3: Extend the domain types**

In `src/types/finance.ts` `FinancialSummary`, after `netProfit: Money;` (line 395) add:

```ts
/** Revenue − product cost − welcome-pack cost − staff compensation (backend `clinic_share`). */
clinicShare: Money;
```

Replace `ProfitRow` (lines 424-440) with:

```ts
export interface ProfitRow {
  serviceId?: number;
  packageId?: number;
  staffId?: number;
  serviceName?: string;
  packageName?: string;
  staffName?: string;
  revenueUsd: string;
  productCostUsd: string;
  count?: number;
  visitCount?: number;
  profitUsd: string;
  profitMarginPercent?: string;
  revenueToman?: string;
  productCostToman?: string;
  profitToman?: string;
  /** How the backend sourced revenue for this row: collected ledger money vs potential list price. */
  revenueBasis?: "sale_ledger" | "list_price";
  operatorCompensationUsd?: string;
  welcomePackCostUsd?: string;
  recipeEstimateCostUsd?: string;
  clinicShareUsd?: string;
  /** Welcome-pack cost attribution, e.g. `allocated_by_revenue_share`. */
  welcomePackCostBasis?: string;
}
```

In `FinanceDashboard.salesSummary` (after `avgTicketUsd` line 456) add:

```ts
clinicShareUsd: string;
clinicShareToman: string;
```

- [ ] **Step 4: Extend the financeReports mappers**

In `src/services/financeReports.ts` `RawFinancialSummary` (after `netProfit` line 68) add:

```ts
  clinicShare?: { usd: string; toman: string };
```

- [ ] **Step 6: Make the ProfitBreakdownTab revenue label honest per row (failing first)**

In `src/components/analytics/__tests__/ProfitBreakdownTab.test.tsx`, replace the list-price header test (lines 98-106) with:

```ts
  it("labels the revenue column neutrally and tags list-price rows as potential", () => {
    // Default rows (no basis sent) are conservative: potential revenue.
    render(<ProfitBreakdownTab />);
    expect(screen.getByRole("columnheader", { name: "درآمد" })).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "درآمد بالقوه (قیمت لیست)" })).not.toBeInTheDocument();
  });

  it("tags sale-ledger rows as collected money", () => {
    state.serviceRows = [
      {
        serviceId: 1,
        serviceName: "فیشال",
        revenueUsd: "50.00",
        productCostUsd: "10.00",
        profitUsd: "40.00",
        count: 1,
        revenueBasis: "sale_ledger",
      },
    ];

    render(<ProfitBreakdownTab />);

    expect(screen.getByText("دفتر فروش")).toBeInTheDocument();
    expect(screen.queryByText("قیمت لیست")).not.toBeInTheDocument();
  });

  it("tags list-price rows as potential revenue", () => {
    state.serviceRows = [
      {
        serviceId: 1,
        serviceName: "فیشال",
        revenueUsd: "50.00",
        productCostUsd: "10.00",
        profitUsd: "40.00",
        count: 1,
        revenueBasis: "list_price",
      },
    ];

    render(<ProfitBreakdownTab />);

    expect(screen.getByText("قیمت لیست")).toBeInTheDocument();
  });
```

- [ ] **Step 7: Run the component test to verify it fails**

Run: `pnpm test:unit src/components/analytics/__tests__/ProfitBreakdownTab.test.tsx`
Expected: FAIL — header is still "درآمد بالقوه (قیمت لیست)" and no basis tags render.

- [ ] **Step 8: Implement the revenue column changes**

In `src/components/analytics/ProfitBreakdownTab.tsx` `profitColumns`, replace the `revenueUsd` column (lines 33-50) with:

````ts
    {
      key: "revenueUsd",
      // The backend tags every row with `revenue_basis`: `sale_ledger` rows are
      // collected money, everything else is list-price potential revenue that
      // ignores discounts, packages and partial payments. The row tag keeps the
      // distinction visible even inside a mixed table.
      header: "درآمد",
      align: "center",
      render: (row) => (
        <span className="text-surface-700 text-sm">
          ${Number(row.revenueUsd).toFixed(2)}
          {row.revenueToman && (
            <span className="text-surface-400 mr-1 text-xs">
              ({formatPrice(Number(row.revenueToman))})
            </span>
          )}
          <span
            className={
              row.revenueBasis === "sale_ledger"
                ? "text-info-600 mr-1 text-xs"
### Task 4: Stop sending a client-computed `price_usd` from the service form

The backend now derives `price_usd` from the Toman price at the server's current rate (and validates inconsistent pairs). Sending a client-computed USD value only competes with that. The service mapper keeps its optional passthrough for callers that truly know the USD value; the modal stops sending one.

**Files:**

- Modify: `src/components/services/ServiceFormModal.tsx:122-166`
- Modify: `src/services/services.ts:92-93` (comment only)
- Test: `src/components/services/__tests__/ServiceFormModal.test.tsx:40-68`

- [ ] **Step 1: Update the modal test (failing first)**

In `src/components/services/__tests__/ServiceFormModal.test.tsx`, replace the first test's title and assertion (lines 40, 60-67):

```ts
  it("saves the Toman price and lets the backend derive price_usd", async () => {
````

```ts
expect(createMutateAsync).toHaveBeenCalledWith(
  expect.objectContaining({
    title: "لیزر مو",
    price: 5000000,
    categoryId: 3,
    compensationRole: "facial",
  })
);
// price_usd is the backend's job now — the form must not send a client rate conversion.
expect(createMutateAsync.mock.calls[0][0].priceUsd).toBeUndefined();
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:unit src/components/services/__tests__/ServiceFormModal.test.tsx`
Expected: FAIL — payload still contains `priceUsd: "50.00"`.

- [ ] **Step 3: Remove `priceUsd` from the modal payload**

In `src/components/services/ServiceFormModal.tsx` `handleSave`, replace the payload construction (lines 141-151). Keep the existing rate guard above it (`const priceUsd = tomanToUsd(...)` + null check) because the on-screen USD preview still needs the local rate:

```ts
    try {
      const payload: Record<string, unknown> = {
        title: parsed.data.title,
        duration: parsed.data.duration,
        price: parsed.data.priceToman,
        // No priceUsd: the backend derives the USD value from this Toman price at
        // its current rate (ServiceSerializer.validate), so the pair can never
        // disagree after an exchange-rate change.
        categoryId: categoryId ? Number(categoryId) : null,
        compensationRole: role,
        description: description.trim(),
        isActive,
      };
```

(The `priceUsd === null` guard above stays as-is — saving with no rate would be rejected by the backend anyway, and the preview block below still uses `priceUsdPreview`.)

- [ ] **Step 4: Update the mapper comment**

In `src/services/services.ts` (lines 92-93) replace the comment:

```ts
  // Only sent when a caller explicitly knows the USD value; the service form
  // sends the Toman price alone and the backend derives price_usd at its
  // current rate.
  price_usd: data.priceUsd ?? null,
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test:unit src/components/services/__tests__/ServiceFormModal.test.tsx src/services/__tests__/services.test.ts`
Expected: PASS (the service-mapper tests still pass through `priceUsd` when provided).

- [ ] **Step 6: Commit**

```bash
git add src/components/services/ServiceFormModal.tsx src/services/services.ts src/components/services/__tests__/ServiceFormModal.test.tsx
git commit -m "fix(services): let the backend derive price_usd from the Toman price"
```

**Status:** ✅ Done

---

                : "text-surface-400 mr-1 text-xs"

### Task 5: Map welcome-pack per-item cost fields

**Files:**

- Modify: `src/types/finance.ts:466-474` (`WelcomePackItem`)
- Modify: `src/services/welcomePacks.ts:17-25`, `:59-67`
- Test: `src/services/__tests__/welcomePacks.test.ts`

- [ ] **Step 1: Extend the mapper test (failing first)**

In `src/services/__tests__/welcomePacks.test.ts`, in the "lists packs and maps items" test (line 56) add:

```ts
expect(res.data[0].items[0].unitCostUsd).toBeNull();
```

And add a new test right after it:

```ts
it("maps the per-item cost the serializer now exposes", async () => {
  mock.get.mockResolvedValue({
    data: {
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          ...rawPack,
          items: [
            {
              ...rawPack.items[0],
              unitCostUsd: "2.50",
              unitCostToman: "250000",
              lineCostUsd: "5.00",
              lineCostToman: "500000",
            },
          ],
        },
      ],
    },
  });

  const res = await listWelcomePacks();

  expect(res.data[0].items[0].unitCostUsd).toBe("2.50");
  expect(res.data[0].items[0].unitCostToman).toBe("250000");
  expect(res.data[0].items[0].lineCostUsd).toBe("5.00");
  expect(res.data[0].items[0].lineCostToman).toBe("500000");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:unit src/services/__tests__/welcomePacks.test.ts`
Expected: FAIL — `unitCostUsd` is not on `WelcomePackItem`.

- [ ] **Step 3: Extend the type**

In `src/types/finance.ts` `WelcomePackItem` (lines 466-474) add after `quantity`:

```ts
/** Current catalog cost of one unit, computed by the serializer; null when unknown. */
unitCostUsd: string | null;
unitCostToman: string | null;
/** unitCost × quantity. */
lineCostUsd: string | null;
lineCostToman: string | null;
```

- [ ] **Step 4: Extend the mapper**

In `src/services/welcomePacks.ts` `RawWelcomePackItem` (after `quantity` line 22) add:

```ts
  unitCostUsd?: string | null;
  unitCostToman?: string | null;
  lineCostUsd?: string | null;
  lineCostToman?: string | null;
```

In `toWelcomePackItem` (lines 59-67) add after `quantity`:

````ts
  unitCostUsd: raw.unitCostUsd ?? null,
  unitCostToman: raw.unitCostToman ?? null,
  lineCostUsd: raw.lineCostUsd ?? null,
### Task 6: Dashboard KPI — clinic share (optional polish; depends on Task 3)

**Files:**

- Modify: `src/components/dashboard/FinanceKpiCards.tsx:1-104`

- [ ] **Step 1: Add the fifth KPI card and widen the grid**

In `src/components/dashboard/FinanceKpiCards.tsx`, add the icon import (line 2):

```ts
import { MdAttachMoney, MdBusinessCenter, MdInventory, MdShoppingCart } from "react-icons/md";
````

Update the loading skeleton grid and count (lines 33-34) to `xl:grid-cols-5` and `Array.from({ length: 5 })`.
Update the results grid (line 87) to:

```tsx
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
```

Append the new KPI after "هزینه محصول امروز" in the `kpis` array (after line 83):

```ts
    {
      title: "سهم کلینیک امروز",
      value: `${formatPrice(Number(summary.clinicShare.toman))} تومان`,
      sub: trimUsdZeros(summary.clinicShare.usd),
      icon: <MdBusinessCenter className="size-5" />,
      variant: "success" as const,
    },
```

(`clinicShare` is required on `FinancialSummary` from Task 3 and defaults to zero money, so the card is always safe to render. If `MdBusinessCenter` is missing in the installed react-icons version, fall back to `MdStore`.)

- [ ] **Step 2: Verify**

Run: `pnpm typecheck && pnpm test:unit src/components/dashboard`
Expected: PASS. Confirm via `pnpm dev` that five KPI cards render on `/`.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/FinanceKpiCards.tsx
git commit -m "feat(dashboard): surface clinic share in the finance KPI cards"
```

**Status:** ✅ Done

---

### Task 7: Remove service category from the frontend

The product decision: service categories are dropped from the UI entirely. Remove the feature **frontend-only** — the backend `/service-categories/` endpoint stays untouched (read-only backend). Sweep every page: Settings, Services list, service form/detail modals, wizard, e2e mocks.

**Files:**

- Delete: `src/components/settings/ServiceCategoriesTab.tsx`
- Delete: `src/services/serviceCategories.ts` + `src/services/__tests__/serviceCategories.test.ts`
- Delete: `src/hooks/api/useServiceCategoriesQuery.ts` + `src/hooks/api/__tests__/useServiceCategoriesQuery.test.tsx`
- Modify: `src/routes/Settings.tsx:5,24-27,42,60-62,~212-214`
- Modify: `src/routes/Services.tsx:99-113`
- Modify: `src/components/services/ServiceFormModal.tsx` (state ~51-53, imports ~6-11, hook ~62, `categoryOptions` ~79-85, Select ~228-233, payload ~142-151)
- Modify: `src/components/services/ServiceDetailModal.tsx:143-152`
- Modify: `src/services/services.ts` (import ~5, `RawService.category` ~36, `toCategory` ~48-58, `toService.category` ~78, payload `category_id` ~94)
- Modify: `src/lib/validations.ts:46`
- Modify: `src/types/finance.ts` (`ServiceCategory` interface ~282-289)
- Modify: `src/types/service.ts` (`category` field + import)
- Modify: `src/types/index.ts` (re-export of `ServiceCategory`, if present)
- Modify: `src/hooks/api/index.ts:98-101`
- Modify: `src/lib/query-keys.ts:71-74`
- Modify: `src/config/api.ts:78-81`
- Modify: `src/services/__tests__/services.test.ts:56-88`
- Modify: `src/components/services/__tests__/ServiceFormModal.test.tsx:16-18,52-56,60-67`
- Modify: `e2e/helpers.ts:78`, `e2e/finance-roles.spec.ts:57,106`
- Check: `src/data/walkthroughSteps.ts` (grep «دسته‌بندی» — remove any step text that references service categories)

- [ ] **Step 1: Update the affected tests first (failing/deleting first)**

In `src/services/__tests__/services.test.ts` remove `category_id: null,` from the exact-payload expectation (line ~63) and `category_id: 3,` from the `objectContaining` (line ~84).

In `src/components/services/__tests__/ServiceFormModal.test.tsx` remove the `useServiceCategories` mock (lines 16-18), remove `categoryId: 3,` from the assertion (line 64), and replace the two-combobox interaction (lines 52-56) with the role select only:

```ts
const selects = screen.getAllByRole("combobox");
await user.click(selects[0]);
await user.click(await screen.findByText("فیشال", undefined, { timeout: 5000 }));
```

- [ ] **Step 2: Run tests to verify they fail (category code still present)**

Run: `pnpm test:unit src/services/__tests__/services.test.ts src/components/services/__tests__/ServiceFormModal.test.tsx`
Expected: FAIL — payload still contains `category_id` / `categoryId`.

- [ ] **Step 3: Delete the category feature files**

```bash
git rm src/components/settings/ServiceCategoriesTab.tsx src/services/serviceCategories.ts src/services/__tests__/serviceCategories.test.ts src/hooks/api/useServiceCategoriesQuery.ts src/hooks/api/__tests__/useServiceCategoriesQuery.test.tsx
```

- [ ] **Step 4: Remove category from Settings**

In `src/routes/Settings.tsx`:

- Remove the `ServiceCategoriesTab` import (line 5).
- Replace `settingsTabs` (lines 24-27) with a single users tab:

```ts
const settingsTabs = [{ id: "users", label: "کاربران" }];
```

- Drop `canManageFinance` from the `usePermissions()` destructure (line 42) and the `visibleTabs` filter (lines 60-62) — only the users tab remains; render `settingsTabs` directly.
- Remove the `service-categories` `TabPanel` (lines ~210-214) including `<ServiceCategoriesTab />`; keep the users `TabPanel`.

- [ ] **Step 5: Remove category from the services pages and modals**

In `src/components/services/ServiceFormModal.tsx`: remove the `useServiceCategories` import + hook call (line ~62), the `categoryId` state (lines 51-53, including the `service?.category` initializer), the `categoryOptions` memo (lines 79-85), the «دسته‌بندی» `<Select>` (lines ~228-233), and `categoryId` from the zod parse input + save payload (line ~147).

In `src/lib/validations.ts` remove `categoryId: z.string().optional(),` (line 46) from `serviceFormSchema`.

In `src/routes/Services.tsx` remove the `category` column (lines 101-113); drop the `Badge` import if it becomes unused.

In `src/components/services/ServiceDetailModal.tsx` remove the category `Badge` block (lines 143-152); keep the duration / role / active badges.

- [ ] **Step 6: Remove category from services, types, hooks, keys, config**

In `src/services/services.ts`: remove the `ServiceCategory` import (line 5), `category` from `RawService` (line 36), the `toCategory` helper (lines 48-58), `category: toCategory(raw.category),` in `toService` (line 78), and `category_id: data.categoryId ?? null,` from `toBackendPayload` (line 94).

In `src/types/service.ts` remove the `category` field and its `ServiceCategory` import. In `src/types/finance.ts` delete the `ServiceCategory` interface (lines 282-289). In `src/types/index.ts` remove any `ServiceCategory` re-export.

In `src/hooks/api/index.ts` remove the three category-hook exports (lines 98-101). In `src/lib/query-keys.ts` remove the `serviceCategories` block (lines 71-74). In `src/config/api.ts` remove the `serviceCategories` block (lines 78-81).

- [ ] **Step 7: Remove e2e mocks and assertions**

In `e2e/helpers.ts` remove line 78 (`**/api/service-categories/**` mock). In `e2e/finance-roles.spec.ts` remove line 57 (same mock) and line 106 (`tab دسته‌بندی خدمات` assertion). Grep `src/data/walkthroughSteps.ts` for «دسته‌بندی» and remove any step text about _service_ categories (expense-category text is a different feature — keep it).

- [ ] **Step 8: Sweep and verify**

Run: `rg -i "service.?categor|ServiceCategor" src e2e`
Expected: no matches (expense / operating-expense categories are a different feature and must stay).

Run: `pnpm typecheck && pnpm lint && pnpm test:unit`
Expected: all PASS.

- [ ] **Step 9: Commit**

```bash
git add -A src e2e
git commit -m "refactor(services): remove service category from the frontend"
```

**Status:** ✅ Done

---

### Task 8: Full verification

- [ ] **Step 1: Sweep for leftovers**

Run: `rg "percentProfit|percent_profit|درصد سود" src e2e`
Expected: no matches.

- [ ] **Step 2: Run all gates (CI parity)**

Run: `pnpm lint && pnpm typecheck && pnpm test:unit && pnpm build`
Expected: all PASS (matches `.github/workflows/ci.yml` fast-checks job).

- [ ] **Step 3: Optional live smoke**

Run: `pnpm dev` and check: Settings → قوانین تسویه (percent label + save), Analytics → گزارش سود (revenue tags), Accounting → تسویه پرسنل (refresh after a checkout), Dashboard (clinic-share card).

- [ ] **Step 4: Mark the status board complete**

Update the status table at the top of this file to ✅ for every phase and commit:

```bash
git add plans/2026-10-11-backend-parity-finance.md
git commit -m "docs: mark backend-parity plan phases complete"
```

**Status:** ✅ Done
