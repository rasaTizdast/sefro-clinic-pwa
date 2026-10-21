import { CiTrash } from "react-icons/ci";

import type { ConsumptionSelection } from "../../types/finance";
import { Input } from "../ui/Input";
import { Toggle } from "../ui/Toggle";

interface ConsumptionStepProps {
  selection: ConsumptionSelection;
  productNames?: Record<number, string>;
  serviceNames?: Record<number, string>;
  onChange: (selection: ConsumptionSelection) => void;
  /** serviceId → reason for services marked «استفاده نشد» (sent as zero_consumption). */
  zeroServices?: Record<number, string>;
  /** Enables the per-service «استفاده نشد» switch when `zeroServices` is given. */
  onToggleZero?: (serviceId: number, zero: boolean) => void;
  onZeroReasonChange?: (serviceId: number, reason: string) => void;
}

/**
 * «ثبت مصرف مواد» step — per visit-service rows with the product name,
 * the prefilled quantity from `service.products`, and an editable quantity input.
 * A service can be marked «استفاده نشد» instead: its rows leave the billed
 * selection and the service is recorded with a required reason.
 */
export function ConsumptionStep({
  selection,
  productNames = {},
  serviceNames = {},
  onChange,
  zeroServices,
  onToggleZero,
  onZeroReasonChange,
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
      {serviceIds.map((serviceId) => {
        const zeroReason = zeroServices?.[serviceId];
        return (
          <div key={serviceId} className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              {serviceNames[serviceId] && (
                <p className="text-surface-500 text-xs font-medium">{serviceNames[serviceId]}</p>
              )}
              {zeroServices && onToggleZero && (
                <Toggle
                  id={`zero-service-${serviceId}`}
                  label="استفاده نشد"
                  checked={zeroReason !== undefined}
                  onChange={(e) => onToggleZero(serviceId, e.target.checked)}
                />
              )}
            </div>
            {zeroReason !== undefined
              ? onZeroReasonChange && (
                  <Input
                    id={`zero-reason-${serviceId}`}
                    label="دلیل عدم استفاده"
                    value={zeroReason}
                    error={zeroReason.trim() ? undefined : "دلیل الزامی است"}
                    onChange={(e) => onZeroReasonChange(serviceId, e.target.value)}
                  />
                )
              : selection[serviceId].map((row) => (
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
        );
      })}
    </div>
  );
}
