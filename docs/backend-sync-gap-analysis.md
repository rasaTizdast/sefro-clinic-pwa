# Backend Sync Gap Analysis — Frontend Catch-Up Plan Input

> Generated: 2026-09-20. Backend range analyzed: `1057707..2bc53f1` (10 commits, ~130 files, +16.2k/−0.5k LOC).
> Scope: v1 API only (`/api/`, `/api/finance/`). **v2 API (`/api/v2/`) and `website/` folders are OUT of scope.**

---

## 1. Backend changes since `1057707` (10 commits)

| Commit | Change |
|---|---|
| `23e852c` | **New `finance` domain** (entire app) + CI coverage |
| `a37586c` | **Service categories**, **product–service pricing** (ServiceItem consumables) |
| `c74c6de` / `a34202a` | **BrsApi.ir backup exchange-rate provider** + parsing fix |
| `af35eaf` | **Customer birthday (Shamsi)** + `file_sys_id`, `reports/exchange-dollar/`, `reports/backup-exchange/` |
| `3df9ea9` | **Staff compensation system** + profit/revenue/dashboard reporting |
| `6d2e90f`, `8e3686f`, `2bc53f1`, `4de6c14` | Tests, CI, security hardening |

### 1.1 New/changed fields on existing v1 resources

**Service** (`/api/services/`):
- `price_usd` (Decimal, writable, **authoritative price**; legacy `price` = Toman display only)
- `price_toman` (read-only computed = `price_usd × current rate`, may be `null`)
- `exchange_rate` (read-only, current rate snapshot)
- `category` (nested read-only) / `category_id` (write-only FK → ServiceCategory)
- `compensation_role` (`none` | `doctor` | `facial` | `laser`, default `none`)
- `products` (read-only consumables: `{product, name, quantity, unit_cost_usd, total_cost_usd}`)
- `estimated_cost_usd/toman`, `estimated_gross_profit_usd/toman`, `estimated_margin_percent` (read-only)

**ServiceCategory** (NEW, `/api/service-categories/`): `id, name, slug, description, is_active, sort_order`. DELETE → 400 if category has services.

**Customer** (`/api/customers/`):
- `birthday` — **Shamsi `YYYY-MM-DD` string** in/out (e.g. `"1370-05-12"`), optional/null
- `file_sys_id` — CharField(40), unique, searchable

**Product** (`/api/inventory/products/`):
- `cost_usd` field; cost history tracked; delete may now fail with 400 when linked to a service (ServiceItem)

**Visit completion** (`POST /api/visits/{id}/complete/`):
- Now auto-generates `StaffPayout` records (idempotent) based on each service's `compensation_role` + active `StaffCompensationRule`; may record commission `ProductUsage` and decrement stock. Response unchanged (serialized Visit).

### 1.2 New `finance` app — all under `/api/finance/`

**Router CRUD (16 viewsets, paginated `{count,next,previous,results}`, page size 20):**

| Path | Purpose | Write perm |
|---|---|---|
| `exchange-rates/` | USD→Toman rates | Admin write |
| `reward-rules/` | Wallet reward rules | Admin write |
| `packages/` | Sellable packages (+ items/services) | Admin write |
| `service-items/` | Consumable products per service | Admin write |
| `package-items/` | Products in a package | Admin write |
| `package-services/` | Services in a package | Admin write |
| `product-cost-history/` | Cost snapshots (read-only) | Any auth |
| `product-usages/` | Consumption/commission snapshots | Any auth |
| `wallets/` | Customer wallets (balance) | Any auth read |
| `wallet-transactions/` | Immutable ledger (read-only) | Any auth |
| `sales/` | Sales records | Any auth |
| `expense-categories/` | Expense categories | Admin write |
| `expenses/` | Expenses + approval workflow | Mixed |
| `product-purchases/` | Record purchases (updates cost history) | Any auth |
### 1.3 Conventions the frontend must respect
- All money serialized as **strings**; USD authoritative; Toman via rate snapshot.
- Report date params are **Gregorian `YYYY-MM-DD`** (unlike customers app Shamsi dates); `period` shortcut available.
- JWT access token now **15 min**, cookie-only by default (frontend already cookie-based ✓).
- Report endpoints are **unpaginated**; all viewsets paginated (page 20).
- Expense self-approval forbidden; wallet ledger append-only; checkout idempotent.

---

## 2. Frontend current state (root `src/` dashboard)

- **Stack:** Vite 8 + React 19 + TS, react-router v7, `@tanstack/react-query`, axios (`withCredentials`, CSRF header, snake⇄camel interceptors), Tailwind v4, zod/v4, jalaali-js, recharts, custom UI kit (`Table, Modal, Card, Tabs, Select, Input, JalaliDatePicker, Pagination, Toast…`).
- **Sections:** داشبورد `/`, مراجعین `/patients`, حسابداری `/accounting` (payments only), تقویم `/calendar`, خدمات `/services`, گزارش‌ها `/analytics`, انبار `/warehouse`, تنظیمات `/settings`, لاگ `/logs` (admin).
- **Patterns per module:** `src/types/<domain>.ts` → `endpoints.<domain>` in `src/config/api.ts` → `queryKeys.<domain>` → `src/services/<domain>.ts` (Raw type + mapper + payload) → `src/hooks/api/use<Domain>Query.ts` (invalidate on `<domain>.all` + Persian toasts) → page in `src/routes/`.
- **Gaps — zero coverage today:** wallets, expenses, sales/checkout, packages, exchange rates, staff compensation/payouts, service categories, service USD pricing, product–service links/consumption, customer birthday, all finance reports.

---

## 3. Gap matrix → candidate frontend work items

| Backend capability | Candidate frontend home | Effort |
|---|---|---|
| Service categories CRUD + filter | Services page (tabs/filter) or Settings | S |
| Service `price_usd`, `compensation_role`, consumables (`service-items`), est. cost/profit display | Services page form/detail | M |
| Customer `birthday` (Shamsi), `file_sys_id` | Patient form + detail/list columns | S |
| Product `cost_usd`, cost history, service-link delete error | Warehouse product form/detail | S |
| Product purchases (`product-purchases/`) | Warehouse (new tab/action) | M |
| Record consumption on visit | Calendar/visit completion flow | M |
| Exchange rates CRUD + current/backup rate display | Settings or Finance | S |
| Wallets: balance, ledger, manual adjust, charge | Patient detail (wallet tab) | M |
| Reward rules CRUD | Settings (admin) | S |
| Packages CRUD (items + services) | New section or Services | M |
| Checkout (split payment, wallet, idempotent) | Visit flow / new sale dialog | L |
| Sales list + refunds | Accounting (new tab) | M |
| ~~Expenses + categories + approval workflow~~ | **CUT** with wallet scope (decision §4.1) | — |
| Staff compensation rules | Settings (admin) | S |
| Staff payouts list/approve/pay + summary | New Personnel/Finance section | M |
| Finance reports (financial-summary, profit-by-*, wallet-summary, dashboard) | Analytics (new tabs) + Dashboard cards | M |
| Exchange-dollar/backup-exchange widgets | Dashboard or Accounting header | S |

---

## 4. Decisions (grilling session, 2026-09-20)

### 4.1 Scope cuts
- **Wallet subsystem: REMOVED entirely** — no wallet UI, no wallet payment method in checkout, no reward rules, no wallet-summary report, no wallet card in patient profile. (`/api/finance/wallets/`, `wallet-transactions/`, `reward-rules/`, `reports/wallet-summary/`, `wallets/{id}/adjust/` all out of scope this iteration.)
- **Expense subsystem: REMOVED entirely** — per user decision, expenses are grouped with the wallet scope. No expense CRUD UI, no expense categories in Settings. Note: backend reports (`financial-summary`, `dashboard`) still aggregate expenses — those fields will read 0 until the expense UI is built in a future iteration. Nothing else in scope depends on expense CRUD (verified against backend: expenses are not coupled to wallets technically, but the user grouped them).
- **v2 API and `website/` folders: out of scope** (as before).

### 4.2 Information architecture
- **حسابداری (`/accounting`) becomes the finance hub** with tabs:
  1. **فروش (Sales)** — new home of all money-in; includes standalone checkout (e.g. package sale).
  2. **تسویه پرسنل (Staff Payouts)** — payout list + summary.
- **Legacy payments: REMOVED from the UI.** `Payment` is superseded by `Sale`. The payments tab, `AddTransactionModal`, `TransactionDetailModal` are deleted; all new transactions go through checkout → Sales. The e2e flow (visit → complete → checkout → sale) must be verified with no orphaned payment references.
- **Packages**: tab on `/services`, CRUD with nested service/product pickers; sold via standalone checkout from Sales tab.
- **Settings** gains admin-gated tabs: نرخ ارز (exchange rates + current rate card + backup refresh), قوانین تسویه پرسنل (compensation rules per role), دسته‌بندی خدمات (service categories). ~~قوانین پاداش کیف‌پول~~ (cut with wallet). ~~دسته‌بندی هزینه~~ (cut with expenses).
- **Dashboard (`/`)**: full finance redesign — recharts profit trend, payment-method breakdown (cash/card), top services by profit, KPI strip (today's revenue, net profit, payout liability), current USD rate card with backup-refresh.
- **Analytics (`/analytics`)**: new «مالی» tab group — سود و زیان (financial-summary, period picker + filters), سود به تفکیک خدمت/پکیج/پرسنل (tables + bar charts). ~~خلاصه کیف‌پول~~ (cut). Existing reports untouched.

### 4.3 Feature behavior decisions
- **Currency**: Toman primary display (large), USD secondary (muted). Money forms input **Toman**; frontend converts to USD via current rate before submit (`price_usd`, `cost_usd`, expense amounts).
- **Checkout**: launched from a visit (Calendar/visit detail) after completion; also standalone from Sales tab (package sales). Split payment across **cash/card only** (wallet cut). Client-generated `idempotency_key` (UUID) per attempt. Checkout dialog includes «ثبت مصرف مواد» step — prefilled from service-items, editable, calls `record-consumption`.
- **Visit completion**: stays one-click; success toast mentions generated payouts («تسویه پرسنل ثبت شد»).
- ~~**Expenses**~~ — **cut with wallet scope** (was: simplified create, admin-only delete). Removed from this iteration entirely.
- **Staff payouts**: tab under /accounting; approve/pay **admin-only**; date-range filter + summary cards from `reports/staff-payout-summary/`. Compensation rules in Settings (admin).
- **Services**: form inputs Toman → `price_usd`; list shows Toman primary + USD secondary + category badge + compensation-role badge + category filter. Modal contains «مواد مصرفی» (product picker + quantity rows → `service-items/`); detail shows consumables + estimated cost/profit/margin.
- **Warehouse**: `cost_usd` on product form (Toman input); «خریدها» tab (product-purchases); per-product cost history; «مصرف» tab (product-usages); delete-400 handled with explanatory toast.
- **Patient**: birthday via `JalaliDatePicker` (optional, clearable) → Shamsi `YYYY-MM-DD`; shown on detail; no reminders this iteration. `file_sys_id` searchable.

### 4.4 Access matrix (admin vs employee)

| Feature | Employee | Admin |
|---|---|---|
| Sales list + checkout (from visit / standalone) | ✅ full | ✅ full |
| Sale refund | ❌ | ✅ |
| Staff payouts — view list | ✅ | ✅ |
| Staff payouts — approve/pay | ❌ (deferred: no backend endpoint) | ❌ (deferred: no backend endpoint) |
| Compensation rules (Settings) | hidden | ✅ CRUD |
| Exchange rates (Settings) | hidden (sees current rate on Dashboard only) | ✅ CRUD + backup refresh |
| Service categories (Settings) | hidden | ✅ CRUD |
| Services — create/edit (price, category, compensation_role, consumables) | ✅ | ✅ |
| Packages — CRUD | ✅ | ✅ |
| Warehouse — products, purchases, usages, cost history | ✅ | ✅ |
| Dashboard finance widgets + Analytics مالی tab | ✅ | ✅ |

### 4.5 Testing plan (per feature)

Every new module follows the existing test layout: service/hook unit tests in `__tests__`, page-level component tests, and Playwright e2e for critical flows.

| Feature | Unit (Vitest + Testing Library) | E2E (Playwright) |
|---|---|---|
| API layer per module | `toX` mappers (string decimals, nulls), `toBackendPayload` (Toman→USD conversion, snake_case), error extraction | — |
| Currency conversion | Toman→USD rounding helper, null-rate fallback | — |
| Exchange rates | service mapper + hooks (invalidate on `.all`) | — |
| Sales + checkout | checkout payload builder (split cash/card sums = total, `idempotency_key` present), sale mapper, sales hooks | **E2E critical**: visit → complete → checkout (cash+card split) → appears in Sales list; standalone package checkout |
| Staff payouts | mapper, summary cards render | E2E: complete visit → payout appears |
| Service categories | CRUD hooks, delete-400 error toast when category has services | — |
| Services (price_usd/category/role/consumables) | form conversion, category filter, consumables rows add/remove, service-items save sequencing | E2E: create service with category + consumables → badges + estimated margin |
| Packages | nested picker state, package-items/package-services save sequencing | — |
| Warehouse (cost/purchases/usages/history) | cost mapper, purchase form, delete-400 toast | — |
| Patient birthday | JalaliDatePicker → Shamsi `YYYY-MM-DD` payload, null/clear handling | — |
| Dashboard redesign | KPI cards with mock finance/dashboard data, chart transforms | — |
| Analytics مالی tabs | period picker → Gregorian params, report table renders | — |
| Payments removal | — | **E2E regression**: no payment UI reachable; visit→sale flow has no payment references |
| Finance role-based access | — | **E2E**: employee sees only کاربران tab in Settings, no refund button; admin sees all tabs + refund |

CI gate per commit (TBD): `pnpm lint && pnpm typecheck && pnpm test:unit && pnpm build` stays green.

| Patient birthday / file_sys_id | ✅ | ✅ |

> Backend permission for most finance endpoints is `IsEmployeeOrAdmin` (any authenticated); admin-only restrictions above are enforced by UI gating (`usePermissions`) plus backend where it exists (`IsAdminOrReadOnly` on exchange-rates/categories viewsets; expense delete restricted to admin).


| `staff-compensation-rules/` | Per-role payout rules | Admin write |
| `staff-payouts/` | Generated payouts + workflow | Mixed |

**Custom paths (10):**

| Method | Path | Purpose |
|---|---|---|
| POST | `checkout/` | Idempotent sale, split payments (cash/card/wallet), rewards, `idempotency_key` |
| POST | `visits/{id}/record-consumption/` | Record ProductUsage from a visit |
| POST | `wallets/{id}/adjust/` | Admin manual credit/debit/adjustment |
| POST | `expenses/{id}/submit|approve|reject|pay|cancel/` | Expense lifecycle (self-approval forbidden) |
| GET | `reports/financial-summary/` | P&L; params `start_date/end_date` (Gregorian) or `period=today|this_week|this_month|prev_month|this_year`; filters `service, package, product, personnel` |
| GET | `reports/profit-by-service/` | `[{service_id, service_name, revenue_usd, product_cost_usd, count, profit_usd, profit_margin_percent}]` |
| GET | `reports/profit-by-package/` | same shape per package |
| GET | `reports/profit-by-staff/` | `{staff_id, staff_name, revenue_*, product_cost_*, profit_*, visit_count}` |
| GET | `reports/wallet-summary/` | `{total_liability_usd, rewards_issued_usd, reward_reversals_usd, wallet_payments_usd, wallet_refunds_usd}` |
| GET | `reports/staff-payout-summary/` | params `staff, role` + range |
| GET | `reports/dashboard/` | period + sales_summary + wallet_summary + operational (visits_completed, new_customers, staff_payout_count) |

**Customers reports (new):** `GET /api/reports/exchange-dollar/` (DB-cached rate), `GET /api/reports/backup-exchange/` (live BrsApi).
