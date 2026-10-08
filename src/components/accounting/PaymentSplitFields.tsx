import { MdCheckCircle } from "react-icons/md";

import { formatPrice } from "../../lib/format";
import { parseTomanInput } from "../../lib/payment-split";
import { Input } from "../ui/Input";

interface PaymentSplitFieldsProps {
  cashToman: string;
  cashUsd: string;
  cardToman: string;
  totalToman: number;
  paidToman: number;
  remaining: number;
  isComplete: boolean;
  onCashTomanChange: (value: string) => void;
  onCashUsdChange: (value: string) => void;
  onCardTomanChange: (value: string) => void;
}

/**
 * Single shared payment-split UI: cash (toman) + cash (dollar) + card (toman).
 * Used by both the Wizard and the Accounting checkout so there is exactly
 * one implementation of the split UX.
 */
export function PaymentSplitFields({
  cashToman,
  cashUsd,
  cardToman,
  totalToman,
  paidToman,
  remaining,
  isComplete,
  onCashTomanChange,
  onCashUsdChange,
  onCardTomanChange,
}: PaymentSplitFieldsProps) {
  void paidToman;
  void totalToman;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Input
          label="نقدی (تومان)"
          placeholder="0"
          value={cashToman}
          inputMode="numeric"
          onChange={(e) => onCashTomanChange(e.target.value.replace(/[^\d۰-۹٠-٩]/g, ""))}
        />
        <Input
          label="نقدی (دلار)"
          placeholder="0"
          value={cashUsd}
          inputMode="decimal"
          onChange={(e) => onCashUsdChange(e.target.value.replace(/[^0-9.۰-۹٠-٩]/g, ""))}
        />
        <Input
          label="کارتخوان (تومان)"
          placeholder="0"
          value={cardToman}
          inputMode="numeric"
          onChange={(e) => onCardTomanChange(e.target.value.replace(/[^\d۰-۹٠-٩]/g, ""))}
        />
      </div>
      {remaining > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-warning-600 text-sm">باقی‌مانده: {formatPrice(remaining)} تومان</p>
          <button
            type="button"
            onClick={() => onCardTomanChange(String(parseTomanInput(cardToman) + remaining))}
            className="border-surface-300 text-surface-700 hover:border-primary-400 hover:text-primary-600 focus-visible:ring-primary-500/40 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors outline-none focus-visible:ring-2"
          >
            ثبت باقیمانده در کارتخوان
          </button>
        </div>
      )}
      {remaining < 0 && (
        <p className="text-danger-600 text-sm">
          مبلغ اضافی: {formatPrice(Math.abs(remaining))} تومان
        </p>
      )}
      {isComplete && (
        <div className="text-success-600 flex items-center gap-2 text-sm">
          <MdCheckCircle className="size-4" />
          مبلغ پرداختی برابر جمع کل است
        </div>
      )}
    </div>
  );
}
