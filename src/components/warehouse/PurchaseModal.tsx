import { useMemo, useState } from "react";

import { useCreatePurchase, useCurrentRate, useProductsList } from "../../hooks/api";
import { extractApiError } from "../../lib/api-error";
import { tomanToUsd } from "../../lib/currency";
import { toLatinDigits } from "../../lib/digits";
import { formatPrice } from "../../lib/format";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { JalaliDatePicker } from "../ui/JalaliDatePicker";
import { Modal } from "../ui/Modal";
import { Select } from "../ui/Select";

const parseToman = (value: string): number => {
  const latin = toLatinDigits(value.replace(/[^\d۰-۹٠-٩]/g, ""));
  return Number(latin) || 0;
};

interface PurchaseModalProps {
  open: boolean;
  onClose: () => void;
}

/** «ثبت خرید» form — records a new stock entry for a product. */
export function PurchaseModal({ open, onClose }: PurchaseModalProps) {
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitCostToman, setUnitCostToman] = useState("");
  const [supplier, setSupplier] = useState("");
  const [purchaseDate, setPurchaseDate] = useState<string | null>(null);
  const [formError, setFormError] = useState("");

  const { data: productsData } = useProductsList({ perPage: 100 });
  const { data: currentRate, isLoading: rateLoading } = useCurrentRate();
  const createPurchase = useCreatePurchase();

  const rate = useMemo(() => {
    const parsed = Number(currentRate?.rateTomanPerUsd ?? currentRate?.rate);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [currentRate]);

  const unitUsd = tomanToUsd(parseToman(unitCostToman), rate);
  const qty = Number(quantity) || 0;
  const totalUsd = unitUsd !== null ? (Number(unitUsd) * qty).toFixed(2) : null;

  const canSubmit =
    productId !== "" &&
    qty > 0 &&
    parseToman(unitCostToman) > 0 &&
    purchaseDate !== null &&
    rate !== null &&
    !createPurchase.isPending;

  const resetForm = () => {
    setProductId("");
    setQuantity("1");
    setUnitCostToman("");
    setSupplier("");
    setPurchaseDate(null);
    setFormError("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSave = async () => {
    setFormError("");
    if (!productId) {
      setFormError("انتخاب محصول الزامی است");
      return;
    }
    if (qty <= 0) {
      setFormError("مقدار باید بزرگ‌تر از صفر باشد");
      return;
    }
    if (parseToman(unitCostToman) <= 0) {
      setFormError("بهای واحد الزامی است");
      return;
    }
    if (!purchaseDate) {
      setFormError("تاریخ خرید الزامی است");
      return;
    }
    try {
      await createPurchase.mutateAsync({
        productId: Number(productId),
        quantity,
        unitCostToman: parseToman(unitCostToman),
        rate,
        supplier: supplier.trim(),
        purchaseDateJalali: purchaseDate,
      });
      handleClose();
    } catch (err: unknown) {
      setFormError(extractApiError(err));
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="ثبت خرید"
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={handleClose}>
            انصراف
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={!canSubmit}>
            {createPurchase.isPending ? "در حال ثبت..." : "ثبت خرید"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {formError && <Alert variant="error">{formError}</Alert>}
        {!rateLoading && rate === null && <Alert variant="warning">نرخ ارز در دسترس نیست</Alert>}
        <Select
          label="محصول"
          options={[
            { value: "", label: "انتخاب محصول" },
            ...(productsData?.data ?? []).map((p) => ({ value: String(p.id), label: p.name })),
          ]}
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="مقدار"
            value={quantity}
            inputMode="decimal"
            onChange={(e) => setQuantity(e.target.value)}
          />
          <Input
            label="بهای واحد (تومان)"
            value={unitCostToman}
            inputMode="numeric"
            onChange={(e) => setUnitCostToman(e.target.value)}
          />
        </div>
        {totalUsd !== null && qty > 0 && (
          <p className="text-surface-600 text-sm">
            بهای کل:{" "}
            <span dir="ltr" className="text-surface-900 font-medium">
              ${totalUsd}
            </span>
            <span className="text-surface-400">
              {" "}
              ({formatPrice(parseToman(unitCostToman) * qty)} تومان)
            </span>
          </p>
        )}
        <Input label="تأمین‌کننده" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
        <JalaliDatePicker label="تاریخ خرید" value={purchaseDate} onChange={setPurchaseDate} />
      </div>
    </Modal>
  );
}
