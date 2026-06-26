import type { PaginationParams } from "./pagination";

export const queryKeys = {
  auth: {
    me: ["auth", "me"] as const,
    employees: ["auth", "employees"] as const,
  },
  customers: {
    all: ["customers"] as const,
    list: (params?: PaginationParams) => ["customers", "list", params] as const,
    detail: (id: number) => ["customers", id] as const,
  },
  visits: {
    all: ["visits"] as const,
    list: (params?: Record<string, unknown>) => ["visits", "list", params] as const,
    detail: (id: number) => ["visits", id] as const,
  },
  payments: {
    all: ["payments"] as const,
    list: (params?: Record<string, unknown>) => ["payments", "list", params] as const,
    detail: (id: number) => ["payments", id] as const,
    byService: (dateFrom?: string, dateTo?: string) =>
      ["payments", "byService", dateFrom, dateTo] as const,
  },
  products: {
    all: ["products"] as const,
    list: (params?: PaginationParams) => ["products", "list", params] as const,
    detail: (id: number) => ["products", id] as const,
  },
  services: {
    all: ["services"] as const,
    list: (params?: PaginationParams) => ["services", "list", params] as const,
    detail: (id: number) => ["services", id] as const,
  },
  reports: {
    all: ["reports", "all"] as const,
    filtered: (dateFrom?: string, dateTo?: string) =>
      ["reports", "filtered", dateFrom, dateTo] as const,
    customers: ["reports", "customers"] as const,
    visits: ["reports", "visits"] as const,
    referral: ["reports", "referral"] as const,
  },
  dashboard: {
    stats: ["dashboard", "stats"] as const,
  },
  workTime: {
    all: ["workTime"] as const,
  },
} as const;
