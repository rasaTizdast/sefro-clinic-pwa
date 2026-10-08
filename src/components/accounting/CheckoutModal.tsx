import { useMemo, useState } from "react";
import { PiGiftBold } from "react-icons/pi";

import { useToast } from "../../components/ui";
import {
  useCheckout,
  useCurrentRate,
  useIssueWelcomePack,
  useRecordConsumption,
  useVisitConsumptionCount,
} from "../../hooks/api";
import { extractApiError } from "../../lib/api-error";
import { formatUsd, tomanToUsd } from "../../lib/currency";
import { toLatinDigits } from "../../lib/digits";
import { consumablesTotalToman, formatPrice } from "../../lib/format";
import { parseTomanInput, parseUsdInput, splitPaidToman } from "../../lib/payment-split";
import { buildCheckoutPayload, partitionVisitPayment } from "../../services/sales";
import type { ConsumptionSelection } from "../../types/finance";
import type { ConsumableSelection, WelcomePackSelection } from "../../types/wizard";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { Textarea } from "../ui/Textarea";
import { ConsumptionStep } from "./ConsumptionStep";
import { PaymentSplitFields } from "./PaymentSplitFields";

interface CheckoutModalProps {
  open: boolean;
  customerId: number;
  visitId?: number | null;
  packageId?: number | null;
  defaultTotalToman: number;
  /**
   * The service-fee portion of `defaultTotalToman`. When set (visit checkout),
   * the bill is split into a visit-bound service sale and a visit-less goods
   * sale, so products can never inflate staff compensation.
   */
  serviceFeeToman?: number | null;
  consumables?: ConsumptionSelection;
  productNames?: Record<number, string>;
  serviceNames?: Record<number, string>;
  /** Booking-time warehouse add-ons — billed, never sent to record-consumption. */
  extraProducts?: ConsumableSelection[];
  /** Issued as its own financial event after a successful checkout. */
  welcomePack?: WelcomePackSelection | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const parseToman = (value: string): number => {
  const latin = toLatinDigits(value.replace(/[^\d۰-۹٠-٩]/g, ""));
  return Number(latin) || 0;
};

/**
 * Split-payment checkout dialog. Toman is entered, USD is derived via the current
 * exchange rate. Submit order: record-consumption (when the visit has none yet) → checkout.
 * A fresh idempotency key is generated per submit attempt inside `buildCheckoutPayload`.
 */
export function CheckoutModal({
  open,
  customerId,
  visitId = null,
  packageId = null,
  defaultTotalToman,
  serviceFeeToman = null,
  consumables,
  productNames,
  serviceNames,
  extraProducts = [],
  welcomePack = null,
  onClose,
  onSuccess,
}: CheckoutModalProps) {
  const [totalToman, setTotalToman] = useState(defaultTotalToman);
  const [cashToman, setCashToman] = useState(defaultTotalToman);
  const [cashUsd, setCashUsd] = useState("0");
  const [cardToman, setCardToman] = useState(0);
  const [description, setDescription] = useState("");
  const [selection, setSelection] = useState<ConsumptionSelection>(consumables ?? {});
  const [formError, setFormError] = useState("");

  const { data: currentRate, isLoading: rateLoading } = useCurrentRate();
  const checkout = useCheckout();
  const recordConsumption = useRecordConsumption();
  const issuePack = useIssueWelcomePack();
  const toast = useToast();
  // The backend refuses a second consumption per visit, so only send one when the
  // visit has none. This is what makes checkout deduct the recipe's stock.
  const { data: recordedUsages } = useVisitConsumptionCount(visitId);
  const consumptionAlreadyRecorded = (recordedUsages ?? 0) > 0;

  const extraTotal = useMemo(() => consumablesTotalToman({}, extraProducts), [extraProducts]);
  const packToman = useMemo(
    () => (welcomePack ? Number(toLatinDigits(welcomePack.totalCostToman ?? "0")) || 0 : 0),
    [welcomePack]
  );

  const rate = useMemo(() => {
    const raw = currentRate?.rateTomanPerUsd ?? currentRate?.rate;
    const parsed = Number(raw);
    return raw != null && Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [currentRate]);

  const cashUsdNum = parseUsdInput(String(cashUsd));
  const rateMissing = !rateLoading && rate === null;
  const paidToman = splitPaidToman(cashToman, cardToman, cashUsdNum, rate);
  const splitValid = paidToman === totalToman && totalToman > 0;
  const isPending = checkout.isPending || recordConsumption.isPending || issuePack.isPending;
  const canSubmit = splitValid && !rateMissing && !isPending;

  // Dollar value of the bill at the live rate — shown under مبلغ کل so the
  // receptionist sees both currencies before splitting the payment.
  const totalUsd = tomanToUsd(totalToman, rate);

  const showConsumption = visitId != null && consumables != null;

  const handleTotalChange = (value: string) => {
    const total = parseToman(value);
    setTotalToman(total);
    setCashToman(total);
    setCashUsd("0");
    setCardToman(0);
  };

  const handleSelectionChange = (next: ConsumptionSelection) => {
    setSelection(next);
  };

  const handleSubmit = async () => {
    setFormError("");
    try {
      // Visit checkouts split into two sales: services (visit-bound → counted by
      // compensation) and goods (visit-less → never touch operator profit).
      const feeShare =
        visitId != null && serviceFeeToman != null && serviceFeeToman > 0 && rate !== null
          ? Math.min(serviceFeeToman, totalToman)
          : 0;
      const goodsShare = totalToman - feeShare;
      const parts =
        rate !== null && feeShare > 0 && goodsShare > 0
          ? partitionVisitPayment({
              serviceFeeToman: feeShare,
              totalToman,
              rate,
              cashToman,
              cardToman,
              cashUsd: cashUsdNum,
            })
          : null;
      const descriptionField = description ? { description } : {};
      // No partition → one combined visit sale (exact fallback for heavy-USD bills).
      const servicePayload = parts
        ? buildCheckoutPayload({
            customerId,
            totalToman: feeShare,
            rate,
            cashToman: parts.service.cashToman,
            cardToman: parts.service.cardToman,
            cashUsd: parts.service.cashUsd,
            visitId,
            packageId,
            ...descriptionField,
          })
        : buildCheckoutPayload({
            customerId,
            totalToman,
            rate,
            cashToman,
            cardToman,
            cashUsd: cashUsdNum > 0 ? cashUsdNum.toFixed(2) : 0,
            visitId,
            packageId,
            ...descriptionField,
          });
      if (visitId != null && !consumptionAlreadyRecorded) {
        try {
          // An empty selection still records the service's mandatory recipe items
          // server-side, which is what deducts warehouse stock. extraProducts are
          // the billable non-recipe rows («محصولات این صورتحساب») — same call
          // deducts their stock too.
          await recordConsumption.mutateAsync({
            visitId,
            selection,
            includeMandatoryOnly: true,
            extraProducts,
          });
        } catch (consumptionError) {
          // The sale matters more than the stock note: finish the checkout and say
          // plainly that the consumables were not recorded.
          toast.warning("فروش ثبت شد اما مصرف مواد ثبت نشد", extractApiError(consumptionError));
        }
      }
      await checkout.mutateAsync(servicePayload);
      if (parts) {
        try {
          await checkout.mutateAsync(
            buildCheckoutPayload({
              customerId,
              totalToman: goodsShare,
              rate,
              cashToman: parts.goods.cashToman,
              cardToman: parts.goods.cardToman,
              cashUsd: parts.goods.cashUsd,
              visitId: null,
              packageId: null,
              ...descriptionField,
            })
          );
        } catch (goodsError) {
          // The service sale already exists; a goods failure must not undo it.
          toast.warning("خدمت ثبت شد اما فروش محصولات ثبت نشد", extractApiError(goodsError));
        }
      }
      // The pack is its own financial event and is deliberately excluded from
      // defaultTotalToman above — issue it only once the sale is recorded. A pack
      // failure (e.g. not enough stock) must not undo a completed sale.
      if (welcomePack && visitId != null && customerId) {
        try {
          await issuePack.mutateAsync({
            packId: welcomePack.packId,
            customer: customerId,
            visit: visitId,
            quantity: "1",
          });
        } catch (packError) {
          toast.warning("فروش ثبت شد اما ولکام‌پک صادر نشد", extractApiError(packError));
        }
      }
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
          onChange={(e) => handleTotalChange(e.target.value)}
          helperText={totalUsd ? `≈ ${formatUsd(totalUsd)} دلار` : undefined}
        />

        {(extraProducts.length > 0 || welcomePack) && (
          <div className="border-surface-200 space-y-1.5 rounded-lg border px-3 py-2.5">
            <p className="text-surface-500 text-xs font-medium">خلاصه فاکتور</p>
            {extraProducts.length > 0 && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-surface-600 truncate text-xs">
                  محصولات اضافه ({extraProducts.length} قلم) — در مبلغ کل بالا
                </span>
                <span className="text-surface-900 shrink-0 text-xs font-medium">
                  {formatPrice(extraTotal)} تومان
                </span>
              </div>
            )}
            {welcomePack && (
              <div className="bg-info-50 border-info-200 flex items-center justify-between gap-2 rounded-md border px-2 py-1.5">
                <span className="text-info-800 flex min-w-0 items-center gap-1.5 text-xs">
                  <PiGiftBold className="size-3.5 shrink-0" />
                  <span className="truncate">{welcomePack.packName}</span>
                </span>
                <span className="shrink-0 text-end">
                  <span className="text-info-800 block text-xs font-semibold">
                    {formatPrice(packToman)} تومان
                  </span>
                  <span className="text-info-700 block text-[10px]">جدای از مبلغ کل</span>
                </span>
              </div>
            )}
          </div>
        )}

        <PaymentSplitFields
          cashToman={String(cashToman)}
          cashUsd={String(cashUsd)}
          cardToman={String(cardToman)}
          totalToman={totalToman}
          paidToman={paidToman}
          remaining={totalToman - paidToman}
          isComplete={splitValid}
          onCashTomanChange={(v) => setCashToman(parseTomanInput(v))}
          onCashUsdChange={(v) => setCashUsd(v)}
          onCardTomanChange={(v) => setCardToman(parseTomanInput(v))}
        />
        {!splitValid && totalToman > 0 && (
          <p className="text-danger-600 text-xs">
            مجموع نقدی (تومان) + نقدی (دلار) + کارتی باید برابر مبلغ کل باشد
          </p>
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
