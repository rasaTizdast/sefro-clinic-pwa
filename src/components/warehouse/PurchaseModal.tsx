import { useMemo, useState } from "react";
import { BiPlus } from "react-icons/bi";

import {
  useAllProducts,
  useCreateProduct,
  useCreatePurchase,
  useCurrentRate,
  useUpdatePurchase,
} from "../../hooks/api";
import { extractApiError } from "../../lib/api-error";
import { formatToman, formatUsd, snapshotToman, tomanToUsd } from "../../lib/currency";
import { formatJalaliDate } from "../../lib/date";
import { parseDecimalInput, sanitizeDecimalInput, toPersianDigits } from "../../lib/digits";
import { withAnchor } from "../../lib/priceAnchor";
import { formatQuantity } from "../../lib/toman-input";
import type { ProductPurchase } from "../../types/finance";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { JalaliDatePicker } from "../ui/JalaliDatePicker";
import { Modal } from "../ui/Modal";
import { Select } from "../ui/Select";
import { TomanInput } from "../ui/TomanInput";

const unitOptions = [
  { value: "عدد", label: "عدد" },
  { value: "بسته", label: "بسته" },
  { value: "کیلوگرم", label: "کیلوگرم" },
  { value: "لیتر", label: "لیتر" },
];

/** "  بوتاکس  دیستون " and "بوتاکس دیستون" are the same product. */
function normalizeName(name: string): string {
  return name
    .replace(/[\s‌]+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * A stored `purchase_date` (`2026-09-20`) as the `۱۴۰۵/۰۶/۲۹` string the picker
 * edits — a real calendar conversion, not just a separator swap, otherwise saving
 * would re-interpret the Gregorian year as a Jalali one.
 */
function gregorianToJalaliInput(value: string): string | null {
  if (!value) return null;
  const jalali = formatJalaliDate(value);
  if (!jalali || jalali === "—") return null;
  return toPersianDigits(jalali);
}

/**
 * Seed values for the form. Mounted fresh per purchase (the parent passes a
 * `key`), so editing always opens on the stored figures instead of syncing them
 * in through an effect.
 *
 * The unit price is seeded from the purchase's OWN rate snapshot, so the Toman
 * box round-trips back to the exact USD the backend stored; the live rate is only
 * used for the helper text and the new total.
 */
function initialForm(purchase: ProductPurchase | null) {
  if (!purchase) {
    return {
      productId: "",
      isNewProduct: false,
      newProductName: "",
      newProductUnit: "عدد",
      quantity: "1",
      unitCostToman: 0,
      supplier: "",
      purchaseDate: null as string | null,
    };
  }
  return {
    productId: String(purchase.product),
    isNewProduct: false,
    newProductName: "",
    newProductUnit: "عدد",
    quantity: String(parseDecimalInput(purchase.quantity)),
    unitCostToman: snapshotToman(purchase.unitCostUsd, purchase.exchangeRateSnapshot) ?? 0,
    supplier: purchase.supplier,
    purchaseDate: gregorianToJalaliInput(purchase.purchaseDate),
  };
}

interface PurchaseModalProps {
  open: boolean;
  onClose: () => void;
  /** Passed to edit an existing purchase; omit to record a new one. */
  purchase?: ProductPurchase | null;
  productName?: string;
  /** Called with the bought product so the page can reveal it. */
  onSaved?: (product: { id: number; name: string }) => void;
}

/**
 * «ثبت خرید» / «ویرایش خرید».
 *
 * Create mode records a stock entry, optionally creating the product first so a
 * brand-new item can be bought without leaving the modal. Edit mode changes an
 * existing purchase — the backend reverses the original receipt (stock, cost and
 * cost history) before re-applying it, so the product stays consistent. Editing
 * keeps the product fixed: swapping it would silently move stock between items.
 */
export function PurchaseModal({
  open,
  onClose,
  purchase = null,
  productName = "",
  onSaved,
}: PurchaseModalProps) {
  const isEditing = purchase != null;
  const [form, setForm] = useState(() => initialForm(purchase));
  const [formError, setFormError] = useState("");

  const {
    productId,
    isNewProduct,
    newProductName,
    newProductUnit,
    quantity,
    unitCostToman,
    supplier,
    purchaseDate,
  } = form;

  const setField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const { data: productsData } = useAllProducts();
  const { data: currentRate, isLoading: rateLoading } = useCurrentRate();
  const createPurchase = useCreatePurchase();
  const createProduct = useCreateProduct();
  const updatePurchase = useUpdatePurchase();

  const rate = useMemo(() => {
    const parsed = Number(currentRate?.rateTomanPerUsd ?? currentRate?.rate);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [currentRate]);

  // The Toman box is seeded from the purchase's own rate snapshot (see
  // initialForm); the live rate drives the helper text and the recomputed total.
  const unitUsd = unitCostToman > 0 ? tomanToUsd(unitCostToman, rate) : null;
  const qty = parseDecimalInput(quantity);
  const totalToman = unitCostToman * qty;
  const totalUsd = unitUsd !== null && qty > 0 ? tomanToUsd(totalToman, rate) : null;

  /** The catalogue already has this name — buying it needs no new product. */
  const duplicateName = useMemo(() => {
    const wanted = normalizeName(newProductName);
    if (!wanted) return null;
    return (productsData ?? []).find((p) => normalizeName(p.name) === wanted) ?? null;
  }, [newProductName, productsData]);

  const trimmedName = newProductName.trim();
  const isPending = createPurchase.isPending || createProduct.isPending || updatePurchase.isPending;

  const canSubmit =
    qty > 0 &&
    unitCostToman > 0 &&
    purchaseDate !== null &&
    rate !== null &&
    !isPending &&
    (isEditing ? true : isNewProduct ? trimmedName !== "" && !duplicateName : productId !== "");

  const resetForm = () => {
    setForm(initialForm(null));
    setFormError("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const selectExisting = (id: string) => {
    setField("productId", id);
    setField("isNewProduct", false);
    setField("newProductName", "");
    setFormError("");
  };

  const handleSave = async () => {
    setFormError("");
    if (isEditing) {
      if (qty <= 0) {
        setFormError("مقدار باید بزرگ‌تر از صفر باشد");
        return;
      }
      if (unitCostToman <= 0) {
        setFormError("بهای واحد الزامی است");
        return;
      }
      if (!purchaseDate) {
        setFormError("تاریخ خرید الزامی است");
        return;
      }
      try {
        await updatePurchase.mutateAsync({
          id: purchase.id,
          input: {
            quantity,
            unitCostToman,
            rate,
            supplier: supplier.trim(),
            purchaseDateJalali: purchaseDate,
          },
        });
        handleClose();
        onSaved?.({ id: purchase.product, name: productName });
      } catch (err: unknown) {
        setFormError(extractApiError(err));
      }
      return;
    }

    if (isNewProduct) {
      if (!trimmedName) {
        setFormError("نام محصول الزامی است");
        return;
      }
      if (duplicateName) {
        setFormError(`«${duplicateName.name}» از قبل در انبار ثبت شده است`);
        return;
      }
    } else if (!productId) {
      setFormError("انتخاب محصول الزامی است");
      return;
    }
    if (qty <= 0) {
      setFormError("مقدار باید بزرگ‌تر از صفر باشد");
      return;
    }
    if (unitCostToman <= 0) {
      setFormError("بهای واحد الزامی است");
      return;
    }
    if (!purchaseDate) {
      setFormError("تاریخ خرید الزامی است");
      return;
    }

    const money = {
      quantity,
      unitCostToman,
      rate,
      supplier: supplier.trim(),
      purchaseDateJalali: purchaseDate,
    } as const;

    try {
      let targetId = Number(productId);
      let targetName = trimmedName;
      if (isNewProduct) {
        // Price the new product exactly at the entered cost and pin it to a USD
        // anchor, so the inventory row renders in the same anchored 3-line format
        // as every other product (and floats with the rate from here on).
        const created = await createProduct.mutateAsync({
          name: trimmedName,
          stock: 0,
          unit: newProductUnit,
          unitPrice: unitCostToman,
          unitPriceUsd: unitUsd,
          description: withAnchor("", unitCostToman, rate),
        });
        targetId = created.id;
      } else {
        targetName =
          (productsData ?? []).find((p) => String(p.id) === productId)?.name ?? trimmedName;
      }
      await createPurchase.mutateAsync({ productId: targetId, ...money });
      handleClose();
      onSaved?.({ id: targetId, name: targetName });
    } catch (err: unknown) {
      setFormError(extractApiError(err));
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={isEditing ? "ویرایش خرید" : "ثبت خرید"}
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={handleClose}>
            انصراف
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={!canSubmit}>
            {isPending ? "در حال ذخیره..." : isEditing ? "ذخیره تغییرات" : "ثبت خرید"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {formError && <Alert variant="error">{formError}</Alert>}
        {!rateLoading && rate === null && <Alert variant="warning">نرخ ارز در دسترس نیست</Alert>}

        {isEditing ? (
          <>
            <Input label="محصول" value={productName || `#${purchase.product}`} disabled readOnly />
            <Alert variant="info">
              تغییر مقدار یا بهای واحد، موجودی و قیمت کالا را هم اصلاح می‌کند. اگر مقدار واردشده پیش
              از این خرید مصرف شده باشد، ذخیره انجام نمی‌شود.
            </Alert>
          </>
        ) : isNewProduct ? (
          <>
            <Input
              label="نام محصول جدید"
              value={newProductName}
              onChange={(e) => {
                setField("newProductName", e.target.value);
                setFormError("");
              }}
              placeholder="نام محصول را وارد کنید"
              error={
                duplicateName
                  ? `«${duplicateName.name}» از قبل ثبت شده — به‌جای ساخت دوباره، همان را انتخاب کنید`
                  : undefined
              }
            />
            {duplicateName && (
              <Button
                variant="outline"
                size="sm"
                className="self-start"
                onClick={() => selectExisting(String(duplicateName.id))}
              >
                انتخاب «{duplicateName.name}» موجود
              </Button>
            )}
            <Select
              label="واحد"
              options={unitOptions}
              placeholder="انتخاب واحد"
              value={newProductUnit}
              onChange={(e) => setField("newProductUnit", e.target.value)}
            />
            <button
              type="button"
              onClick={() => selectExisting("")}
              className="text-surface-500 hover:text-primary-600 self-start text-sm underline-offset-4 hover:underline"
            >
              بازگشت به انتخاب محصول موجود
            </button>
          </>
        ) : (
          <>
            <Select
              label="محصول"
              searchable
              options={[
                { value: "", label: "انتخاب محصول" },
                ...(productsData ?? []).map((p) => ({ value: String(p.id), label: p.name })),
              ]}
              value={productId}
              onChange={(e) => selectExisting(e.target.value)}
            />
            <Button
              variant="ghost"
              size="sm"
              className="self-start"
              startIcon={<BiPlus className="size-4" />}
              onClick={() => {
                setField("isNewProduct", true);
                setFormError("");
              }}
            >
              محصول در انبار نیست؟ محصول جدید بساز
            </Button>
          </>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="مقدار"
            value={quantity}
            inputMode="decimal"
            onChange={(e) => setField("quantity", sanitizeDecimalInput(e.target.value))}
            helperText={
              isEditing && purchase ? `ثبت‌شده: ${formatQuantity(purchase.quantity)}` : undefined
            }
          />
          <TomanInput
            label="بهای واحد (تومان)"
            value={unitCostToman}
            onChange={(value) => setField("unitCostToman", value)}
            helperText={unitUsd !== null && unitCostToman > 0 ? formatUsd(unitUsd) : undefined}
          />
        </div>
        {totalToman > 0 && qty > 0 && (
          <p className="text-surface-600 text-sm">
            بهای کل:{" "}
            <span dir="ltr" className="text-surface-900 font-medium">
              {formatUsd(totalUsd ?? 0)}
            </span>
            <span className="text-surface-400"> ({formatToman(totalToman)} تومان)</span>
          </p>
        )}
        <Input
          label="تأمین‌کننده"
          value={supplier}
          onChange={(e) => setField("supplier", e.target.value)}
        />
        <JalaliDatePicker
          label="تاریخ خرید"
          value={purchaseDate}
          onChange={(value) => setField("purchaseDate", value)}
        />
      </div>
    </Modal>
  );
}
