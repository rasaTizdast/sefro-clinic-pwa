# Frontend/Backend Audit — Full Analysis & Roadmap

> Generated: 2026-06-25
> Audit of all 8 pages + auth against real backend endpoints
> Goal: Full audit + prioritized roadmap. Adapt frontend to backend. Fix Settings.

---

## 1. Goal & Scope

**Primary Goal**: A complete, prioritized roadmap for aligning the frontend with the actual backend API.

**Scope**:

- All 8 routes plus auth (Dashboard, Calendar, Patients, Services, Warehouse, Accounting, Analytics, Settings, Auth)
- Backend Django REST endpoints defined in `src/config/api.ts`
- Services in `src/services/*.ts`, hooks in `src/hooks/api/*.ts`

**Guiding Principles** (from user):

- **Adapt frontend to backend** — change frontend to match what backend actually returns/sends
- **Remove fake/mock UI** — if no endpoint exists, remove the UI
- **Functionality first** — critical before medium
- **Atomic commits** — one commit per page, per Conventional Commits

---

## 2. Quick Summary

### Actually Working ✅ (after careful code review)

| Page           | Status           | Notes                                                                                                                                                                                                                                                            |
| -------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Auth**       | ✅ Fully working | Login, logout, token refresh, `useCurrentUser`, `useEmployees` all wired correctly                                                                                                                                                                               |
| **Patients**   | ✅ Fully working | `PatientFormData` fields (`firstName`, `lastName`, `mobileNumber`, `nationalId`, `bitmojiCode`) all correctly map through the camelCase↔snake_case interceptor. `PatientFormModal` uses `mobileNumber`/`bitmojiCode` names. **No phone/bitmojiId issue exists.** |
| **Services**   | ✅ Fully working | `toBackendPayload` manually maps `title`→`name`, `duration`→`time`. Interceptor then converts remaining camelCase to snake_case. Read path maps `name`→`title`, `time`→`duration`.                                                                               |
| **Warehouse**  | ✅ Fully working | `toBackendPayload` maps `stock`→`count`, `unitPrice`→`unit_price`. Read path maps `count`→`stock`. No fake `category`/`expiryDate` fields in current types.                                                                                                      |
| **Accounting** | ✅ Fully working | `toBackendPayload` maps `patientId`→`customer`, `paymentMethod`→`payment_method`, `description`→`notes`. Payment method options are restricted to `cash`/`card`/`transfer`.                                                                                      |
| **Analytics**  | ✅ Fully working | `toReportsData` in `reports.ts` correctly maps all backend fields (`totalSales`, `totalCustomers`, `salesChart.monthly`, `customerStatus`, `servicePopularity`, `avgSatisfaction`). Recursive `toCamelCase` interceptor handles nested keys.                     |
| **Calendar**   | ⚠️ Minor         | Visit creation uses `useReserveVisit` → `POST /visits/reserve/` with correct payload. But appointment **display** in sidebar has broken fields (see below).                                                                                                      |

### Real Issues

| #   | Page                 | Issue                                                                                                                         | Severity | Type           |
| --- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------- | -------------- |
| 1   | **Dashboard**        | Appointment table shows blank patient name (column key `"patient"` expects object, backend returns `customerName` string)     | 🔴       | UI/Data        |
| 2   | **Dashboard**        | `customerCount` and `loyalCustomerCount` fetched from API but never displayed                                                 | 🟡       | UI             |
| 3   | **Dashboard**        | Progress bar value computed from `toLatinDigits(stat.value)` — fragile and meaningless for stat cards                         | 🟡       | UI/Logic       |
| 4   | **Calendar**         | Appointment detail sidebar uses `appt.patient?.firstName` (always `undefined`) and `appt.service?.title` (always `undefined`) | 🟡       | UI/Data        |
| 5   | **Appointment type** | Unused optional `patient?` and `service?` objects should be removed                                                           | 🟡       | Technical Debt |
| 6   | **Settings**         | Profile tab has no backend endpoint — fake data + fake save                                                                   | 🔴       | Fake UI        |
| 7   | **Settings**         | Clinic tab has no backend endpoint — fake data + fake save                                                                    | 🔴       | Fake UI        |
| 8   | **Settings**         | Notifications tab has no backend endpoint — fake data + fake save                                                             | 🔴       | Fake UI        |
| 9   | **Settings**         | Working hours have no backend endpoint — local state only                                                                     | 🟡       | Gap            |
| 10  | **Settings**         | Change password works via `PUT /auth/employees/{id}/` but uses only current user's ID; no separate password change endpoint   | 🟡       | UX             |

---

## 3. Page-by-Page Analysis

### 3.1 Dashboard (`/`)

**Backend**: `GET /dashboard/` → `{ customer_count, loyal_customer_count, today_sales, today_visits, new_customers }`

**What works**:

- 4 stat cards (todayVisits, todaySales, newCustomers) all use correct API data ✅
- Quick actions (navigate, open modal) work ✅
- Recent patients table works ✅
- Loading/error states handled ✅

**What's broken**:

- **Appointment table** (`Dashboard.tsx:59-75`): Column `{ key: "patient", ... }` tries to render `item.patient` (expecting an object `{ firstName, lastName }`) but `toAppointment()` sets `patient: undefined`. The real value is at `item.customerName` (a string). → Table shows blank cells.

- **`customerCount` & `loyalCustomerCount`**: Fetched in `dashboardStats` but never rendered as stat cards. These could be useful additions (e.g., "کل مشتریان", "مشتریان وفادار").

- **Progress bar gimmick** (`Dashboard.tsx:330`): `value={Number(toLatinDigits(stat.value).replace(/[^\d]/g, "")) * 7}` — multiplies any stat value by 7 to produce a random-looking progress. This is meaningless. Should either show real progress or be removed.

**Files affected**:

- `src/routes/Dashboard.tsx` (columns, stat cards, progress bar)

---

### 3.2 Calendar (`/calendar`)

**Backend**:

- `GET /visits/?year=&month=` → `[{ id, customer, customer_name, staff, services, service_names, start_at, end_at, status, notes }]`
- `POST /visits/reserve/` → accepts `{ customer, services, date, time, notes }`

**What works**:

- Calendar grid rendering ✅
- Persian date calculations ✅
- Visit creation wizard (uses `useReserveVisit` → correct payload shape) ✅
- Patient search, service selection, time slot availability all work ✅
- Appointment list in right sidebar loads ✅

**What's broken**:

- **Appointment detail in sidebar** (`Calendar.tsx:893-899`): Uses `appt.patient?.firstName` and `appt.service?.title` — both are always `undefined` because `toAppointment()` never populates them. The real data is at `appt.customerName` (string) and `appt.serviceNames[0]` (string).

- **Unused type fields** (`types/appointment.ts:17-25`): `patient?: { id, firstName, lastName }` and `service?: { id, title }` are optional objects never populated by `toAppointment()`. Leftover from early development.

**Files affected**:

- `src/routes/Calendar.tsx` (sidebar detail display)
- `src/types/appointment.ts` (remove unused `patient`/`service` fields)

---

### 3.3 Patients (`/patients`)

**Backend**: `GET /customers/`, `POST /customers/`, `PUT /customers/{id}/`, `DELETE /customers/{id}/`

Backend fields: `id, first_name, last_name, mobile_number, national_id, bitmoji_code, created_at, visit_number, is_new_customer, is_loyal_customer, total_payments, last_visit_date`

**What works**:

- CRUD operations all work correctly ✅
- `PatientFormData` sent through interceptor converts `firstName`→`first_name`, `mobileNumber`→`mobile_number`, etc. ✅
- Read: `toPatient()` correctly maps all fields from camelCase-converted backend response ✅
- Search, filter tabs, pagination, status badges all work ✅
- **No `phone`/`bitmojiId` field issue** — the form uses `mobileNumber`/`bitmojiCode` which correcty map via interceptor

**What could improve**:

- `status` is computed client-side from `isNewCustomer`/`isLoyalCustomer`/`visitCount` — correct but fragile if backend adds a status field

**Files affected**: None (already working)

---

### 3.4 Services (`/services`)

**Backend**: `GET /services/`, `POST /services/`, `PUT /services/{id}/`, `DELETE /services/{id}/`

Backend fields: `id, name, description, price, time, is_active`

**What works**:

- CRUD operations work correctly ✅
- `toBackendPayload()` manually maps `title`→`name`, `duration`→`time` before sending ✅
- Read: `toService()` maps `name`→`title`, `time`→`duration` ✅

**Files affected**: None (already working)

---

### 3.5 Warehouse (`/warehouse`)

**Backend**: `GET /inventory/products/`, `POST /inventory/products/`, `PUT /inventory/products/{id}/`, `DELETE /inventory/products/{id}/`

Backend fields: `id, name, sku, description, unit_price, count, status, unit`

**What works**:

- CRUD operations work correctly ✅
- `toBackendPayload()` maps `stock`→`count`, `unitPrice`→`unit_price` before sending ✅
- Read: `toWarehouseItem()` maps `count`→`stock`, `unit_price`→`unitPrice` ✅
- Inventory status badges (using `getStatus(stock)` client-side) work ✅
- Low stock alert works ✅

**What could be better**:

- Backend has a real `status` field (`available`/`less`/`finished`) but frontend ignores it and computes its own from stock count. These could be out of sync.

**Files affected**: None (already working, but could improve by using backend `status` field)

---

### 3.6 Accounting (`/accounting`)

**Backend**: `GET /payments/`, `POST /payments/`, `GET /payments/{id}/`

Backend fields: `id, customer, visit, amount, payment_method, paid_at, notes, customer_name`

**What works**:

- List payments works ✅
- `toBackendPayload()` maps `patientId`→`customer`, `paymentMethod`→`payment_method`, `description`→`notes` ✅
- Read: `toTransaction()` maps `customerName`→`patient`, `paidAt`→`date`, `notes`→`description` ✅
- Payment method values in form are restricted to `cash`/`card`/`transfer` (leaving out `online`/`cheque`) ✅
- Statistics computed client-side work ✅
- Revenue chart works ✅
- Date filters work ✅
- `useCreateVisit` is **not used anywhere** — only `useReserveVisit` is used by Calendar

**Minor issue**: `AddTransactionModal` forces user to pick a service which auto-fills the amount. The `TransactionFormData.type` includes `patientName` field but backend doesn't need it (only `patientId` is sent).

**Files affected**: None (already working)

---

### 3.7 Analytics (`/analytics`)

**Backend**:

- `GET /reports/all/` → `{ total_sales, avg_satisfaction, total_customers, total_visits, sales_chart: { monthly, ... }, customer_status: { pending, confirmed, completed, canceled }, service_popularity: [{ id, name, usage }] }`
- `GET /reports/` (filtered) → similar but filtered
- `GET /reports/visits/` → `{ monthly: [{ period, count }] }`
- `GET /reports/referral/` → `{ referral_rate, new_customers, returning_customers }`

**What works**:

- KPI cards (customer count, total revenue, retention rate, satisfaction) all correctly read from API via `toReportsData()` ✅
- Monthly revenue line chart reads `reports.monthlyRevenue` ← `salesChart.monthly` ✅
- Appointment status pie chart reads `reports.appointmentStats` ← `customerStatus` (object→array transform in `toReportsData`) ✅
- Monthly visits bar chart reads `visitReports` from separate `/reports/visits/` endpoint ✅
- Service popularity area chart reads `reports.serviceCategoryStats` ← `servicePopularity` ✅
- Date range selector switches between `allReports` and `filteredReports` ✅

**Files affected**: None (already working. The mapping layer in `reports.ts` correctly adapts backend → frontend.)

---

### 3.8 Settings (`/settings`)

**Backend endpoints**:

- `GET /auth/me/` → `{ id, username, role, date_joined }` (no email, phone, fullName)
- `GET /auth/employees/list/` → `[{ id, username, role }]`
- `POST /auth/employees/` → create (accepts `username`, `password`)
- `PUT /auth/employees/{id}/` → update (accepts `username`, `password`)
- `DELETE /auth/employees/{id}/` → delete

**NO endpoints exist for**: profile update, clinic info, working hours, notification preferences.

**Page structure**:

- 4 tabs: Profile, Clinic, Users, Notifications
- Profile tab: has `username`, `fullName`, `email`, `phone` inputs + change password section → **Backend has no profile update endpoint** (except password via `PUT /auth/employees/{id}/`)
- Clinic tab: `name`, `address`, `phone`, `postalCode`, working hours → **No backend endpoint exists**
- Users tab: CRUD via employee endpoints → **Working** ✅
- Notifications tab: toggle switches → **No backend endpoint exists**

**User's requirement**: Delete Profile, Clinic, Notifications tabs. Keep working hours + change password for all users. Add admin user management for admin users only.

---

### 3.9 Auth (`/auth`)

**What works**:

- Login form with validation ✅
- Token refresh via 401 interceptor ✅
- Role-based routing via `RequireAuth`/`RedirectIfAuth` ✅
- `useCurrentUser` correctly fetches `/auth/me/` ✅
- `useEmployees` correctly fetches `/auth/employees/list/` ✅

**Files affected**: None (fully working)

---

## 4. Settings Page — Detailed Refactor Plan

The user wants Settings to only have:

- **Working hours** (local state, no backend — fine as a stub with TODO)
- **Change password** (works via `PUT /auth/employees/{id}/` with `password` field)
- **Users management** (for admin users — already works)
- **Remove** Profile, Clinic, Notifications tabs

### Steps

1. **Remove Profile tab** (`Settings.tsx`):
   - Delete the entire `<TabPanel id="profile">` section (lines 267-351)
   - Remove `profile` state (lines 70-75)
   - Remove `password` state (lines 77-81)
   - BUT keep the password change feature — move it to its own section or a "Security" card
   - Remove `handleSaveProfile()` function

2. **Remove Clinic tab** (`Settings.tsx`):
   - Delete the entire `<TabPanel id="clinic">` section (lines 353-425)
   - Remove `clinic` state (lines 83-88)
   - Remove `workingHours` state — move this to the main page or a new "تنظیمات کلینیک" card

3. **Remove Notifications tab** (`Settings.tsx`):
   - Delete the entire `<TabPanel id="notifications">` section (lines 504-579)
   - Remove `notifications` state (lines 92-98)

4. **Restructure tabs**:
   - Keep only tabs: "کاربران" (for admin), and possibly "عمومی" for working hours/password
   - Alternatively: no tabs at all — just sections on a single page

5. **Keep Users tab** as-is (already working)

**Files affected**:

- `src/routes/Settings.tsx` (major restructure)

---

## 5. Calendar & Dashboard — Appointment Display Fix

### Root Cause

The `toAppointment()` function in `services/visits.ts:39-55` sets:

```ts
patient: undefined,
service: undefined,
```

But both `Dashboard.tsx` and `Calendar.tsx` try to render these as objects.

### Fix

1. **Remove unused fields from Appointment type** (`types/appointment.ts`):

   ```diff
   - patient?: { id: number; firstName: string; lastName: string };
   - service?: { id: number; title: string };
   ```

2. **Fix Dashboard appointment table column** (`Dashboard.tsx:60-65`):

   ```diff
   - { key: "patient", header: "بیمار" },
   + { key: "customerName", header: "بیمار" },
   ```

3. **Fix Calendar appointment detail sidebar** (`Calendar.tsx:893-899`):
   ```diff
   - <p className="text-surface-900 text-xs font-medium">{appt.patient?.firstName} {appt.patient?.lastName}</p>
   + <p className="text-surface-900 text-xs font-medium">{appt.customerName}</p>
   ```
   ```diff
   - <span>{appt.service?.title}</span>
   + <span>{appt.serviceNames?.[0]}</span>
   ```

**Files affected**:

- `src/types/appointment.ts`
- `src/routes/Dashboard.tsx`
- `src/routes/Calendar.tsx`

---

## 6. Dashboard — Add Missing Stat Cards

The backend returns `customerCount` and `loyalCustomerCount` but neither is displayed. Add two more stat cards:

```typescript
// In Dashboard.tsx stats array (around line 164-199)
{
  title: "کل مشتریان",
  value: toPersianDigits(String(dashboardStats.customerCount)),
  change: "",
  trend: "flat",
  icon: <MdPeople className="size-5" />,
  variant: "default",
},
{
  title: "مشتریان وفادار",
  value: toPersianDigits(String(dashboardStats.loyalCustomerCount)),
  change: "",
  trend: "flat",
  icon: <MdPersonAdd className="size-5" />,
  variant: "success",
},
```

Alternatively, replace the existing "نوبت‌های امروز" card (which duplicates info from the appointments section below) with one of these.

**Files affected**:

- `src/routes/Dashboard.tsx`

---

## 7. Dashboard — Fix or Remove Progress Bar Gimmick

Current line: `value={Number(toLatinDigits(stat.value).replace(/[^\d]/g, "")) * 7}`

This multiplies the stat value by 7 to produce a progress bar value ranging from 0-100 (e.g., 12 visits × 7 = 84%). This is arbitrary and misleading.

**Options**:

1. Remove the progress bar from stat cards entirely (simplest)
2. Replace with a real metric (e.g., capacity percentage already computed for the capacity card)
3. Show a mini sparkline chart instead

**Files affected**:

- `src/routes/Dashboard.tsx`

---

## 8. Clean Up: Remove Unused `useCreateVisit`

The `useCreateVisit` mutation is exported from `hooks/api/index.ts` but **no file imports it** (grep confirms). It's dead code that calls `POST /visits/` with the wrong payload shape anyway (sends `patientId`, `serviceId` instead of `customer`, `services`).

- Remove from `src/hooks/api/useVisitsQuery.ts`
- Remove from `src/hooks/api/index.ts` barrel export
- Remove `src/services/visits.ts:83-84` (the `createVisit` function)

**Files affected**:

- `src/services/visits.ts`
- `src/hooks/api/useVisitsQuery.ts`
- `src/hooks/api/index.ts`

---

## 9. Prioritized Fix Order

| Priority | Task                                                                     | Est. Complexity | Commit Message                                                         |
| -------- | ------------------------------------------------------------------------ | --------------- | ---------------------------------------------------------------------- |
| **P0**   | Fix Dashboard appointment table (blank names)                            | ~15 min         | `fix: use customerName instead of patient object in dashboard table`   |
| **P0**   | Fix Calendar sidebar appointment detail (blank names)                    | ~10 min         | `fix: use customerName and serviceNames in calendar sidebar`           |
| **P0**   | Remove unused `patient`/`service` fields from Appointment type           | ~5 min          | `refactor: remove unused patient/service fields from Appointment type` |
| **P0**   | Remove unused `useCreateVisit` and `createVisit`                         | ~10 min         | `refactor: remove unused useCreateVisit hook and createVisit service`  |
| **P1**   | Restructure Settings: remove Profile/Clinic/Notifications tabs           | ~30 min         | `refactor: remove settings tabs without backend endpoints`             |
| **P1**   | Add missing `customerCount`/`loyalCustomerCount` stat cards to Dashboard | ~15 min         | `feat: add customer count stat cards to dashboard`                     |
| **P2**   | Fix/remove progress bar gimmick in dashboard stat cards                  | ~10 min         | `fix: remove misleading progress bar from dashboard stat cards`        |

---

## 10. Appendix: Skills to Use per Task

| Task                      | Skills                                                        |
| ------------------------- | ------------------------------------------------------------- |
| Dashboard fixes           | `systematic-debugging`, `vercel-react-best-practices`         |
| Calendar fixes            | `systematic-debugging`                                        |
| Settings restructure      | `impeccable` (UI audit), `writing-plans`                      |
| Type cleanup              | `vercel-composition-patterns`                                 |
| Code review before commit | `verification-before-completion`, `git-review-fix-and-commit` |

---

## 11. Appendix: How the Interceptor Works (Key Insight)

The `api-client.ts` uses recursive `toCamelCase`/`toSnakeCase` converters (`lib/transform.ts`). This means:

- **All nested keys** in API responses are converted: `sales_chart.monthly` → `salesChart.monthly` ✅
- **All nested keys** in request payloads are converted: `{ patientId: 1 }` → `{ patient_id: 1 }` ✅

This is why many apparent mismatches from a surface-level analysis are actually handled — the interceptor bridges the naming gap. The real issues are only where:

1. The frontend **expects a different data shape** (object vs string, like `patient` vs `customerName`)
2. The UI section has **no backend endpoint at all** (Settings profile/clinic/notifications)
3. The code has **unused/leftover fields** from refactoring (`patient?`, `service?`)
