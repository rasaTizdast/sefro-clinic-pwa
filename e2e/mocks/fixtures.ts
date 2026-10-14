/**
 * Seed data for the contract-faithful mock backend. Self-contained (no `@/`
 * alias) so the pure contract handlers can be unit-tested without the Vite
 * alias resolver, matching the real backend shapes the frontend consumes.
 */

export interface MockCustomer {
  id: number;
  first_name: string;
  last_name: string;
  mobile_number: string;
  national_id: string;
  birthday: string | null;
  file_sys_id: string | null;
  notes: string;
  is_deleted: boolean;
}

export interface MockService {
  id: number;
  name: string;
  time: number;
  price: string;
  price_usd: string;
  compensation_role: "none" | "doctor" | "laser";
  description: string;
  is_active: boolean;
}

export interface MockVisit {
  id: number;
  customer: number;
  services: number[];
  staff: number | null;
  date: string;
  time: string;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELED";
  notes: string;
}

export interface MockSale {
  id: number;
  customer: number;
  visit: number | null;
  package: number | null;
  amount_usd: string;
  discount_usd: string;
  amount_toman: string;
  exchange_rate: string | null;
  status: "PAID";
  idempotency_key: string | null;
}

export interface MockExpense {
  id: number;
  category: number | null;
  category_name: string | null;
  amount_usd: string;
  amount_toman: string;
  description: string;
  status: "draft" | "submitted" | "approved" | "paid" | "rejected";
}

export const seedCustomer: MockCustomer = {
  id: 1,
  first_name: "علی",
  last_name: "رضایی",
  mobile_number: "09123456789",
  national_id: "1234567890",
  birthday: "1990-01-01",
  file_sys_id: "SYS001",
  notes: "",
  is_deleted: false,
};

export const seedServices: MockService[] = [
  {
    id: 1,
    name: "لیزر مو",
    time: 30,
    price: "150000",
    price_usd: "1.65",
    compensation_role: "doctor",
    description: "",
    is_active: true,
  },
  {
    id: 2,
    name: "مشاوره",
    time: 15,
    price: "50000",
    price_usd: "0.55",
    compensation_role: "none",
    description: "",
    is_active: true,
  },
];

export const seedVisit: MockVisit = {
  id: 1,
  customer: 1,
  services: [1],
  staff: null,
  date: "1405/05/20",
  time: "10:00",
  status: "PENDING",
  notes: "",
};

/** Fixed rate fixture — the mock must stay deterministic (plan constraint). */
export const FIXED_RATE = "91000";

/** The exact fa message the real service serializer emits for an explicit null. */
export const SERVICE_PRICE_USD_NULL_ERROR = "این مقدار نباید توهی باشد.";
