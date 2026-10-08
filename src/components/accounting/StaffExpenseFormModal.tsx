import { useMemo, useState } from "react";

import {
  useAllExpenseCategories,
  useCreateExpense,
  useCreateExpenseCategory,
  useCurrentRate,
} from "../../hooks/api";
import { tomanToUsd } from "../../lib/currency";
import { formatJalaliDate, jalaliToGregorianISO } from "../../lib/date";
import { toLatinDigits } from "../../lib/digits";
import { formatPrice } from "../../lib/format";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { JalaliDatePicker } from "../ui/JalaliDatePicker";
import { Modal } from "../ui/Modal";
import { Select } from "../ui/Select";
import { Textarea } from "../ui/Textarea";

interface StaffExpenseFormModalProps {
  open: boolean;
  onClose: () => void;
  /** Pre-selected category when the row was opened from a category chip. */
  defaultCategoryId?: number | null;
}

/**
 * New staff expense claim. Toman is what staff type; the USD figure the backend
 * stores is derived at the live rate, and the server snapshots that rate.
 */
export function StaffExpenseFormModal({
  open,
  onClose,
  defaultCategoryId = null,
}: StaffExpenseFormModalProps) {
  const [categoryId, setCategoryId] = useState(
    defaultCategoryId != null ? String(defaultCategoryId) : ""
  );
  const [newCategory, setNewCategory] = useState("");
  const [amountToman, setAmountToman] = useState("");
  const [expenseDate, setExpenseDate] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [vendor, setVendor] = useState("");
  const [formError, setFormError] = useState("");

  const { data: categories } = useAllExpenseCategories();
  const { data: currentRate } = useCurrentRate();
  const createExpense = useCreateExpense();
  const createCategory = useCreateExpenseCategory();

  const rate = useMemo(() => {
    const raw = currentRate?.rateTomanPerUsd ?? currentRate?.rate;
    const parsed = Number(raw);
    return raw != null && Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [currentRate]);

  const tomanAmount = Number(toLatinDigits(amountToman.replace(/[^\d۰-۹]/g, ""))) || 0;
  const amountUsd = rate === null ? null : tomanToUsd(tomanAmount, rate);
  const rateMissing = rate === null;
  const isPending = createExpense.isPending || createCategory.isPending;
  const canSubmit = categoryId !== "" && tomanAmount > 0 && amountUsd !== null && !rateMissing;

  const handleCreateCategory = async () => {
    const name = newCategory.trim();
    if (!name) return;
    try {
      const created = await createCategory.mutateAsync(name);
      setCategoryId(String(created.id));
      setNewCategory("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "خطا در ثبت دسته‌بندی");
    }
  };

  const handleSubmit = async () => {
    setFormError("");
    if (!expenseDate) {
      setFormError("تاریخ هزینه را انتخاب کنید");
      return;
    }
    try {
      await createExpense.mutateAsync({
        category: Number(categoryId),
        amountUsd: amountUsd ?? "0.00",
        expenseDate: jalaliToGregorianISO(expenseDate),
        description,
        vendor,
      });
      setCategoryId("");
      setAmountToman("");
      setExpenseDate(null);
      setDescription("");
      setVendor("");
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "خطا در ثبت مطالبه");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="ثبت مطالبه هزینه"
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            انصراف
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={!canSubmit}>
            {isPending ? "در حال ثبت..." : "ثبت مطالبه"}
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
            ...(categories ?? []).map((c) => ({ value: String(c.id), label: c.name })),
          ]}
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        />

        {(categories ?? []).length === 0 && (
          <Alert variant="warning">
            هنوز دسته‌بندی‌ای ثبت نشده است — پایین فرم یک دسته‌بندی جدید بسازید.
          </Alert>
        )}

        {categoryId === "" && (
          <div className="border-surface-200 flex items-end gap-2 rounded-lg border p-3">
            <div className="flex-1">
              <Input
                label="دسته‌بندی جدید"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="مثلاً ایاب و ذهاب"
              />
            </div>
            <Button
              variant="outline"
              onClick={handleCreateCategory}
              disabled={!newCategory.trim() || createCategory.isPending}
            >
              افزودن
            </Button>
          </div>
        )}

        <Input
          label="مبلغ (تومان)"
          value={amountToman ? formatPrice(tomanAmount) : ""}
          inputMode="numeric"
          onChange={(e) => setAmountToman(e.target.value)}
        />
        {!rateMissing && tomanAmount > 0 && amountUsd !== null && (
          <p className="text-surface-400 -mt-2 text-xs">معادل: ${amountUsd}</p>
        )}

        <JalaliDatePicker
          label="تاریخ هزینه"
          value={expenseDate}
          onChange={(value) => setExpenseDate(value)}
        />

        <Input
          label="فروشنده (اختیاری)"
          value={vendor}
          onChange={(e) => setVendor(e.target.value)}
        />

        <Textarea
          label="شرح"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />

        {expenseDate && (
          <p className="text-surface-400 text-xs">
            تاریخ ثبت: {formatJalaliDate(expenseDate)} — فقط مطالبات تأیید یا پرداخت‌شده از سود خالص
            کم می‌شود.
          </p>
        )}
      </div>
    </Modal>
  );
}
