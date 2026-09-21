import { useMemo, useState } from "react";

import { useCheckout, useCurrentRate, useRecordConsumption } from "../../hooks/api";
import { toLatinDigits } from "../../lib/digits";
import { formatPrice } from "../../lib/format";
import { buildCheckoutPayload } from "../../services/sales";
import type { ConsumptionSelection } from "../../types/finance";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { Textarea } from "../ui/Textarea";
import { ConsumptionStep } from "./ConsumptionStep";

interface CheckoutModalProps {
  open: boolean;
  customerId: number;
  visitId?: number | null;
  packageId?: number | null;
  defaultTotalToman: number;
  consumables?: ConsumptionSelection;
  productNames?: Record<number, string>;
  serviceNames?: Record<number, string>;
  onClose: () => void;
  onSuccess?: () => void;
}

const parseToman = (value: string): number => {
  const latin = toLatinDigits(value.replace(/[^\d۰-۹٠-٩]/g, ""));
  return Number(latin) || 0;
};

/**
 * Split-payment checkout dialog. Toman is entered, USD is derived via the current
 * exchange rate. Submit order: record-consumption (when edited) → checkout.
 * A fresh idempotency key is generated per submit attempt inside `buildCheckoutPayload`.
 */
export function CheckoutModal({
  open,
  customerId,
  visitId = null,
  packageId = null,
  defaultTotalToman,
  consumables,
  productNames,
  serviceNames,
  onClose,
  onSuccess,
}: CheckoutModalProps) {
  const [totalToman, setTotalToman] = useState(defaultTotalToman);
  const [cashToman, setCashToman] = useState(defaultTotalToman);
  const [cardToman, setCardToman] = useState(0);
  const [discountToman, setDiscountToman] = useState(0);
  const [description, setDescription] = useState("");
  const [selection, setSelection] = useState<ConsumptionSelection>(consumables ?? {});
  const [consumptionEdited, setConsumptionEdited] = useState(false);
  const [formError, setFormError] = useState("");

  const { data: currentRate, isLoading: rateLoading } = useCurrentRate();
  const checkout = useCheckout();
  const recordConsumption = useRecordConsumption();

  const rate = useMemo(() => {
    const raw = currentRate?.rateTomanPerUsd ?? currentRate?.rate;
    const parsed = Number(raw);
    return raw != null && Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [currentRate]);

  const rateMissing = !rateLoading && rate === null;
  const splitValid = cashToman + cardToman === totalToman && totalToman > 0;
  const isPending = checkout.isPending || recordConsumption.isPending;
  const canSubmit = splitValid && !rateMissing && !isPending;

  const showConsumption = visitId != null && consumables != null;

  const handleCashChange = (value: string) => {
    const cash = parseToman(value);
    setCashToman(cash);
    setCardToman(Math.max(0, totalToman - cash));
  };

  const handleCardChange = (value: string) => {
    const card = parseToman(value);
    setCardToman(card);
    setCashToman(Math.max(0, totalToman - card));
  };

  const handleTotalChange = (value: string) => {
    const total = parseToman(value);
    setTotalToman(total);
    setCashToman(total);
    setCardToman(0);
  };

  const handleSelectionChange = (next: ConsumptionSelection) => {
    setSelection(next);
    setConsumptionEdited(true);
  };

  const handleSubmit = async () => {
    setFormError("");
    try {
      const payload = buildCheckoutPayload({
        customerId,
        totalToman,
        rate,
        cashToman,
        cardToman,
        visitId,
        packageId,
        ...(discountToman > 0 ? { discountToman } : {}),
        ...(description ? { description } : {}),
      });
      if (visitId != null && consumptionEdited) {
        await recordConsumption.mutateAsync({ visitId, selection });
      }
      await checkout.mutateAsync(payload);
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "خطا در ثبت فروش");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="تسویه و ثبت فروش"
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            انصراف
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={!canSubmit}>
            {isPending ? "در حال ثبت..." : "ثبت فروش"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {formError && <Alert variant="error">{formError}</Alert>}
        {rateMissing && <Alert variant="warning">نرخ ارز در دسترس نیست</Alert>}

        <Input
          label="مبلغ کل (تومان)"
          value={totalToman ? formatPrice(totalToman) : ""}
          inputMode="numeric"
          disabled={visitId != null}
          onChange={(e) => handleTotalChange(e.target.value)}
        />

        <Input
          label="تخفیف (تومان)"
          value={discountToman ? formatPrice(discountToman) : ""}
          inputMode="numeric"
          onChange={(e) => setDiscountToman(parseToman(e.target.value))}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="نقدی (تومان)"
            value={cashToman ? formatPrice(cashToman) : ""}
            inputMode="numeric"
            onChange={(e) => handleCashChange(e.target.value)}
          />
          <Input
            label="کارتی (تومان)"
            value={cardToman ? formatPrice(cardToman) : ""}
            inputMode="numeric"
            onChange={(e) => handleCardChange(e.target.value)}
          />
        </div>
        {!splitValid && totalToman > 0 && (
          <p className="text-danger-600 text-xs">مجموع نقدی و کارتی باید برابر مبلغ کل باشد</p>
        )}

        <Textarea
          label="توضیحات"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />

        {showConsumption && (
          <ConsumptionStep
            selection={selection}
            productNames={productNames}
            serviceNames={serviceNames}
            onChange={handleSelectionChange}
          />
        )}
      </div>
    </Modal>
  );
}
