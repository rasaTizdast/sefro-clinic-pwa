import { useMemo, useState } from "react";
import { BiTrash } from "react-icons/bi";
import { MdAddCircleOutline } from "react-icons/md";

import { useAllProducts } from "../../hooks/api/useProductsQuery";
import { useRateValue } from "../../hooks/useRateValue";
import { formatUsd } from "../../lib/currency";
import { toLatinDigits, toPersianDigits } from "../../lib/digits";
import { productToConsumable, toPositiveQty } from "../../lib/extra-products";
import { consumableLineToman, formatPrice, parseTomanAmount } from "../../lib/format";
import type { ConsumableSelection } from "../../types/wizard";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { UsdTag } from "../ui/UsdTag";

/** Extra warehouse products (not in the service recipe) — billable to the patient. */
export function ExtraProductsBlock({
  extraProducts,
  onChange,
  reservedProductIds,
}: {
  extraProducts: ConsumableSelection[];
  onChange: (rows: ConsumableSelection[]) => void;
  reservedProductIds: Set<number>;
}) {
  const { data: productsData, isLoading, error } = useAllProducts();
  const rate = useRateValue();
  const [selectedId, setSelectedId] = useState("");
  const [qty, setQty] = useState("1");
  const [formError, setFormError] = useState("");

  const products = useMemo(() => productsData ?? [], [productsData]);
  const selectedIds = new Set(extraProducts.map((r) => r.product));

  const availableOptions = useMemo(
    () =>
      products
        .filter((p) => !selectedIds.has(p.id))
        .map((p) => {
          const unitToman = parseTomanAmount(p.unitPrice);
          const usdPart =
            rate != null && rate > 0 && unitToman > 0 ? ` / ${formatUsd(unitToman / rate)}` : "";
          return {
            value: String(p.id),
            label: `${p.name} — ${formatPrice(unitToman)} تومان${usdPart} (موجودی ${toPersianDigits(
              String(p.stock)
            )})`,
          };
        }),
    // selectedIds is derived each render; products is the stable dep
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [products, extraProducts, rate]
  );

  const handleAdd = () => {
    setFormError("");
    if (!selectedId) {
      setFormError("انتخاب محصول الزامی است");
      return;
    }
    const product = products.find((p) => p.id === Number(selectedId));
    if (!product) {
      setFormError("این محصول دیگر در دسترس نیست؛ لیست را تازه کنید");
      return;
    }
    if (selectedIds.has(product.id) || reservedProductIds.has(product.id)) {
      setFormError("این محصول قبلاً اضافه شده است");
      return;
    }
    if (product.stock <= 0) {
      setFormError("موجودی این محصول کافی نیست — ابتدا از بخش انبار شارژ کنید");
      return;
    }
    const quantity = toPositiveQty(qty);
    if (quantity === null) {
      setFormError("تعداد باید بزرگ‌تر از صفر باشد");
      return;
    }
    onChange([...extraProducts, productToConsumable(product, quantity)]);
    setSelectedId("");
    setQty("1");
  };

  const handleRemove = (productId: number) => {
    onChange(extraProducts.filter((r) => r.product !== productId));
  };

  const handleQtyChange = (productId: number, value: string) => {
    onChange(extraProducts.map((r) => (r.product === productId ? { ...r, quantity: value } : r)));
  };

  if (isLoading) {
    return (
      <div className="border-surface-200 mt-3 rounded-lg border p-3">
        <p className="text-surface-400 text-xs">در حال بارگذاری محصولات...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-3">
        <Alert variant="error">خطا در بارگذاری محصولات</Alert>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="border-surface-200 mt-3 rounded-lg border p-3">
        <p className="text-surface-500 text-xs">محصولی در انبار موجود نیست.</p>
      </div>
    );
  }

  return (
    <div className="border-surface-200 mt-3 border-t pt-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-surface-700 text-sm font-medium">محصولات این صورتحساب</p>
        {extraProducts.length > 0 && (
          <span className="text-surface-600 text-xs font-medium">{extraProducts.length} قلم</span>
        )}
      </div>

      {extraProducts.length > 0 && (
        <div className="mb-3 space-y-2">
          {extraProducts.map((row) => {
            const unit = parseTomanAmount(row.priceToman);
            const lineTotal = consumableLineToman(row);
            const qtyNum = Number(toLatinDigits(row.quantity));
            const qtyInvalid =
              row.quantity.trim() !== "" && (!Number.isFinite(qtyNum) || qtyNum <= 0);
            return (
              <div
                key={row.product}
                className="border-surface-200 flex flex-wrap items-center gap-2 rounded-md border bg-white px-2.5 py-2 text-xs"
              >
                <span className="text-surface-800 min-w-0 flex-1 truncate font-medium">
                  {row.productName}
                </span>
                <span className="text-surface-500 whitespace-nowrap">
                  واحد: {formatPrice(unit)} تومان
                  <UsdTag toman={unit} rate={rate} variant="inline" />
                </span>
                <div className="flex items-center gap-1.5">
                  <label
                    className="text-surface-400 text-[11px]"
                    htmlFor={`extra-qty-${row.product}`}
                  >
                    تعداد
                  </label>
                  <Input
                    id={`extra-qty-${row.product}`}
                    value={row.quantity}
                    inputMode="decimal"
                    containerClassName="w-20"
                    aria-invalid={qtyInvalid || undefined}
                    onChange={(e) => handleQtyChange(row.product, e.target.value)}
                  />
                </div>
                <span className="flex flex-col items-end">
                  <span className="text-surface-800 font-medium whitespace-nowrap">
                    جمع: {formatPrice(lineTotal)} تومان
                  </span>
                  <UsdTag toman={lineTotal} rate={rate} />
                </span>
                <button
                  type="button"
                  onClick={() => handleRemove(row.product)}
                  className="text-danger-500 hover:text-danger-700 hover:bg-danger-50 rounded p-1 transition-colors"
                  aria-label={`حذف ${row.productName}`}
                >
                  <BiTrash className="size-4" />
                </button>
                {qtyInvalid && (
                  <p className="text-danger-600 w-full text-[11px]">
                    تعداد باید عددی بزرگ‌تر از صفر باشد
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="border-surface-200 bg-surface-50 flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Select
            label="محصول جدید"
            searchable
            options={[{ value: "", label: "جستجو و انتخاب محصول…" }, ...availableOptions]}
            placeholder="جستجو و انتخاب محصول…"
            value={selectedId}
            onChange={(e) => {
              setSelectedId(e.target.value);
              setFormError("");
            }}
          />
        </div>
        <div className="sm:w-24">
          <Input
            label="تعداد"
            value={qty}
            inputMode="decimal"
            onChange={(e) => {
              setQty(e.target.value);
              setFormError("");
            }}
          />
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={handleAdd}
          className="w-full sm:mb-0.5 sm:w-auto"
          startIcon={<MdAddCircleOutline className="size-4" />}
        >
          افزودن محصول
        </Button>
      </div>
      {formError && (
        <p className="text-danger-600 mt-2 text-xs" role="alert">
          {formError}
        </p>
      )}
    </div>
  );
}
