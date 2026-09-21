import { useMutation } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { MdCheckCircle, MdPayment } from "react-icons/md";

import { endpoints } from "../../config/api";
import { apiClient } from "../../lib/api-client";
import { toPersianDigits } from "../../lib/digits";
import type { PatientData, PaymentSelection, ServiceSelection } from "../../types/wizard";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { useToast } from "../ui/Toast";

interface Props {
  patient: PatientData;
  selectedServices: ServiceSelection[];
  onBack: () => void;
  onComplete: (payment: PaymentSelection) => void;
}

export default function WizardStepPayment({
  patient,
  selectedServices,
  onBack,
  onComplete,
}: Props) {
  const { success: toastSuccess, error: toastError } = useToast();
  const [cashToman, setCashToman] = useState("");
  const [cardToman, setCardToman] = useState("");

  const totalToman = useMemo(() => {
    return selectedServices.reduce((sum, s) => {
      const price = parseInt(s.priceToman.replace(/[^\d]/g, ""), 10) || 0;
      return sum + price;
    }, 0);
  }, [selectedServices]);

  const cashNum = parseInt(cashToman.replace(/[^\d]/g, ""), 10) || 0;
  const cardNum = parseInt(cardToman.replace(/[^\d]/g, ""), 10) || 0;
  const paidTotal = cashNum + cardNum;
  const remaining = totalToman - paidTotal;
  const isComplete = remaining === 0 && totalToman > 0;

  const checkoutMutation = useMutation({
    mutationFn: async (payload: {
      customerId: number;
      visitId: number;
      totalUsd: string;
      components: { method: string; amountUsd: string }[];
    }) => {
      const { data } = await apiClient.post(endpoints.sales.checkout, {
        customer: payload.customerId,
        visit: payload.visitId,
        amountUsd: payload.totalUsd,
        components: payload.components,
        idempotencyKey: crypto.randomUUID(),
        description: `پذیرش ${patient.firstName} ${patient.lastName}`,
      });
      return data;
    },
  });

  const reserveMutation = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const dateStr = now.toLocaleDateString("sv-SE");
      const timeStr = now.toLocaleTimeString("fa-IR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      const { data } = await apiClient.post(endpoints.visits.reserve, {
        customer: patient.id,
        services: selectedServices
          .filter((s) => !s.isPackage && s.serviceId)
          .map((s) => s.serviceId),
        date: dateStr,
        time: timeStr,
        notes: `پذیرش سریع - ${patient.firstName} ${patient.lastName}`,
      });
      return data as { id: number };
    },
  });

  const handleFinish = useCallback(async () => {
    if (!isComplete || !patient.id) return;

    try {
      const visit = await reserveMutation.mutateAsync();

      const components: { method: string; amountUsd: string }[] = [];
      if (cashNum > 0) {
        components.push({ method: "cash", amountUsd: String(cashNum) });
      }
      if (cardNum > 0) {
        components.push({ method: "card", amountUsd: String(cardNum) });
      }

      await checkoutMutation.mutateAsync({
        customerId: patient.id,
        visitId: visit.id,
        totalUsd: String(paidTotal),
        components,
      });

      toastSuccess(`پذیرش ${patient.firstName} ${patient.lastName} با موفقیت ثبت شد`);
      onComplete({
        method: cashNum > 0 && cardNum > 0 ? "cash" : cardNum > 0 ? "card" : "cash",
        amountUsd: String(paidTotal),
        cashToman: cashNum,
        cardToman: cardNum,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "خطا در ثبت پذیرش";
      toastError(msg);
    }
  }, [
    isComplete,
    patient.id,
    patient.firstName,
    patient.lastName,
    cashNum,
    cardNum,
    paidTotal,
    reserveMutation,
    checkoutMutation,
    toastSuccess,
    toastError,
    onComplete,
  ]);

  return (
    <div className="space-y-4">
      <h2 className="text-surface-900 text-lg font-bold">پرداخت</h2>
      <p className="text-surface-500 text-sm">
        بیمار: {patient.firstName} {patient.lastName}
      </p>

      <div className="border-surface-200 space-y-1 rounded-lg border p-3">
        {selectedServices.map((s, i) => (
          <div key={`${s.serviceId}-${i}`} className="flex justify-between text-sm">
            <span className="text-surface-700">{s.serviceName}</span>
            <span className="text-surface-600">{toPersianDigits(s.priceToman)} تومان</span>
          </div>
        ))}
        <div className="border-surface-200 mt-2 flex justify-between border-t pt-2 font-bold">
          <span className="text-surface-900">جمع کل</span>
          <span className="text-surface-900">{toPersianDigits(String(totalToman))} تومان</span>
        </div>
      </div>

      <div className="border-surface-200 bg-surface-50 space-y-3 rounded-lg border p-4">
        <h3 className="text-surface-700 text-sm font-medium">مبلغ پرداخت</h3>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="نقدی (تومان)"
            placeholder="0"
            value={cashToman}
            onChange={(e) => setCashToman(e.target.value.replace(/[^\d]/g, ""))}
          />
          <Input
            label="کارتخوان (تومان)"
            placeholder="0"
            value={cardToman}
            onChange={(e) => setCardToman(e.target.value.replace(/[^\d]/g, ""))}
          />
        </div>
        {remaining > 0 && (
          <p className="text-warning-600 text-sm">
            باقی‌مانده: {toPersianDigits(String(remaining))} تومان
          </p>
        )}
        {remaining < 0 && (
          <p className="text-danger-600 text-sm">
            مبلغ اضافی: {toPersianDigits(String(Math.abs(remaining)))} تومان
          </p>
        )}
        {isComplete && (
          <div className="text-success-600 flex items-center gap-2 text-sm">
            <MdCheckCircle className="size-4" />
            مبلغ پرداختی برابر جمع کل است
          </div>
        )}
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack}>
          بازگشت
        </Button>
        <Button
          variant="primary"
          startIcon={<MdPayment className="size-4" />}
          onClick={handleFinish}
          disabled={!isComplete || reserveMutation.isPending || checkoutMutation.isPending}
          loading={reserveMutation.isPending || checkoutMutation.isPending}
        >
          ثبت نهایی
        </Button>
      </div>
    </div>
  );
}
