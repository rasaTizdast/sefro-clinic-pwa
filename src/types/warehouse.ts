export type ProductStatus = "available" | "less" | "finished";

export interface WarehouseItem {
  id: number;
  name: string;
  stock: number;
  unit: string;
  unitPrice: string;
  unitPriceUsd: string | null;
  description: string;
  status: ProductStatus;
  /** Current unit cost (USD string); null when the backend has no cost yet. */
  costUsd: string | null;
}
