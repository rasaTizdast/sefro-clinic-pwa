# Backend vs Frontend Analysis

> Generated: 2026-06-23
> Covers all API endpoints in `backend/customers`, `backend/inventory`, `backend/accounts`

---

## 1. Customer (Patient) — `/api/customers/`

### Backend Model (`Customer`)

| Field               | Type                      | Notes                          |
| ------------------- | ------------------------- | ------------------------------ |
| `id`                | BigAutoField              |                                |
| `first_name`        | CharField(100)            | required                       |
| `last_name`         | CharField(100)            | required                       |
| `mobile_number`     | CharField(20)             | unique, required               |
| `national_id`       | CharField(20)             | unique, required               |
| `bitmoji_code`      | CharField(50)             | nullable, blank                |
| `created_at`        | DateTimeField             | auto_now_add                   |
| `satisfaction`      | PositiveSmallIntegerField | nullable, 1-5                  |
| `notes`             | TextField                 | blank                          |
| `visit_number`      | property                  | computed from related visits   |
| `is_new_customer`   | property                  | `visit_number === 0`           |
| `is_loyal_customer` | property                  | `visit_number >= 5`            |
| `total_payments`    | property                  | sum of related payments        |
| `last_visit_date`   | property                  | most recent visit's `start_at` |

### Frontend Type (`Patient`)

| Field        | Backend Equivalent | Match?                                                                                                                                                     |
| ------------ | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`         | `id`               | ✅                                                                                                                                                         |
| `firstName`  | `first_name`       | ✅ (camelCase conv.)                                                                                                                                       |
| `lastName`   | `last_name`        | ✅ (camelCase conv.)                                                                                                                                       |
| `phone`      | `mobile_number`    | ❌ **Name mismatch** — interceptor can't fix `phone` → `mobile_number`                                                                                     |
| `nationalId` | `national_id`      | ✅ (camelCase conv.)                                                                                                                                       |
| `bitmojiId`  | `bitmoji_code`     | ❌ **Name mismatch** — `bitmojiId` → `bitmoji_code`                                                                                                        |
| `lastVisit`  | `last_visit_date`  | ❌ **Name mismatch** — also backend returns Shamsi date, frontend uses string                                                                              |
| `visitCount` | `visit_number`     | ❌ **Name mismatch**                                                                                                                                       |
| `status`     | _(computed)_       | ❌ **No backend equivalent** — backend has `is_new_customer`/`is_loyal_customer` but no single `status` field. Frontend uses: `active`, `inactive`, `new`. |
| `createdAt`  | `created_at`       | ✅ (camelCase conv.)                                                                                                                                       |
| `products`   | _(no relation)_    | ❌ **No backend equivalent** — Customer has no products relation                                                                                           |
| `services`   | _(no relation)_    | ❌ **No backend equivalent** — Customer has no direct services relation (services are linked via visits)                                                   |

### Frontend `PatientFormData`

| Field        | Backend Expected | Match?                            |
| ------------ | ---------------- | --------------------------------- |
| `firstName`  | `first_name`     | ✅                                |
| `lastName`   | `last_name`      | ✅                                |
| `phone`      | `mobile_number`  | ❌ **Will send wrong field name** |
| `nationalId` | `national_id`    | ✅                                |
| `bitmojiId`  | `bitmoji_code`   | ❌ **Will send wrong field name** |

**Impact**: Creating a patient sends `phone` and `bitmojiId` which the backend ignores. The `mobile_number` and `bitmoji_code` fields will be empty.

---

## 2. Services — `/api/services/`

### Backend Model (`Service`)

| Field         | Type                 | Notes               |
| ------------- | -------------------- | ------------------- |
| `id`          | BigAutoField         |                     |
| `name`        | CharField(100)       | unique              |
| `description` | TextField            | blank               |
| `price`       | DecimalField(10,2)   | default 0           |
| `time`        | PositiveIntegerField | duration in minutes |
| `is_active`   | BooleanField         | default True        |

### Frontend Type (`Service`)

| Field         | Backend Equivalent | Match?                                                       |
| ------------- | ------------------ | ------------------------------------------------------------ |
| `id`          | `id`               | ✅                                                           |
| `title`       | `name`             | ❌ **Name mismatch** — `title` vs `name`                     |
| `category`    | _(not in backend)_ | ❌ **No backend equivalent** — Service has no category field |
| `duration`    | `time`             | ❌ **Name mismatch** — `duration` vs `time`                  |
| `price`       | `price`            | ✅                                                           |
| `description` | `description`      | ✅                                                           |
| `isActive`    | `is_active`        | ✅ (camelCase conv.)                                         |

### Frontend `ServiceFormData` (sent in POST/PUT)

| Field         | Backend Expected   | Match?              |
| ------------- | ------------------ | ------------------- |
| `title`       | `name`             | ❌                  |
| `category`    | _(not in backend)_ | ❌ Sent but ignored |
| `duration`    | `time`             | ❌                  |
| `price`       | `price`            | ✅                  |
| `description` | `description`      | ✅                  |
| `isActive`    | `is_active`        | ✅                  |

**Impact**: Creating/updating services sends `title` instead of `name`, and `duration` instead of `time`. The backend will not receive these values correctly. The `category` field is sent but not stored on the backend.

---

## 3. Visit (Appointment) — `/api/visits/`

### Backend Model (`Visit`)

| Field      | Type                     | Notes                                           |
| ---------- | ------------------------ | ----------------------------------------------- |
| `id`       | BigAutoField             |                                                 |
| `customer` | ForeignKey(Customer)     | required                                        |
| `staff`    | ForeignKey(ClinicUser)   | nullable                                        |
| `services` | ManyToManyField(Service) | required (list of IDs)                          |
| `start_at` | DateTimeField            | Shamsi datetime                                 |
| `end_at`   | DateTimeField            | Shamsi datetime                                 |
| `status`   | CharField(20)            | `pending`, `confirmed`, `completed`, `canceled` |
| `notes`    | TextField                | blank                                           |

### Frontend Type (`Appointment`)

| Field       | Backend Equivalent                              | Match?                                                                                                                              |
| ----------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `id`        | `id`                                            | ✅                                                                                                                                  |
| `time`      | `start_at` (time portion)                       | ⚠️ Frontend stores time as HH:MM string, backend stores full datetime                                                               |
| `patient`   | `customer` (FK ID) + `customer_name` (readonly) | ⚠️ Frontend expects patient name string, backend expects FK ID                                                                      |
| `service`   | `service_names[0]` (readonly string)            | ⚠️ Frontend expects single string, backend supports multiple services                                                               |
| `serviceId` | `services[0]` (FK ID)                           | ⚠️ Frontend stores single ID, backend supports array of IDs                                                                         |
| `duration`  | `time` (from related service)                   | ⚠️ Computed from service duration                                                                                                   |
| `date`      | `start_at` (date portion)                       | ⚠️ Frontend stores Shamsi date string, backend stores full datetime                                                                 |
| `status`    | `status`                                        | ❌ **Enum mismatch**: frontend uses `waiting` where backend uses `pending`; backend uses `canceled` where frontend uses `cancelled` |

### Calendar Page — Visit Creation

The Calendar sends to `POST /api/visits/` via `useCreateVisit()`:

```ts
{
  patientId: selectedPatient.id,
  serviceId: selectedService.id,
  date: form.date,           // Shamsi "YYYY/M/D"
  time: form.time,           // "HH:MM" (Persian digits)
  notes: form.notes,
  status: "confirmed",
}
```

**Backend expects**:

```json
{
  "customer": 1, // integer FK, not "patientId"
  "services": [1], // array of integers, not "serviceId"
  "start_at": "1405-04-02 10:30", // Shamsi datetime, not separate date+time
  "end_at": "1405-04-02 11:00", // Shamsi datetime, computed from service duration
  "notes": "...",
  "status": "confirmed"
}
```

**Issues**:

1. ❌ `patientId` sent instead of `customer`
2. ❌ `serviceId` sent as scalar instead of `services` array
3. ❌ `date` + `time` sent separately instead of `start_at` + `end_at` datetimes
4. ❌ No `end_at` computed or sent
5. ❌ Field name `patientId` won't be snake_case-converted to `patient_id` (but backend expects `customer` anyway)
6. ❌ Persian digits in time string may not be parsed

### Reservation Endpoint

There is also `POST /api/visits/reserve/` which accepts:

```json
{
  "customer": 1,
  "services": [1],
  "date": "1405-04-02",
  "time": "10:30",
  "notes": "..."
}
```

This endpoint **matches the Calendar's data shape better** — it accepts separate `date` + `time` and calculates `end_at` automatically. But the frontend uses the regular `POST /api/visits/` instead.

---

## 4. Payment (Transaction) — `/api/payments/`

### Backend Model (`Payment`)

| Field            | Type                  | Notes                      |
| ---------------- | --------------------- | -------------------------- |
| `id`             | BigAutoField          |                            |
| `customer`       | ForeignKey(Customer)  | required                   |
| `visit`          | ForeignKey(Visit)     | nullable                   |
| `amount`         | DecimalField(12,2)    | min 0                      |
| `payment_method` | CharField(20)         | `cash`, `card`, `transfer` |
| `paid_at`        | DateTimeField         | required                   |
| `notes`          | TextField             | blank                      |
| `customer_name`  | SerializerMethodField | readonly: `str(customer)`  |

### Frontend Type (`Transaction`)

| Field           | Backend Equivalent         | Match?                                                                                                  |
| --------------- | -------------------------- | ------------------------------------------------------------------------------------------------------- |
| `id`            | `id`                       | ✅                                                                                                      |
| `date`          | `paid_at`                  | ⚠️ Frontend stores Shamsi date string, backend expects Shamsi datetime                                  |
| `description`   | `notes`                    | ❌ **Name mismatch**                                                                                    |
| `patient`       | `customer_name` (readonly) | ⚠️ Frontend stores patient name string, backend expects `customer` FK ID                                |
| `amount`        | `amount`                   | ✅                                                                                                      |
| `paymentMethod` | `payment_method`           | ⚠️ Frontend uses `cash`, `card`, `online`, `cheque` but backend only accepts `cash`, `card`, `transfer` |
| `status`        | _(computed)_               | ⚠️ Backend status is `paid`/`cancelled` via related visit status                                        |
| `serviceId`     | `visit` → `services`       | ❌ Indirect relationship — not a direct field                                                           |

### Accounting Page — Payment Creation

Sends to `useCreatePayment()`:

```ts
{
  paidAt: data.date,
  customerName: data.patient,
  amount: data.amount,
  paymentMethod: data.paymentMethod,
  notes: data.description,
}
```

**Backend expects**:

```json
{
  "customer": 1, // integer FK, NOT "customerName"
  "amount": 500000,
  "payment_method": "card",
  "paid_at": "1405-04-02", // Shamsi date/datetime
  "notes": "..."
}
```

**Issues**:

1. ❌ `customerName` sent instead of `customer` FK ID
2. ❌ `paymentMethod` with `online`/`cheque` values that backend doesn't accept (`transfer` only)
3. ❌ `paidAt` is camelCase but interceptor converts to `paid_at` — however the shape is correct ✅
4. ❌ `description` sent as `notes` — but the interceptor wouldn't convert this (already snake_case)

---

## 5. Product (Warehouse) — `/api/inventory/products/`

### Backend Model (`Product`)

| Field         | Type                 | Notes                           |
| ------------- | -------------------- | ------------------------------- |
| `id`          | BigAutoField         |                                 |
| `name`        | CharField(120)       | required                        |
| `sku`         | CharField(50)        | nullable, unique                |
| `description` | TextField            | blank                           |
| `unit_price`  | DecimalField(10,2)   | required, min 0                 |
| `count`       | PositiveIntegerField | default 0                       |
| `status`      | CharField(20)        | `available`, `less`, `finished` |
| `unit`        | CharField(50)        | blank                           |

### Frontend Type (`WarehouseItem`)

| Field           | Backend Equivalent | Match?                                                    |
| --------------- | ------------------ | --------------------------------------------------------- |
| `id`            | `id`               | ✅                                                        |
| `name`          | `name`             | ✅                                                        |
| `category`      | _(not in backend)_ | ❌ **No backend equivalent**                              |
| `categoryLabel` | _(not in backend)_ | ❌ **No backend equivalent**                              |
| `stock`         | `count`            | ❌ **Name mismatch**                                      |
| `unit`          | `unit`             | ✅                                                        |
| `unitPrice`     | `unit_price`       | ✅ (camelCase conv.)                                      |
| `expiryDate`    | _(not in backend)_ | ❌ **No backend equivalent** — Product has no expiry date |
| `description`   | `description`      | ✅                                                        |

**Impact**: Creating/updating products sends `stock` instead of `count`, and extraneous fields `category`, `categoryLabel`, `expiryDate` which the backend will ignore. The `count` field will not be populated.

---

## 6. Dashboard — `/api/dashboard/`

### Backend Response

```json
{
  "customer_count": 123,
  "loyal_customer_count": 45,
  "today_sales": 15000000,
  "today_visits": 12,
  "new_customers": 3
}
```

### Frontend Expectation (`DashboardStats`)

```ts
{
  customerCount: number; // camelCase ✅
  loyalCustomerCount: number; // camelCase ✅
  todaySales: number; // camelCase ✅
  todayVisits: number; // camelCase ✅
  newCustomers: number; // camelCase ✅
}
```

**Match**: ✅ Fields match after camelCase conversion.

### Dashboard Usage

The frontend uses `dashboardStats.todayVisits`, `dashboardStats.todaySales`, `dashboardStats.newCustomers` — all map correctly after conversion. ✅

---

## 7. Reports — `/api/reports/all/`

### Backend Response

```json
{
  "sales_chart": {
    "daily": [{ "period": "1405-04-02", "total": 500000 }],
    "weekly": [],
    "monthly": [],
    "quarterly": [],
    "yearly": []
  },
  "total_sales": 15000000,
  "avg_satisfaction": 4.5,
  "service_popularity": [{ "id": 1, "name": "ماساژ", "usage": 10 }],
  "customer_status": {
    "pending": 5,
    "confirmed": 10,
    "completed": 20,
    "canceled": 2
  },
  "total_customers": 100,
  "total_visits": 200
}
```

### Frontend Expectation (`useAllReports()` returns `any`)

The Analytics page reads:
| Access Path | Backend Equivalent | Match? |
|-------------|--------------------|--------|
| `reports.customerCount` | `total_customers` | ❌ **Name mismatch** — should be `reports.total_customers` or `customer_count` |
| `reports.totalRevenue` | `total_sales` | ❌ **Name mismatch** |
| `reports.retentionRate` | _(from `/reports/referral/`)_ | ❌ **Not in this response** — comes from a different endpoint |
| `reports.monthlyRevenue` | `sales_chart.monthly` | ❌ **Path mismatch** — nested under `sales_chart` |
| `reports.appointmentStats` | `customer_status` (needs transformation) | ❌ **Shape mismatch** — backend returns object, frontend expects `{name, value, color}[]` |
| `reports.monthlyVisits` | _(not in any response)_ | ❌ **No equivalent** — not returned by backend |
| `reports.serviceCategoryStats` | `service_popularity` | ❌ **Name mismatch** — also `{id, name, usage}` vs `{name, value}` |

**Impact**: The Analytics page will not display any data correctly until the frontend adapts to the actual backend response shape.

---

## 8. Auth — `/api/auth/`

### Backend `ClinicUser` Serializer

```json
{
  "id": 1,
  "username": "admin",
  "role": "admin | employee",
  "date_joined": "1405-01-01 12:00"
}
```

### Frontend Type (`AuthUser`)

| Field        | Backend Equivalent | Match?               |
| ------------ | ------------------ | -------------------- |
| `id`         | `id`               | ✅                   |
| `username`   | `username`         | ✅                   |
| `role`       | `role`             | ✅                   |
| `dateJoined` | `date_joined`      | ✅ (camelCase conv.) |

**Match**: ✅ All fields match.

---

## 9. Settings — Profile/Clinic/Password

**No dedicated endpoints exist** on the backend for:

- Profile update (full name, email, phone) — `ClinicUser` model has these fields but serializers don't expose them
- Clinic info (name, address, phone, postal_code)
- Working hours
- Notification preferences

The only Settings-related CRUD is **User management** via:

- `POST /api/auth/employees/` — create employee (accepts `username`, `password`)
- `PUT /api/auth/employees/<id>/` — update employee (accepts `username`, `password`)
- `DELETE /api/auth/employees/<id>/` — delete employee

These are now wired in the Settings page.

---

## Summary of Critical Mismatches

| Area                | Issue                                                              | Severity |
| ------------------- | ------------------------------------------------------------------ | -------- |
| **Patients**        | `phone` vs `mobile_number` — POST/PUT sends wrong field            | 🔴       |
| **Patients**        | `bitmojiId` vs `bitmoji_code` — POST/PUT sends wrong field         | 🔴       |
| **Patients**        | `status` doesn't exist on backend — computed field mismatch        | 🟡       |
| **Services**        | `title` vs `name` — POST/PUT sends wrong field                     | 🔴       |
| **Services**        | `duration` vs `time` — POST/PUT sends wrong field                  | 🔴       |
| **Services**        | `category` doesn't exist on backend — not persisted                | 🟡       |
| **Calendar/Visits** | `patientId` sent instead of `customer` FK                          | 🔴       |
| **Calendar/Visits** | `serviceId` sent as scalar instead of `services` array             | 🔴       |
| **Calendar/Visits** | `date`+`time` sent instead of `start_at`+`end_at` datetimes        | 🔴       |
| **Calendar/Visits** | Should use `/reserve/` endpoint instead of `/`                     | 🟡       |
| **Calendar/Visits** | Status enum: `waiting` vs `pending`                                | 🔴       |
| **Payments**        | `customerName` sent instead of `customer` FK ID                    | 🔴       |
| **Payments**        | `paymentMethod` accepts `online`/`cheque` not supported by backend | 🔴       |
| **Payments**        | `description` vs `notes` — field name mismatch                     | 🟡       |
| **Warehouse**       | `stock` vs `count` — POST/PUT sends wrong field                    | 🔴       |
| **Warehouse**       | `category`, `categoryLabel`, `expiryDate` don't exist on backend   | 🟡       |
| **Analytics**       | Backend response shape completely mismatches frontend expectations | 🔴       |
| **Settings**        | Profile/clinic/notifications have no backend endpoints             | 🟡       |

---

## Legend

- 🔴 **Critical** — Data will not be saved/loaded correctly; the feature is broken
- 🟡 **Medium** — Data works partially or cosmetic issue; functionality is degraded
- ✅ **Match** — Fields align after camelCase/snake_case conversion
