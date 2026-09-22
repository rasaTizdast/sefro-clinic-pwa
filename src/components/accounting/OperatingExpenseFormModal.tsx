import { useMemo, useState } from "react";

import {
  useCreateOperatingExpense,
  useCurrentRate,
  useUpdateOperatingExpense,
} from "../../hooks/api";
import { tomanToUsd } from "../../lib/currency";
import { jalaliToGregorianISO } from "../../lib/date";
import { toLatinDigits } from "../../lib/digits";
import { formatPrice } from "../../lib/format";
import type {
  CreateOperatingExpensePayload,
  OperatingExpense,
  OperatingExpensePaymentMethod,
} from "../../types/finance";
import type { OperatingExpenseCategory } from "../../types/finance";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { JalaliDatePicker } from "../ui/JalaliDatePicker";
import { Modal } from "../ui/Modal";
import { Select } from "../ui/Select";
import { Textarea } from "../ui/Textarea";

const paymentMethodOptions = [
  { value: "cash", label: "نقدی" },
  { value: "card", label: "کارت" },
  { value: "bank_transfer", label: "انتقال بانکی" },
  { value: "other", label: "سایر" },
];

interface FormModalProps {
  open: boolean;
  onClose: () => void;
  categories: OperatingExpenseCategory[];
  expense?: OperatingExpense | null;
}

export function OperatingExpenseFormModal({ open, onClose, categories, expense }: FormModalProps) {
  const isEdit = !!expense;

  const [categoryId, setCategoryId] = useState(expense ? String(expense.category) : "");
  const [title, setTitle] = useState(expense?.title ?? "");
  const [description, setDescription] = useState(expense?.description ?? "");
  const [amountToman, setAmountToman] = useState(
    expense && expense.exchangeRate ? String(Math.round(Number(expense.amountToman))) : ""
  );
  const [paymentMethod, setPaymentMethod] = useState<OperatingExpensePaymentMethod>(
    expense?.paymentMethod ?? "cash"
  );
  const [expenseDate, setExpenseDate] = useState<string | null>(null);
  const [vendor, setVendor] = useState(expense?.vendor ?? "");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [notes, setNotes] = useState(expense?.notes ?? "");
  const [formError, setFormError] = useState("");

  const { data: currentRate } = useCurrentRate();
  const createExpense = useCreateOperatingExpense();
  const updateExpense = useUpdateOperatingExpense();

  const rate = useMemo(() => {
    const raw = currentRate?.rateTomanPerUsd ?? currentRate?.rate;
    const parsed = Number(raw);
    return raw != null && Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [currentRate]);

  const tomanAmount = Number(toLatinDigits(amountToman.replace(/[^\d۰-۹]/g, ""))) || 0;
  const amountUsd = rate === null ? null : tomanToUsd(tomanAmount, rate);
  const rateMissing = rate === null;
  const canSubmit =
    !!categoryId &&
    !!title.trim() &&
    tomanAmount > 0 &&
    amountUsd !== null &&
    !createExpense.isPending &&
    !updateExpense.isPending;

  const handleSubmit = async () => {
    setFormError("");
    const gregorianDate = expenseDate ? jalaliToGregorianISO(expenseDate) : expense?.expenseDate;
    if (!gregorianDate) {
      setFormError("تاریخ هزینه را انتخاب کنید");
      return;
    }
    try {
      if (isEdit) {
        // idempotency key is not regenerated on edit; server-owned fields are not sent
        await updateExpense.mutateAsync({
          id: expense.id,
          payload: {
            category: Number(categoryId),
            title: title.trim(),
            ...(description ? { description } : { description: "" }),
            amountUsd: amountUsd ?? "0.00",
            expenseDate: gregorianDate,
            paymentMethod,
            ...(vendor ? { vendor } : { vendor: "" }),
            ...(receipt ? { receipt } : {}),
            ...(notes ? { notes } : { notes: "" }),
          },
        });
      } else {
        const payload: CreateOperatingExpensePayload = {
          category: Number(categoryId),
          title: title.trim(),
          amountUsd: amountUsd ?? "0.00",
          expenseDate: gregorianDate,
          paymentMethod,
          idempotencyKey: crypto.randomUUID(),
          ...(description ? { description } : {}),
          ...(vendor ? { vendor } : {}),
          ...(receipt ? { receipt } : {}),
          ...(notes ? { notes } : {}),
        };
        await createExpense.mutateAsync(payload);
      }
      onClose();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "خطا در ثبت هزینه");
    }
  };

  const isPending = createExpense.isPending || updateExpense.isPending;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "ویرایش هزینه جاری" : "ثبت هزینه جاری"}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            انصراف
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={!canSubmit}>
            {isPending ? "در حال ثبت..." : isEdit ? "ذخیره" : "ثبت هزینه"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {formError && <Alert variant="error">{formError}</Alert>}
        {rateMissing && <Alert variant="warning">نرخ ارز در دسترس نیست</Alert>}

        <Select
          label="دسته‌بندی"
          options={[
            { value: "", label: "انتخاب کنید" },
            ...categories.map((c) => ({ value: String(c.id), label: c.name })),
          ]}
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        />

        <Input
          label="عنوان"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="مثلاً اجاره مرداد"
        />

        <Input
          label="مبلغ (تومان)"
          value={amountToman ? formatPrice(tomanAmount) : ""}
          inputMode="numeric"
          onChange={(e) => setAmountToman(e.target.value)}
        />
        {!rateMissing && tomanAmount > 0 && amountUsd !== null && (
          <p className="text-surface-400 text-xs">معادل: ${amountUsd}</p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="روش پرداخت"
            options={paymentMethodOptions}
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as OperatingExpensePaymentMethod)}
          />
          <JalaliDatePicker
            label="تاریخ هزینه"
            value={expenseDate}
            onChange={(value) => setExpenseDate(value)}
          />
        </div>

        <Input
          label="فروشنده (اختیاری)"
          value={vendor}
          onChange={(e) => setVendor(e.target.value)}
        />

        <Textarea
          label="توضیحات (اختیاری)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />

        <Textarea
          label="یادداشت (اختیاری)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />

        <Input
          label="فایل رسید (اختیاری)"
          type="file"
          onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
        />
      </div>
    </Modal>
  );
}
