import type { CompensationRole, ServiceCategory } from "./finance";

export interface ServiceConsumable {
  product: number;
  name: string;
  quantity: string;
  unitCostUsd: string;
  totalCostUsd: string;
}

export interface Service {
  id: number;
  title: string;
  duration: number;
  /** Legacy Toman price (kept for list totals until the backend drops it). */
  price: number;
  description: string;
  isActive: boolean;
  priceUsd: string;
  priceToman: string | null;
  exchangeRate: string | null;
  category: ServiceCategory | null;
  compensationRole: CompensationRole;
  products: ServiceConsumable[];
  estimatedCostUsd: string;
  estimatedCostToman: string | null;
  estimatedGrossProfitUsd: string;
  estimatedGrossProfitToman: string | null;
  estimatedMarginPercent: string;
}

export interface ServiceFormData {
  title: string;
  duration: number;
  price: number;
  description: string;
  isActive: boolean;
  priceUsd?: string;
  categoryId?: number | null;
  compensationRole?: CompensationRole;
}
