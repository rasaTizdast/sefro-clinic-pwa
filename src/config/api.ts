export const API_BASE_URL: string = import.meta.env.VITE_API_URL ?? "";

export const API_PREFIX = "/api";

export const API_URL = `${API_BASE_URL}${API_PREFIX}`;

export const endpoints = {
  auth: {
    token: "/auth/token/",
    refresh: "/auth/token/refresh/",
    logout: "/auth/logout/",
    me: "/auth/me/",
    employees: "/auth/employees/",
    employeesList: "/auth/employees/list/",
    employee: (id: number) => `/auth/employees/${id}/`,
  },
  customers: {
    list: "/customers/",
    detail: (id: number) => `/customers/${id}/`,
  },
  visits: {
    list: "/visits/",
    detail: (id: number) => `/visits/${id}/`,
    confirm: (id: number) => `/visits/${id}/confirm/`,
    complete: (id: number) => `/visits/${id}/complete/`,
    cancel: (id: number) => `/visits/${id}/cancel/`,
    reserve: "/visits/reserve/",
  },
  products: {
    list: "/inventory/products/",
    detail: (id: number) => `/inventory/products/${id}/`,
  },
  services: {
    list: "/services/",
    detail: (id: number) => `/services/${id}/`,
  },
  reports: {
    all: "/reports/all/",
    filtered: "/reports/",
    customers: "/reports/customers/",
    visits: "/reports/visits/",
    referral: "/reports/referral/",
  },
  dashboard: {
    stats: "/dashboard/",
  },
  workTime: {
    list: "/work-time/",
    detail: (id: number) => `/work-time/${id}/`,
  },
  logs: {
    list: "/logs/",
    detail: (id: number) => `/logs/${id}/`,
  },
  sales: {
    list: "/finance/sales/",
    detail: (id: number) => `/finance/sales/${id}/`,
    refund: (id: number) => `/finance/sales/${id}/refund/`,
    checkout: "/finance/checkout/",
  },
  payments: {
    list: "/payments/",
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
    itemDetail: (id: number) => `/finance/package-items/${id}/`,
    services: "/finance/package-services/",
    serviceDetail: (id: number) => `/finance/package-services/${id}/`,
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
    purchaseDetail: (id: number) => `/finance/product-purchases/${id}/`,
    usages: "/finance/product-usages/",
    costHistory: "/finance/product-cost-history/",
    recordConsumption: (visitId: number) => `/finance/visits/${visitId}/record-consumption/`,
    welcomePacks: "/finance/welcome-packs/",
    welcomePackDetail: (id: number) => `/finance/welcome-packs/${id}/`,
    welcomePackIssue: (id: number) => `/finance/welcome-packs/${id}/issue/`,
    welcomePackUsages: "/finance/welcome-pack-usages/",
    welcomePackReport: "/finance/reports/welcome-packs/",
    financialSummary: "/finance/reports/financial-summary/",
    profitByService: "/finance/reports/profit-by-service/",
    profitByPackage: "/finance/reports/profit-by-package/",
    profitByStaff: "/finance/reports/profit-by-staff/",
    dashboard: "/finance/reports/dashboard/",
    operatingExpenses: "/finance/operating-expenses/",
    operatingExpenseDetail: (id: number) => `/finance/operating-expenses/${id}/`,
    operatingExpenseSummary: "/finance/operating-expenses/summary/",
    operatingExpenseCategories: "/finance/operating-expense-categories/",
    operatingExpenseCategoryDetail: (id: number) => `/finance/operating-expense-categories/${id}/`,
    // Staff expense claims: submit → approve → pay. Distinct from operating expenses.
    expenses: "/finance/expenses/",
    expenseDetail: (id: number) => `/finance/expenses/${id}/`,
    expenseAction: (id: number, action: "submit" | "approve" | "reject" | "pay") =>
      `/finance/expenses/${id}/${action}/`,
    expenseCategories: "/finance/expense-categories/",
    expenseCategoryDetail: (id: number) => `/finance/expense-categories/${id}/`,
  },
} as const;
