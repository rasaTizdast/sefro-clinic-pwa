import { useState } from "react";

import { useCurrentRate, useRefundSale } from "../../hooks/api";
import { tomanToUsd } from "../../lib/currency";
import { toLatinDigits } from "../../lib/digits";
import { formatPrice } from "../../lib/format";
import type { Sale } from "../../types/finance";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { Textarea } from "../ui/Textarea";

interface RefundModalProps {
  sale: Sale;
  onClose: () => void;
}

/** Admin-only partial/full refund. Empty amount = full refund of the sale amount. */
export function RefundModal({ sale, onClose }: RefundModalProps) {
  const [amountToman, setAmountToman] = useState("");
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState("");

  const { data: currentRate } = useCurrentRate();
  const refund = useRefundSale();

  const rate = Number(currentRate?.rateTomanPerUsd ?? currentRate?.rate ?? 0) || null;

  const handleSubmit = async () => {
    setFormError("");
    try {
      const amount = amountToman.trim()
        ? Number(toLatinDigits(amountToman.replace(/[^\d۰-۹٠-٩]/g, "")))
        : 0;
      const payload: { refundAmountUsd?: string; reason?: string } = {};
      if (amount > 0) {
        const refundUsd = tomanToUsd(amount, rate);
        if (refundUsd === null) throw new Error("نرخ ارز در دسترس نیست");
        payload.refundAmountUsd = refundUsd;
      }
      if (reason.trim()) payload.reason = reason.trim();
      await refund.mutateAsync({ id: sale.id, payload });
      onClose();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "خطا در ثبت استرداد");
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`استرداد فروش #${sale.id}`}
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={refund.isPending}>
            انصراف
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={refund.isPending || rate === null}
          >
            {refund.isPending ? "در حال ثبت..." : "ثبت استرداد"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {formError && <Alert variant="error">{formError}</Alert>}
        <p className="text-surface-600 text-sm">
          مبلغ فروش:{" "}
          <span className="text-surface-900 font-medium">
            {formatPrice(Number(sale.amountToman))} تومان
          </span>
          <span className="text-surface-400"> (${sale.amountUsd})</span>
        </p>
        <Input
          label="مبلغ استرداد (تومان) — خالی یعنی کل مبلغ"
          value={amountToman}
          inputMode="numeric"
          onChange={(e) => setAmountToman(e.target.value)}
        />
        <Textarea
          label="دلیل استرداد"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
        />
      </div>
    </Modal>
  );
}
