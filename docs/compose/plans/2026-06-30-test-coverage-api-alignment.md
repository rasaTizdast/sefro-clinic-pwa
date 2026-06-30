# Test Coverage & API Alignment Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure every service layer function sends correct requests to the backend, every mapper produces correct output, and every React Query hook integrates properly — with zero test errors or warnings.

**Architecture:** Three-layer testing strategy: (1) Unit tests for service-layer mapper functions and payload builders, (2) Integration tests for React Query hooks mocking the service layer, (3) API client interceptor tests verifying snake_case/camelCase translation.

**Tech Stack:** Vitest 4.x, @testing-library/react 16.x, @testing-library/jest-dom 6.x, jsdom, vi.fn() mocks

## Global Constraints

- All tests must pass with `pnpm test:unit` (zero errors, zero warnings)
- Tests use jsdom environment (configured in `vitest.config.ts`)
- No network calls — all `apiClient` calls are mocked
- Follow existing test patterns (vi.mock, vi.mocked, renderHook)
- `verbatimModuleSyntax: true` — use `import type` for type-only imports
- `erasableSyntaxOnly: true` — no enums

---

## Gap Analysis

### Current Coverage (31 test files)

- **UI Components:** 16 files — well covered
- **Lib utilities:** 6 files (api-client, pagination, transform, digits, validations, excel)
- **Hooks:** 3 files (useLoginForm, useCommandPalette, useQuickActions)
- **Contexts:** 1 file (AuthContext)
- **Routes:** 1 file (RouteGuard)

### Missing Coverage (critical for API/backend alignment)

- **Service layer:** 0 tests for any of 10 service files
- **React Query hooks:** 0 tests for any of 10 API hook files
- **API client interceptors:** Only checks axios.create config, not the interceptors

---

### Task 1: Service Unit Tests — Customers

**Covers:** Verifies `customers.ts` sends correct backend payloads and maps responses correctly

**Files:**

- Create: `src/services/__tests__/customers.test.ts`

**Interfaces:**

- Consumes: `apiClient` (mocked), `endpoints` (real)
- Produces: Verified request payloads match backend snake_case fields, response mappers produce correct frontend types

- [ ] **Step 1: Write tests for `listCustomers`**

```typescript
import { describe, expect, it, vi, beforeEach } from "vitest";
import * as apiClient from "../../lib/api-client";
import {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "../customers";

vi.mock("../../lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mock = vi.mocked(apiClient.apiClient);

describe("customers service", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("listCustomers", () => {
    it("sends correct params and maps DRF response", async () => {
      mock.get.mockResolvedValue({
        data: {
          count: 2,
          next: null,
          previous: null,
          results: [
            {
              id: 1,
              firstName: "علی",
              lastName: "رضایی",
              mobileNumber: "0912",
              visitNumber: 3,
              isNewCustomer: false,
              isLoyalCustomer: true,
              totalPayments: 500000,
            },
            {
              id: 2,
              firstName: "سارا",
              lastName: "احمدی",
              mobileNumber: "0935",
              visitNumber: 0,
              isNewCustomer: true,
              isLoyalCustomer: false,
              totalPayments: 0,
            },
          ],
        },
      });

      const result = await listCustomers({ page: 1, perPage: 20 });

      expect(mock.get).toHaveBeenCalledWith("/customers/", {
        params: { page: 1, per_page: 20, search: undefined, ordering: undefined },
      });
      expect(result.data).toHaveLength(2);
      expect(result.data[0].firstName).toBe("علی");
      expect(result.data[0].status).toBe("loyal");
      expect(result.data[1].status).toBe("new");
      expect(result.total).toBe(2);
    });

    it("sends search param when provided", async () => {
      mock.get.mockResolvedValue({ data: { count: 0, next: null, previous: null, results: [] } });
      await listCustomers({ search: "علی" });
      expect(mock.get).toHaveBeenCalledWith("/customers/", {
        params: { page: 1, per_page: 20, search: "علی", ordering: undefined },
      });
    });

    it("sends ordering with desc prefix", async () => {
      mock.get.mockResolvedValue({ data: { count: 0, next: null, previous: null, results: [] } });
      await listCustomers({ sort: "firstName", order: "desc" });
      expect(mock.get).toHaveBeenCalledWith("/customers/", {
        params: { page: 1, per_page: 20, search: undefined, ordering: "-firstName" },
      });
    });
  });

  describe("getCustomer", () => {
    it("fetches and maps single customer", async () => {
      mock.get.mockResolvedValue({
        data: {
          id: 1,
          firstName: "علی",
          lastName: "رضایی",
          mobileNumber: "0912",
          nationalId: "1234567890",
          bitmojiCode: "ABC",
          visitNumber: 5,
          isNewCustomer: false,
          isLoyalCustomer: false,
          totalPayments: 100000,
        },
      });
      const result = await getCustomer(1);
      expect(mock.get).toHaveBeenCalledWith("/customers/1/");
      expect(result.id).toBe(1);
      expect(result.firstName).toBe("علی");
      expect(result.status).toBe("active");
    });
  });

  describe("createCustomer", () => {
    it("sends POST with correct payload", async () => {
      mock.post.mockResolvedValue({ data: { id: 1 } });
      await createCustomer({
        firstName: "علی",
        lastName: "رضایی",
        mobileNumber: "0912",
        nationalId: "1234567890",
        bitmojiCode: "ABC",
        notes: "",
      });
      expect(mock.post).toHaveBeenCalledWith("/customers/", {
        firstName: "علی",
        lastName: "رضایی",
        mobileNumber: "0912",
        nationalId: "1234567890",
        bitmojiCode: "ABC",
        notes: "",
      });
    });

    it("removes empty bitmojiCode from payload", async () => {
      mock.post.mockResolvedValue({ data: { id: 1 } });
      await createCustomer({
        firstName: "علی",
        lastName: "رضایی",
        mobileNumber: "0912",
        nationalId: "1234567890",
        bitmojiCode: "",
        notes: "",
      });
      const payload = mock.post.mock.calls[0][1] as Record<string, unknown>;
      expect(payload).not.toHaveProperty("bitmojiCode");
    });
  });

  describe("updateCustomer", () => {
    it("sends PUT with correct endpoint", async () => {
      mock.put.mockResolvedValue({ data: { id: 1 } });
      await updateCustomer(1, { firstName: "علی جدید" });
      expect(mock.put).toHaveBeenCalledWith("/customers/1/", { firstName: "علی جدید" });
    });
  });

  describe("deleteCustomer", () => {
    it("sends DELETE to correct endpoint", async () => {
      mock.delete.mockResolvedValue({ data: {} });
      await deleteCustomer(1);
      expect(mock.delete).toHaveBeenCalledWith("/customers/1/");
    });
  });

  describe("status mapping", () => {
    it("maps isNewCustomer to 'new'", async () => {
      mock.get.mockResolvedValue({
        data: {
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              id: 1,
              firstName: "تست",
              isNewCustomer: true,
              isLoyalCustomer: false,
              visitNumber: 0,
            },
          ],
        },
      });
      const result = await listCustomers();
      expect(result.data[0].status).toBe("new");
    });

    it("maps isLoyalCustomer to 'loyal'", async () => {
      mock.get.mockResolvedValue({
        data: {
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              id: 1,
              firstName: "تست",
              isNewCustomer: false,
              isLoyalCustomer: true,
              visitNumber: 10,
            },
          ],
        },
      });
      const result = await listCustomers();
      expect(result.data[0].status).toBe("loyal");
    });

    it("maps zero visits to 'inactive'", async () => {
      mock.get.mockResolvedValue({
        data: {
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              id: 1,
              firstName: "تست",
              isNewCustomer: false,
              isLoyalCustomer: false,
              visitNumber: 0,
            },
          ],
        },
      });
      const result = await listCustomers();
      expect(result.data[0].status).toBe("inactive");
    });

    it("maps non-zero visits to 'active'", async () => {
      mock.get.mockResolvedValue({
        data: {
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              id: 1,
              firstName: "تست",
              isNewCustomer: false,
              isLoyalCustomer: false,
              visitNumber: 3,
            },
          ],
        },
      });
      const result = await listCustomers();
      expect(result.data[0].status).toBe("active");
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `pnpm test:unit src/services/__tests__/customers.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/services/__tests__/customers.test.ts
git commit -m "test: add service unit tests for customers"
```

---

### Task 2: Service Unit Tests — Visits

**Covers:** Verifies `visits.ts` sends correct payloads, maps responses, and handles date/time conversion

**Files:**

- Create: `src/services/__tests__/visits.test.ts`

**Interfaces:**

- Consumes: `apiClient` (mocked)
- Produces: Verified request payloads, correct status mapping, date/time extraction

- [ ] **Step 1: Write tests for `visits.ts`**

```typescript
import { describe, expect, it, vi, beforeEach } from "vitest";
import * as apiClient from "../../lib/api-client";
import {
  listVisits,
  getVisit,
  confirmVisit,
  completeVisit,
  cancelVisit,
  reserveVisit,
  updateVisit,
  deleteVisit,
} from "../visits";

vi.mock("../../lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mock = vi.mocked(apiClient.apiClient);

describe("visits service", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("listVisits", () => {
    it("sends correct params and maps response", async () => {
      mock.get.mockResolvedValue({
        data: {
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              id: 1,
              customer: 10,
              customerName: "علی رضایی",
              customerMobile: "0912",
              staff: null,
              services: [1, 2],
              serviceNames: ["کوتاهی مو", "رنگ مو"],
              startAt: "2026-06-15 10:00:00",
              endAt: "2026-06-15 11:30:00",
              status: "confirmed",
              notes: "یادداشت تست",
            },
          ],
        },
      });

      const result = await listVisits({ page: 1, perPage: 50 });

      expect(mock.get).toHaveBeenCalledWith("/visits/", {
        params: {
          page: 1,
          per_page: 50,
          status: undefined,
          dateFrom: undefined,
          dateTo: undefined,
          month: undefined,
          year: undefined,
        },
      });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].customerName).toBe("علی رضایی");
      expect(result.data[0].services).toEqual([1, 2]);
      expect(result.data[0].serviceNames).toEqual(["کوتاهی مو", "رنگ مو"]);
      expect(result.data[0].status).toBe("confirmed");
      expect(result.data[0].notes).toBe("یادداشت تست");
    });

    it("computes duration from startAt/endAt", async () => {
      mock.get.mockResolvedValue({
        data: {
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              id: 1,
              customer: 10,
              startAt: "2026-06-15 10:00:00",
              endAt: "2026-06-15 11:30:00",
              status: "pending",
            },
          ],
        },
      });

      const result = await listVisits();
      expect(result.data[0].duration).toBe(90);
    });
  });

  describe("getVisit", () => {
    it("fetches single visit", async () => {
      mock.get.mockResolvedValue({
        data: {
          id: 1,
          customer: 10,
          customerName: "علی",
          startAt: "2026-06-15 10:00:00",
          endAt: "2026-06-15 11:00:00",
          status: "completed",
        },
      });
      const result = await getVisit(1);
      expect(mock.get).toHaveBeenCalledWith("/visits/1/");
      expect(result.id).toBe(1);
      expect(result.status).toBe("completed");
    });
  });

  describe("status transitions", () => {
    it("confirmVisit sends POST to /confirm/", async () => {
      mock.post.mockResolvedValue({ data: {} });
      await confirmVisit(1);
      expect(mock.post).toHaveBeenCalledWith("/visits/1/confirm/");
    });

    it("completeVisit sends POST to /complete/", async () => {
      mock.post.mockResolvedValue({ data: {} });
      await completeVisit(1);
      expect(mock.post).toHaveBeenCalledWith("/visits/1/complete/");
    });

    it("cancelVisit sends POST to /cancel/", async () => {
      mock.post.mockResolvedValue({ data: {} });
      await cancelVisit(1);
      expect(mock.post).toHaveBeenCalledWith("/visits/1/cancel/");
    });
  });

  describe("reserveVisit", () => {
    it("sends POST with correct payload", async () => {
      mock.post.mockResolvedValue({ data: { id: 1 } });
      await reserveVisit({
        customer: 10,
        services: [1, 2],
        date: "2026-06-15",
        time: "10:00",
        notes: "test",
      });
      expect(mock.post).toHaveBeenCalledWith("/visits/reserve/", {
        customer: 10,
        services: [1, 2],
        date: "2026-06-15",
        time: "10:00",
        notes: "test",
      });
    });
  });

  describe("updateVisit", () => {
    it("sends PATCH with correct payload", async () => {
      mock.patch.mockResolvedValue({ data: {} });
      await updateVisit(1, { services: [3], date: "2026-06-20", time: "14:00" });
      expect(mock.patch).toHaveBeenCalledWith("/visits/1/", {
        services: [3],
        date: "2026-06-20",
        time: "14:00",
      });
    });
  });

  describe("deleteVisit", () => {
    it("sends DELETE to correct endpoint", async () => {
      mock.delete.mockResolvedValue({ data: {} });
      await deleteVisit(1);
      expect(mock.delete).toHaveBeenCalledWith("/visits/1/");
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `pnpm test:unit src/services/__tests__/visits.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/services/__tests__/visits.test.ts
git commit -m "test: add service unit tests for visits"
```

---

### Task 3: Service Unit Tests — Services, Payments, Products

**Covers:** Verifies `services.ts`, `payments.ts`, `products.ts` send correct backend payloads with field name mapping

**Files:**

- Create: `src/services/__tests__/services.test.ts`
- Create: `src/services/__tests__/payments.test.ts`
- Create: `src/services/__tests__/products.test.ts`

**Interfaces:**

- Consumes: `apiClient` (mocked)
- Produces: Verified backend field mapping (title→name, duration→time, stock→count, etc.)

- [ ] **Step 1: Write tests for `services.ts`**

```typescript
import { describe, expect, it, vi, beforeEach } from "vitest";
import * as apiClient from "../../lib/api-client";
import { listServices, getService, createService, updateService, deleteService } from "../services";

vi.mock("../../lib/api-client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const mock = vi.mocked(apiClient.apiClient);

describe("services service", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("createService", () => {
    it("maps title→name and duration→time for backend", async () => {
      mock.post.mockResolvedValue({
        data: { id: 1, name: "کوتاهی مو", time: 30, price: "150000", is_active: true },
      });
      await createService({
        title: "کوتاهی مو",
        duration: 30,
        price: 150000,
        description: "",
        isActive: true,
      });
      expect(mock.post).toHaveBeenCalledWith("/services/", {
        name: "کوتاهی مو",
        time: 30,
        price: 150000,
        description: "",
        is_active: true,
      });
    });
  });

  describe("updateService", () => {
    it("maps fields correctly for PUT", async () => {
      mock.put.mockResolvedValue({ data: { id: 1 } });
      await updateService(1, { title: "رنگ مو", duration: 60, price: 300000 });
      expect(mock.put).toHaveBeenCalledWith("/services/1/", {
        name: "رنگ مو",
        time: 60,
        price: 300000,
        description: "",
        is_active: true,
      });
    });
  });

  describe("getService", () => {
    it("maps backend name→title and time→duration", async () => {
      mock.get.mockResolvedValue({
        data: { id: 1, name: "کوتاهی مو", time: 30, price: "150000", is_active: true },
      });
      const result = await getService(1);
      expect(result.title).toBe("کوتاهی مو");
      expect(result.duration).toBe(30);
      expect(result.price).toBe(150000);
      expect(result.isActive).toBe(true);
    });
  });

  it("deleteService sends DELETE", async () => {
    mock.delete.mockResolvedValue({ data: {} });
    await deleteService(1);
    expect(mock.delete).toHaveBeenCalledWith("/services/1/");
  });
});
```

- [ ] **Step 2: Write tests for `payments.ts`**

```typescript
import { describe, expect, it, vi, beforeEach } from "vitest";
import * as apiClient from "../../lib/api-client";
import { listPayments, getPayment, createPayment, getPaymentsByService } from "../payments";

vi.mock("../../lib/api-client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
}));

const mock = vi.mocked(apiClient.apiClient);

describe("payments service", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("createPayment", () => {
    it("maps patientId→customer and paymentMethod→payment_method", async () => {
      mock.post.mockResolvedValue({ data: { id: 1 } });
      await createPayment({
        patientId: 10,
        visitId: 5,
        amount: 200000,
        paymentMethod: "card",
        date: "2026-06-15",
        description: "پرداخت کارتی",
      });
      expect(mock.post).toHaveBeenCalledWith("/payments/", {
        customer: 10,
        visit: 5,
        amount: 200000,
        payment_method: "card",
        paid_at: "2026-06-15",
        notes: "پرداخت کارتی",
      });
    });

    it("defaults invalid payment method to cash", async () => {
      mock.post.mockResolvedValue({ data: { id: 1 } });
      await createPayment({ patientId: 10, amount: 100000, paymentMethod: "invalid_method" });
      const payload = mock.post.mock.calls[0][1] as Record<string, unknown>;
      expect(payload.payment_method).toBe("cash");
    });

    it("accepts cash, card, transfer methods", async () => {
      mock.post.mockResolvedValue({ data: { id: 1 } });
      for (const method of ["cash", "card", "transfer"]) {
        await createPayment({ patientId: 10, amount: 100000, paymentMethod: method });
        const payload = mock.post.mock.calls[mock.post.mock.calls.length - 1][1] as Record<
          string,
          unknown
        >;
        expect(payload.payment_method).toBe(method);
      }
    });
  });

  describe("getPayment", () => {
    it("maps backend response to Transaction", async () => {
      mock.get.mockResolvedValue({
        data: {
          id: 1,
          customerName: "علی رضایی",
          amount: "200000",
          paymentMethod: "card",
          paidAt: "2026-06-15",
          notes: "test",
        },
      });
      const result = await getPayment(1);
      expect(result.patient).toBe("علی رضایی");
      expect(result.amount).toBe(200000);
      expect(result.paymentMethod).toBe("card");
      expect(result.description).toBe("test");
    });
  });

  describe("listPayments", () => {
    it("sends dateFrom and dateTo params", async () => {
      mock.get.mockResolvedValue({ data: { count: 0, next: null, previous: null, results: [] } });
      await listPayments({ dateFrom: "2026-06-01", dateTo: "2026-06-30" });
      expect(mock.get).toHaveBeenCalledWith("/payments/", {
        params: expect.objectContaining({ dateFrom: "2026-06-01", dateTo: "2026-06-30" }),
      });
    });
  });
});
```

- [ ] **Step 3: Write tests for `products.ts`**

```typescript
import { describe, expect, it, vi, beforeEach } from "vitest";
import * as apiClient from "../../lib/api-client";
import { listProducts, getProduct, createProduct, updateProduct, deleteProduct } from "../products";

vi.mock("../../lib/api-client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const mock = vi.mocked(apiClient.apiClient);

describe("products service", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("createProduct", () => {
    it("maps stock→count and unitPrice→unit_price", async () => {
      mock.post.mockResolvedValue({
        data: { id: 1, name: "شامپو", count: 10, unit_price: "50000" },
      });
      await createProduct({
        name: "شامپو",
        stock: 10,
        unit: "عدد",
        unitPrice: 50000,
        description: "",
      });
      expect(mock.post).toHaveBeenCalledWith("/inventory/products/", {
        name: "شامپو",
        count: 10,
        unit: "عدد",
        unit_price: 50000,
        description: "",
      });
    });
  });

  describe("updateProduct", () => {
    it("maps fields correctly for PUT", async () => {
      mock.put.mockResolvedValue({ data: { id: 1 } });
      await updateProduct(1, { name: "شامپو", stock: 20, unitPrice: 60000 });
      expect(mock.put).toHaveBeenCalledWith("/inventory/products/1/", {
        name: "شامپو",
        count: 20,
        unit: "",
        unit_price: 60000,
        description: "",
      });
    });
  });

  describe("getProduct", () => {
    it("maps backend count→stock", async () => {
      mock.get.mockResolvedValue({
        data: {
          id: 1,
          name: "شامپو",
          count: 10,
          unit: "عدد",
          unit_price: "50000",
          status: "available",
        },
      });
      const result = await getProduct(1);
      expect(result.stock).toBe(10);
      expect(result.unitPrice).toBe("50000");
      expect(result.status).toBe("available");
    });
  });

  it("deleteProduct sends DELETE", async () => {
    mock.delete.mockResolvedValue({ data: {} });
    await deleteProduct(1);
    expect(mock.delete).toHaveBeenCalledWith("/inventory/products/1/");
  });
});
```

- [ ] **Step 4: Run all three test files**

Run: `pnpm test:unit src/services/__tests__/services.test.ts src/services/__tests__/payments.test.ts src/services/__tests__/products.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/__tests__/
git commit -m "test: add service unit tests for services, payments, and products"
```

---

### Task 4: Service Unit Tests — Auth, Dashboard, Reports, WorkTime, Logs

**Covers:** Remaining 5 service files with unit tests

**Files:**

- Create: `src/services/__tests__/auth.test.ts`
- Create: `src/services/__tests__/dashboard.test.ts`
- Create: `src/services/__tests__/reports.test.ts`
- Create: `src/services/__tests__/work-time.test.ts`
- Create: `src/services/__tests__/logs.test.ts`

- [ ] **Step 1: Write tests for `auth.ts`**

```typescript
import { describe, expect, it, vi, beforeEach } from "vitest";
import * as apiClient from "../../lib/api-client";
import {
  login,
  logout,
  getMe,
  listEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} from "../auth";

vi.mock("../../lib/api-client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const mock = vi.mocked(apiClient.apiClient);

describe("auth service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("login sends POST with credentials", async () => {
    mock.post.mockResolvedValue({ data: {} });
    await login("admin", "pass123");
    expect(mock.post).toHaveBeenCalledWith("/auth/token/", {
      username: "admin",
      password: "pass123",
    });
  });

  it("logout sends POST", async () => {
    mock.post.mockResolvedValue({ data: {} });
    await logout();
    expect(mock.post).toHaveBeenCalledWith("/auth/logout/");
  });

  it("getMe returns AuthUser", async () => {
    mock.get.mockResolvedValue({ data: { id: 1, username: "admin", role: "admin" } });
    const result = await getMe();
    expect(result.id).toBe(1);
    expect(result.username).toBe("admin");
  });

  it("listEmployees handles array response", async () => {
    mock.get.mockResolvedValue({
      data: [
        { id: 1, username: "admin" },
        { id: 2, username: "user1" },
      ],
    });
    const result = await listEmployees();
    expect(result).toHaveLength(2);
  });

  it("listEmployees handles DRF paginated response", async () => {
    mock.get.mockResolvedValue({ data: { results: [{ id: 1, username: "admin" }] } });
    const result = await listEmployees();
    expect(result).toHaveLength(1);
  });

  it("listEmployees returns empty array on unexpected shape", async () => {
    mock.get.mockResolvedValue({ data: "unexpected" });
    const result = await listEmployees();
    expect(result).toEqual([]);
  });

  it("createEmployee sends POST", async () => {
    mock.post.mockResolvedValue({ data: {} });
    await createEmployee({ username: "new", password: "pass" });
    expect(mock.post).toHaveBeenCalledWith("/auth/employees/", {
      username: "new",
      password: "pass",
    });
  });

  it("updateEmployee sends PUT", async () => {
    mock.put.mockResolvedValue({ data: {} });
    await updateEmployee(1, { username: "updated" });
    expect(mock.put).toHaveBeenCalledWith("/auth/employees/1/", { username: "updated" });
  });

  it("deleteEmployee sends DELETE", async () => {
    mock.delete.mockResolvedValue({ data: {} });
    await deleteEmployee(1);
    expect(mock.delete).toHaveBeenCalledWith("/auth/employees/1/");
  });
});
```

- [ ] **Step 2: Write tests for `dashboard.ts`**

```typescript
import { describe, expect, it, vi, beforeEach } from "vitest";
import * as apiClient from "../../lib/api-client";
import { getDashboardStats } from "../dashboard";

vi.mock("../../lib/api-client", () => ({
  apiClient: { get: vi.fn() },
}));

const mock = vi.mocked(apiClient.apiClient);

describe("dashboard service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches and maps dashboard stats", async () => {
    mock.get.mockResolvedValue({
      data: {
        customerCount: 100,
        loyalCustomerCount: 30,
        todaySales: "5000000",
        todayVisits: 12,
        newCustomers: 5,
      },
    });
    const result = await getDashboardStats();
    expect(result.customerCount).toBe(100);
    expect(result.loyalCustomerCount).toBe(30);
    expect(result.todaySales).toBe(5000000);
    expect(result.todayVisits).toBe(12);
    expect(result.newCustomers).toBe(5);
  });

  it("defaults missing fields to zero", async () => {
    mock.get.mockResolvedValue({ data: {} });
    const result = await getDashboardStats();
    expect(result.customerCount).toBe(0);
    expect(result.loyalCustomerCount).toBe(0);
    expect(result.todaySales).toBe(0);
    expect(result.todayVisits).toBe(0);
    expect(result.newCustomers).toBe(0);
  });
});
```

- [ ] **Step 3: Write tests for `reports.ts`**

```typescript
import { describe, expect, it, vi, beforeEach } from "vitest";
import * as apiClient from "../../lib/api-client";
import { getAllReports, getFilteredReports, getVisitReports, getReferralReports } from "../reports";

vi.mock("../../lib/api-client", () => ({
  apiClient: { get: vi.fn() },
}));

const mock = vi.mocked(apiClient.apiClient);

describe("reports service", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("getAllReports", () => {
    it("maps backend response to ReportsData", async () => {
      mock.get.mockResolvedValue({
        data: {
          totalCustomers: 50,
          totalSales: 10000000,
          totalVisits: 120,
          avgSatisfaction: 4.5,
          salesChart: { monthly: [{ period: "2026-01", total: 5000000 }] },
          customerStatus: { pending: 10, confirmed: 20, completed: 80, canceled: 10 },
          servicePopularity: [{ id: 1, name: "کوتاهی مو", usage: 50 }],
        },
      });

      const result = await getAllReports();
      expect(result.customerCount).toBe(50);
      expect(result.totalRevenue).toBe(10000000);
      expect(result.totalVisits).toBe(120);
      expect(result.avgSatisfaction).toBe(4.5);
      expect(result.monthlyRevenue).toEqual([{ month: "2026-01", revenue: 5000000 }]);
      expect(result.appointmentStats).toHaveLength(4);
      expect(result.serviceCategoryStats).toEqual([{ name: "کوتاهی مو", value: 50 }]);
    });
  });

  describe("getFilteredReports", () => {
    it("sends dateFrom/dateTo params", async () => {
      mock.get.mockResolvedValue({
        data: { totalSales: 0, totalVisits: 0, salesChart: {}, servicePopularity: [] },
      });
      await getFilteredReports("2026-06-01", "2026-06-30");
      expect(mock.get).toHaveBeenCalledWith("/reports/", {
        params: { dateFrom: "2026-06-01", dateTo: "2026-06-30" },
      });
    });
  });

  describe("getVisitReports", () => {
    it("maps monthly visit data", async () => {
      mock.get.mockResolvedValue({ data: { monthly: [{ period: "2026-01", count: 15 }] } });
      const result = await getVisitReports();
      expect(result).toEqual([{ month: "2026-01", visits: 15 }]);
    });
  });

  describe("getReferralReports", () => {
    it("extracts referral rate", async () => {
      mock.get.mockResolvedValue({
        data: { referralRate: 0.75, newCustomers: 10, returningCustomers: 30 },
      });
      const result = await getReferralReports();
      expect(result.referralRate).toBe(0.75);
    });
  });
});
```

- [ ] **Step 4: Write tests for `work-time.ts`**

```typescript
import { describe, expect, it, vi, beforeEach } from "vitest";
import * as apiClient from "../../lib/api-client";
import { getWorkTime, createWorkTime, updateWorkTime } from "../work-time";

vi.mock("../../lib/api-client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));

const mock = vi.mocked(apiClient.apiClient);

describe("work-time service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("getWorkTime returns first record or null", async () => {
    mock.get.mockResolvedValue({ data: [{ id: 1, startTime: "08:00", endTime: "17:00" }] });
    const result = await getWorkTime();
    expect(result).toEqual({ id: 1, startTime: "08:00", endTime: "17:00" });
  });

  it("getWorkTime returns null on empty array", async () => {
    mock.get.mockResolvedValue({ data: [] });
    const result = await getWorkTime();
    expect(result).toBeNull();
  });

  it("createWorkTime sends POST", async () => {
    mock.post.mockResolvedValue({ data: { id: 1 } });
    await createWorkTime({ startTime: "08:00", endTime: "17:00" });
    expect(mock.post).toHaveBeenCalledWith("/work-time/", { startTime: "08:00", endTime: "17:00" });
  });

  it("updateWorkTime sends PUT with id", async () => {
    mock.put.mockResolvedValue({ data: { id: 1 } });
    await updateWorkTime(1, { startTime: "09:00", endTime: "18:00" });
    expect(mock.put).toHaveBeenCalledWith("/work-time/1/", {
      startTime: "09:00",
      endTime: "18:00",
    });
  });
});
```

- [ ] **Step 5: Write tests for `logs.ts`**

```typescript
import { describe, expect, it, vi, beforeEach } from "vitest";
import * as apiClient from "../../lib/api-client";
import { listLogs, getLog } from "../logs";

vi.mock("../../lib/api-client", () => ({
  apiClient: { get: vi.fn() },
}));

const mock = vi.mocked(apiClient.apiClient);

describe("logs service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("listLogs sends correct params", async () => {
    mock.get.mockResolvedValue({ data: { count: 0, next: null, previous: null, results: [] } });
    await listLogs({ page: 1, perPage: 30 });
    expect(mock.get).toHaveBeenCalledWith("/logs/", {
      params: { page: 1, per_page: 30, search: undefined },
    });
  });

  it("getLog fetches single log", async () => {
    mock.get.mockResolvedValue({
      data: {
        id: 1,
        user: 1,
        username: "admin",
        action: "CREATE",
        modelName: "Customer",
        objectId: 1,
        objectRepr: "test",
        changes: null,
        timestamp: "2026-06-15T10:00:00Z",
      },
    });
    const result = await getLog(1);
    expect(result.id).toBe(1);
    expect(result.action).toBe("CREATE");
  });
});
```

- [ ] **Step 6: Run all service tests**

Run: `pnpm test:unit src/services/__tests__/`
Expected: PASS (all 6 service test files)

- [ ] **Step 7: Commit**

```bash
git add src/services/__tests__/
git commit -m "test: add service unit tests for auth, dashboard, reports, work-time, logs"
```

---

### Task 5: API Client Interceptor Tests

**Covers:** Verifies the snake_case↔camelCase interceptors work correctly on real request/response flows

**Files:**

- Modify: `src/lib/__tests__/api-client.test.ts` (expand existing)

- [ ] **Step 1: Rewrite api-client test to cover interceptors**

```typescript
import { describe, expect, it, vi, beforeEach } from "vitest";

const mockToCamelCase = vi.fn((data) => data);
const mockToSnakeCase = vi.fn((data) => data);

vi.mock("../transform", () => ({
  toCamelCase: mockToCamelCase,
  toSnakeCase: mockToSnakeCase,
}));

let requestInterceptor: ((config: Record<string, unknown>) => Record<string, unknown>) | null =
  null;
let responseInterceptor: ((response: Record<string, unknown>) => Record<string, unknown>) | null =
  null;

const mockCreate = vi.fn(() => ({
  interceptors: {
    request: {
      use: vi.fn((handler: (config: Record<string, unknown>) => Record<string, unknown>) => {
        requestInterceptor = handler;
      }),
    },
    response: {
      use: vi.fn((handler: (response: Record<string, unknown>) => Record<string, unknown>) => {
        responseInterceptor = handler;
      }),
    },
  },
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("axios", () => ({ default: { create: mockCreate } }));

describe("api-client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requestInterceptor = null;
    responseInterceptor = null;
  });

  it("creates axios instance with correct config", async () => {
    mockCreate.mockClear();
    await import("../api-client");
    expect(mockCreate).toHaveBeenCalledWith({
      baseURL: "http://localhost:8000/api",
      withCredentials: true,
      headers: { "Content-Type": "application/json" },
    });
  });

  it("request interceptor converts to snake_case", async () => {
    await import("../api-client");
    expect(requestInterceptor).not.toBeNull();

    const config = { data: { firstName: "علی", lastName: "رضایی" } };
    mockToSnakeCase.mockReturnValue({ first_name: "علی", last_name: "رضایی" });

    const result = requestInterceptor!(config);
    expect(mockToSnakeCase).toHaveBeenCalledWith({ firstName: "علی", lastName: "رضایی" });
    expect(result.data).toEqual({ first_name: "علی", last_name: "رضایی" });
  });

  it("response interceptor converts to camelCase", async () => {
    await import("../api-client");
    expect(responseInterceptor).not.toBeNull();

    const response = { data: { first_name: "علی", last_name: "رضایی" } };
    mockToCamelCase.mockReturnValue({ firstName: "علی", lastName: "رضایی" });

    const result = responseInterceptor!(response);
    expect(mockToCamelCase).toHaveBeenCalledWith({ first_name: "علی", last_name: "رضایی" });
    expect(result.data).toEqual({ firstName: "علی", lastName: "رضایی" });
  });

  it("request interceptor skips snake_case for non-data requests", async () => {
    await import("../api-client");
    const config = { params: { firstName: "علی" } };
    const result = requestInterceptor!(config);
    expect(mockToSnakeCase).not.toHaveBeenCalled();
    expect(result.params).toEqual({ firstName: "علی" });
  });
});
```

- [ ] **Step 2: Run test**

Run: `pnpm test:unit src/lib/__tests__/api-client.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/__tests__/api-client.test.ts
git commit -m "test: expand api-client interceptor tests"
```

---

### Task 6: React Query Hook Integration Tests

**Covers:** Verifies React Query hooks call correct service functions and handle success/error states

**Files:**

- Create: `src/hooks/api/__tests__/useCustomersQuery.test.tsx`
- Create: `src/hooks/api/__tests__/useVisitsQuery.test.tsx`
- Create: `src/hooks/api/__tests__/useServicesQuery.test.tsx`

**Interfaces:**

- Consumes: Service functions (mocked), QueryClientProvider, ToastProvider
- Produces: Verified hook behavior (query calls, mutation calls, cache invalidation)

- [ ] **Step 1: Write test for `useCustomersQuery`**

```tsx
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../../../components/ui", () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }),
}));

import * as customersService from "../../../services/customers";
import {
  useCustomersList,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
} from "../useCustomersQuery";

vi.mock("../../../services/customers", () => ({
  listCustomers: vi.fn(),
  getCustomer: vi.fn(),
  createCustomer: vi.fn(),
  updateCustomer: vi.fn(),
  deleteCustomer: vi.fn(),
}));

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useCustomersQuery hooks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("useCustomersList calls listCustomers", async () => {
    vi.mocked(customersService.listCustomers).mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      perPage: 20,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    });
    const { result } = renderHook(() => useCustomersList(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(customersService.listCustomers).toHaveBeenCalled();
  });

  it("useCreateCustomer calls createCustomer and returns data", async () => {
    vi.mocked(customersService.createCustomer).mockResolvedValue({ data: { id: 1 } } as never);
    const { result } = renderHook(() => useCreateCustomer(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.mutateAsync({
        firstName: "علی",
        lastName: "رضایی",
        mobileNumber: "0912",
        nationalId: "1234567890",
        bitmojiCode: "",
        notes: "",
      });
    });
    expect(customersService.createCustomer).toHaveBeenCalled();
  });

  it("useUpdateCustomer calls updateCustomer with id", async () => {
    vi.mocked(customersService.updateCustomer).mockResolvedValue({ data: {} } as never);
    const { result } = renderHook(() => useUpdateCustomer(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.mutateAsync({ id: 1, data: { firstName: "جدید" } });
    });
    expect(customersService.updateCustomer).toHaveBeenCalledWith(1, { firstName: "جدید" });
  });

  it("useDeleteCustomer calls deleteCustomer with id", async () => {
    vi.mocked(customersService.deleteCustomer).mockResolvedValue({ data: {} } as never);
    const { result } = renderHook(() => useDeleteCustomer(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.mutateAsync(1);
    });
    expect(customersService.deleteCustomer).toHaveBeenCalledWith(1);
  });
});
```

- [ ] **Step 2: Write test for `useVisitsQuery`**

```tsx
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../../../components/ui", () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }),
}));

import * as visitsService from "../../../services/visits";
import {
  useVisitsList,
  useReserveVisit,
  useConfirmVisit,
  useCompleteVisit,
  useCancelVisit,
} from "../useVisitsQuery";

vi.mock("../../../services/visits", () => ({
  listVisits: vi.fn(),
  getVisit: vi.fn(),
  confirmVisit: vi.fn(),
  completeVisit: vi.fn(),
  cancelVisit: vi.fn(),
  reserveVisit: vi.fn(),
  updateVisit: vi.fn(),
  deleteVisit: vi.fn(),
}));

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useVisitsQuery hooks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("useVisitsList calls listVisits", async () => {
    vi.mocked(visitsService.listVisits).mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      perPage: 50,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    });
    const { result } = renderHook(() => useVisitsList(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(visitsService.listVisits).toHaveBeenCalled();
  });

  it("useReserveVisit calls reserveVisit", async () => {
    vi.mocked(visitsService.reserveVisit).mockResolvedValue({ data: { id: 1 } } as never);
    const { result } = renderHook(() => useReserveVisit(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.mutateAsync({
        customer: 10,
        services: [1],
        date: "2026-06-15",
        time: "10:00",
      });
    });
    expect(visitsService.reserveVisit).toHaveBeenCalledWith({
      customer: 10,
      services: [1],
      date: "2026-06-15",
      time: "10:00",
    });
  });

  it("useConfirmVisit calls confirmVisit with id", async () => {
    vi.mocked(visitsService.confirmVisit).mockResolvedValue({ data: {} } as never);
    const { result } = renderHook(() => useConfirmVisit(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.mutateAsync(1);
    });
    expect(visitsService.confirmVisit).toHaveBeenCalledWith(1);
  });

  it("useCompleteVisit calls completeVisit with id", async () => {
    vi.mocked(visitsService.completeVisit).mockResolvedValue({ data: {} } as never);
    const { result } = renderHook(() => useCompleteVisit(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.mutateAsync(1);
    });
    expect(visitsService.completeVisit).toHaveBeenCalledWith(1);
  });

  it("useCancelVisit calls cancelVisit with id", async () => {
    vi.mocked(visitsService.cancelVisit).mockResolvedValue({ data: {} } as never);
    const { result } = renderHook(() => useCancelVisit(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.mutateAsync(1);
    });
    expect(visitsService.cancelVisit).toHaveBeenCalledWith(1);
  });
});
```

- [ ] **Step 3: Write test for `useServicesQuery`**

```tsx
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../../../components/ui", () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }),
}));

import * as servicesService from "../../../services/services";
import {
  useServicesList,
  useCreateService,
  useUpdateService,
  useDeleteService,
} from "../useServicesQuery";

vi.mock("../../../services/services", () => ({
  listServices: vi.fn(),
  getService: vi.fn(),
  createService: vi.fn(),
  updateService: vi.fn(),
  deleteService: vi.fn(),
}));

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useServicesQuery hooks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("useServicesList calls listServices", async () => {
    vi.mocked(servicesService.listServices).mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      perPage: 20,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    });
    const { result } = renderHook(() => useServicesList(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(servicesService.listServices).toHaveBeenCalled();
  });

  it("useCreateService calls createService", async () => {
    vi.mocked(servicesService.createService).mockResolvedValue({ id: 1 } as never);
    const { result } = renderHook(() => useCreateService(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.mutateAsync({ title: "کوتاهی مو", duration: 30 });
    });
    expect(servicesService.createService).toHaveBeenCalled();
  });

  it("useDeleteService calls deleteService with id", async () => {
    vi.mocked(servicesService.deleteService).mockResolvedValue({ data: {} } as never);
    const { result } = renderHook(() => useDeleteService(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.mutateAsync(1);
    });
    expect(servicesService.deleteService).toHaveBeenCalledWith(1);
  });
});
```

- [ ] **Step 4: Create test directory and run**

Run: `pnpm test:unit src/hooks/api/__tests__/`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/api/__tests__/
git commit -m "test: add React Query hook integration tests"
```

---

### Task 7: Run Full Test Suite and Fix Any Issues

**Covers:** Final verification — all tests pass with zero errors and zero warnings

- [ ] **Step 1: Run full test suite**

Run: `pnpm test:unit`
Expected: All tests PASS, no warnings

- [ ] **Step 2: Fix any failing tests or warnings**

Address any issues found in Step 1.

- [ ] **Step 3: Commit fixes if needed**

```bash
git add -A
git commit -m "fix: resolve test failures and warnings"
```
