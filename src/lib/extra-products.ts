import type { WarehouseItem } from "../types/warehouse";
import type { ConsumableSelection } from "../types/wizard";
import { toLatinDigits } from "./digits";
import { parseTomanAmount } from "./format";

/** Normalizes a quantity field: latin digits, must be a finite number > 0. */
export function toPositiveQty(value: string): string | null {
  const trimmed = toLatinDigits(value.trim());
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0) return null;
  return String(n);
}

/** Maps a warehouse product + quantity onto the billable consumable row shape. */
export function productToConsumable(product: WarehouseItem, quantity: string): ConsumableSelection {
  return {
    product: product.id,
    productName: product.name,
    quantity,
    priceToman: String(parseTomanAmount(product.unitPrice)),
    priceUsd: product.unitPriceUsd ?? "0",
  };
}
