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
    customers: (dateFrom?: string, dateTo?: string) =>
      ["reports", "customers", dateFrom, dateTo] as const,
    visits: ["reports", "visits"] as const,
    referral: (dateFrom?: string, dateTo?: string) =>
      ["reports", "referral", dateFrom, dateTo] as const,
  },
  dashboard: {
    stats: ["dashboard", "stats"] as const,
  },
  workTime: {
    all: ["workTime"] as const,
  },
  logs: {
    all: ["logs"] as const,
    list: (params?: Record<string, unknown>) => ["logs", "list", params] as const,
    detail: (id: number) => ["logs", id] as const,
  },
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
  serviceItems: {
    all: ["serviceItems"] as const,
    list: (serviceId: number) => ["serviceItems", serviceId] as const,
  },
  finance: {
    exchangeRates: ["finance", "exchangeRates"] as const,
    currentRate: ["finance", "currentRate"] as const,
    backupRate: ["finance", "backupRate"] as const,
    financialSummary: (params?: Record<string, unknown>) =>
      ["finance", "financialSummary", params] as const,
    profitByService: (params?: Record<string, unknown>) =>
      ["finance", "profitByService", params] as const,
    profitByPackage: (params?: Record<string, unknown>) =>
      ["finance", "profitByPackage", params] as const,
    profitByStaff: (params?: Record<string, unknown>) =>
      ["finance", "profitByStaff", params] as const,
    dashboard: (params?: Record<string, unknown>) => ["finance", "dashboard", params] as const,
    purchases: (params?: Record<string, unknown>) => ["finance", "purchases", params] as const,
    usages: (params?: Record<string, unknown>) => ["finance", "usages", params] as const,
    costHistory: (productId: number) => ["finance", "costHistory", productId] as const,
    operatingExpenses: {
      list: (params?: Record<string, unknown>) =>
        ["finance", "operatingExpenses", "list", params] as const,
      categories: (params?: Record<string, unknown>) =>
        ["finance", "operatingExpenses", "categories", params] as const,
      summary: (params?: Record<string, unknown>) =>
        ["finance", "operatingExpenses", "summary", params] as const,
      detail: (id: number) => ["finance", "operatingExpenses", "detail", id] as const,
    },
  },
} as const;
