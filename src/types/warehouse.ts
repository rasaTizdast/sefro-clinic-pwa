export type ProductStatus = "available" | "less" | "finished";

export interface WarehouseItem {
  id: number;
  name: string;
  stock: number;
  unit: string;
  unitPrice: string;
  description: string;
  status: ProductStatus;
}
