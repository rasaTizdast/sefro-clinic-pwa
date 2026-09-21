import { CiTrash } from "react-icons/ci";

import type { ConsumptionSelection } from "../../types/finance";
import { Input } from "../ui/Input";

interface ConsumptionStepProps {
  selection: ConsumptionSelection;
  productNames?: Record<number, string>;
  serviceNames?: Record<number, string>;
  onChange: (selection: ConsumptionSelection) => void;
}

/**
 * «ثبت مصرف مواد» step — per visit-service rows with the product name,
 * the prefilled quantity from `service.products`, and an editable quantity input.
 */
export function ConsumptionStep({
  selection,
  productNames = {},
  serviceNames = {},
  onChange,
}: ConsumptionStepProps) {
  const serviceIds = Object.keys(selection)
    .map(Number)
    .filter((id) => selection[id].length > 0);

  if (serviceIds.length === 0) return null;

  const updateQuantity = (serviceId: number, product: number, quantity: string) => {
    onChange({
      ...selection,
      [serviceId]: selection[serviceId].map((row) =>
        row.product === product ? { ...row, quantity } : row
      ),
    });
  };

  const removeRow = (serviceId: number, product: number) => {
    onChange({
      ...selection,
      [serviceId]: selection[serviceId].filter((row) => row.product !== product),
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-surface-900 text-sm font-semibold">ثبت مصرف مواد</h3>
      {serviceIds.map((serviceId) => (
        <div key={serviceId} className="flex flex-col gap-2">
          {serviceNames[serviceId] && (
            <p className="text-surface-500 text-xs font-medium">{serviceNames[serviceId]}</p>
          )}
          {selection[serviceId].map((row) => (
            <div key={row.product} className="flex items-end gap-2">
              <div className="grow">
                <Input
                  label={productNames[row.product] ?? `محصول ${row.product}`}
                  value={row.quantity}
                  inputMode="decimal"
                  onChange={(e) => updateQuantity(serviceId, row.product, e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={() => removeRow(serviceId, row.product)}
                aria-label={`حذف ${productNames[row.product] ?? row.product}`}
                className="text-danger-600 hover:bg-danger-50 cursor-pointer rounded-md p-2 transition-colors"
              >
                <CiTrash className="size-4" />
              </button>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
