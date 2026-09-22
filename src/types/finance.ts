export type SaleStatus = "pending" | "paid" | "refunded" | "partially_refunded" | "cancelled";

export type PaymentMethod = "cash" | "cash_usd" | "cash_toman" | "card" | "wallet";

export type OperatingExpensePaymentMethod = "cash" | "card" | "bank_transfer" | "other";

export interface OperatingExpenseCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface OperatingExpense {
  id: number;
  category: number;
  categoryName: string | null;
  title: string;
  description: string;
  amountUsd: string;
  exchangeRate: string | null;
  amountToman: string;
  expenseDate: string;
  paymentMethod: OperatingExpensePaymentMethod;
  vendor: string;
  receipt: string | null;
  notes: string;
  createdBy: number | null;
  createdByName: string | null;
  idempotencyKey: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOperatingExpensePayload {
  category: number;
  title: string;
  description?: string;
  amountUsd: string;
  expenseDate: string;
  paymentMethod: OperatingExpensePaymentMethod;
  vendor?: string;
  receipt?: File | null;
  notes?: string;
  idempotencyKey: string;
}

export interface UpdateOperatingExpensePayload {
  category?: number;
  title?: string;
  description?: string;
  amountUsd?: string;
  expenseDate?: string;
  paymentMethod?: OperatingExpensePaymentMethod;
  vendor?: string;
  receipt?: File | null;
  notes?: string;
}

export interface CreateOperatingExpenseCategoryPayload {
  name: string;
  slug?: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateOperatingExpenseCategoryPayload {
  name?: string;
  slug?: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface OperatingExpenseListParams {
  page?: number;
  perPage?: number;
  search?: string;
  category?: number;
  paymentMethod?: OperatingExpensePaymentMethod;
  createdBy?: number;
  dateFrom?: string; // Gregorian YYYY-MM-DD
  dateTo?: string; // Gregorian YYYY-MM-DD
  ordering?:
    | "expense_date"
    | "-expense_date"
    | "amount_usd"
    | "-amount_usd"
    | "created_at"
    | "-created_at";
}

export interface OperatingExpenseSummaryQuery {
  period?: ReportPeriod;
  startDateJalali?: string;
  endDateJalali?: string;
}

export interface OperatingExpenseSummary {
  period: { start: string; end: string };
  totalUsd: string;
  totalToman: string;
  count: number;
  byCategory: {
    categoryId: number;
    categoryName: string;
    totalUsd: string;
    totalToman: string;
    count: number;
  }[];
  byPaymentMethod: {
    paymentMethod: OperatingExpensePaymentMethod;
    totalUsd: string;
    count: number;
  }[];
}

export type PayoutStatus = "pending" | "approved" | "paid" | "cancelled";

export type CompensationRole = "none" | "doctor" | "facial" | "laser";

export type PayoutType = "cash" | "product" | "hybrid";

export type CalculationType = "percent_profit" | "fixed_per_session" | "monthly_salary";

export type ReportPeriod = "today" | "this_week" | "this_month" | "prev_month" | "this_year";

export interface Sale {
  id: number;
  customer: number;
  visit: number | null;
  package: number | null;
  amountUsd: string;
  discountUsd: string;
  exchangeRate: string | null;
  amountToman: string;
  status: SaleStatus;
  idempotencyKey: string | null;
  createdAt: string;
}

export interface PaymentComponentInput {
  method: PaymentMethod;
  amountUsd: string;
}

export interface CheckoutPayload {
  customer: number;
  amountUsd: string;
  components: PaymentComponentInput[];
  discountUsd?: string;
  visit?: number | null;
  package?: number | null;
  idempotencyKey: string;
  description?: string;
}

export interface ExchangeRate {
  id: number;
  currencyFrom: string;
  currencyTo: string;
  rate: string;
  effectiveAt: string;
  source: string;
  isActive: boolean;
  createdAt: string;
}

export interface CurrentRate {
  rate: string;
  rateTomanPerUsd: string;
  effectiveAt: string | null;
  source: string;
}

export interface StaffCompensationRule {
  id: number;
  role: Exclude<CompensationRole, "none">;
  payoutType: PayoutType;
  calculationType: CalculationType;
  percentProfit: string | null;
  fixedAmountUsd: string | null;
  fixedAmountToman: string | null;
  transportUsd: string;
  transportToman: string;
  product: number | null;
  productQty: string;
  isActive: boolean;
}

export interface StaffPayout {
  id: number;
  staff: number;
  staffName: string;
  visit: number;
  service: number;
  serviceName: string | null;
  role: CompensationRole;
  revenueUsd: string;
  revenueToman: string;
  productCostUsd: string;
  productCostToman: string;
  profitUsd: string;
  profitToman: string;
  payoutCashUsd: string;
  payoutCashToman: string;
  payoutProduct: number | null;
  productName: string | null;
  payoutProductQty: string;
  payoutProductValueUsd: string;
  payoutProductValueToman: string;
  totalPayoutUsd: string;
  totalPayoutToman: string;
  exchangeRate: string;
  status: PayoutStatus;
  payoutMode: "cash" | "product";
  notes: string;
  approvedBy: number | null;
  approvedAt: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface StaffPayoutSummary {
  totalCashUsd: string;
  totalCashToman: string;
  totalProductValueUsd: string;
  totalProductValueToman: string;
  totalPayoutUsd: string;
  totalPayoutToman: string;
  payoutCount: number;
}

export interface Package {
  id: number;
  name: string;
  description: string;
  priceUsd: string;
  priceToman: string | null;
  exchangeRate: string | null;
  isActive: boolean;
  services: number[];
  items: { product: number; quantity: string }[];
}

export interface ServiceCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
}

export interface ServiceItem {
  id: number;
  service: number;
  product: number;
  productName: string;
  quantity: string;
}

export interface ProductPurchase {
  id: number;
  product: number;
  quantity: string;
  unitCostUsd: string;
  totalCostUsd: string;
  supplier: string;
  purchaseDate: string;
  exchangeRateSnapshot: string | null;
  createdAt: string;
}

export interface ProductUsage {
  id: number;
  product: number;
  visit: number | null;
  service: number | null;
  packageSale: number | null;
  quantity: string;
  unitCostUsdSnapshot: string;
  totalCostUsdSnapshot: string;
  exchangeRateSnapshot: string;
  createdAt: string;
}

export interface ProductCostHistory {
  id: number;
  product: number;
  costUsd: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  createdAt: string;
}

export interface FinancialSummary {
  period: { start: string; end: string };
  revenue: { usd: string; toman: string };
  productCost: { usd: string; toman: string };
  grossProfit: { usd: string; toman: string };
  expenses: { usd: string; toman: string };
  netProfit: { usd: string; toman: string };
  paymentMethods: { cash: string; card: string; wallet: string };
  counts: {
    appointments: number;
    packagesSold: number;
    productsSoldQuantity: string;
    paidSales: number;
    averageTransactionValue: string;
  };
}

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
}

export interface FinanceDashboard {
  period: { start: string; end: string };
  salesSummary: {
    revenueUsd: string;
    revenueToman: string;
    grossProfitUsd: string;
    grossProfitToman: string;
    expensesUsd: string;
    expensesToman: string;
    netProfitUsd: string;
    netProfitToman: string;
    totalPayoutUsd: string;
    totalPayoutToman: string;
    saleCount: number;
    avgTicketUsd: string;
    paymentMethods: { cash: string; card: string; wallet: string };
  };
  operational: { visitsCompleted: number; newCustomers: number; staffPayoutCount: number };
}

export interface ConsumptionSelection {
  [serviceId: number]: { product: number; quantity: string }[];
}
