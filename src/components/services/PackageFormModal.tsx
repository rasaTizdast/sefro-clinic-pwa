import { useMemo, useState } from "react";
import { CiTrash } from "react-icons/ci";

import { useCurrentRate, useProductsList, useSavePackage, useServicesList } from "../../hooks/api";
import { tomanToUsd } from "../../lib/currency";
import { toLatinDigits } from "../../lib/digits";
import { formatPrice } from "../../lib/format";
import type { Package } from "../../types/finance";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { Select } from "../ui/Select";
import { Textarea } from "../ui/Textarea";
import { Toggle } from "../ui/Toggle";

interface PackageFormModalProps {
  pkg?: Package | null;
  onClose: () => void;
}

const parseToman = (value: string): number => {
  const latin = toLatinDigits(value.replace(/[^\d۰-۹٠-٩]/g, ""));
  return Number(latin) || 0;
};

/** Package CRUD form: Toman price (converted to USD), service multi-select, product rows. */
export function PackageFormModal({ pkg, onClose }: PackageFormModalProps) {
  const [name, setName] = useState(pkg?.name ?? "");
  const [description, setDescription] = useState(pkg?.description ?? "");
  const [priceToman, setPriceToman] = useState(
    pkg?.priceToman != null && Number(pkg.priceToman) > 0 ? formatPrice(Number(pkg.priceToman)) : ""
  );
  const [isActive, setIsActive] = useState(pkg?.isActive ?? true);
  const [serviceIds, setServiceIds] = useState<number[]>(pkg?.services ?? []);
  const [items, setItems] = useState<{ product: number; quantity: string }[]>(pkg?.items ?? []);
  const [formError, setFormError] = useState("");

  const { data: currentRate, isLoading: rateLoading } = useCurrentRate();
  const { data: servicesData } = useServicesList({ perPage: 100 });
  const { data: productsData } = useProductsList({ perPage: 100 });
  const savePackage = useSavePackage();

  const rate = useMemo(() => {
    const parsed = Number(currentRate?.rateTomanPerUsd ?? currentRate?.rate);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [currentRate]);

  const rateMissing = !rateLoading && rate === null;
  const totalToman = parseToman(priceToman);
  const canSubmit =
    name.trim().length > 0 && totalToman > 0 && !rateMissing && !savePackage.isPending;

  const toggleService = (id: number) => {
    setServiceIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const addItemRow = () => setItems((prev) => [...prev, { product: 0, quantity: "1.000" }]);

  const updateItem = (index: number, patch: Partial<{ product: number; quantity: string }>) => {
    setItems((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const removeItem = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index));

  const handleSave = async () => {
    setFormError("");
    const priceUsd = tomanToUsd(totalToman, rate);
    if (priceUsd === null) {
      setFormError("نرخ ارز در دسترس نیست");
      return;
    }
    try {
      await savePackage.mutateAsync({
        ...(pkg ? { id: pkg.id } : {}),
        name: name.trim(),
        description: description.trim(),
        priceUsd,
        isActive,
        serviceIds,
        items: items.filter((row) => row.product > 0),
      });
      onClose();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "خطا در ذخیره پکیج");
    }
  };

  const productOptions = useMemo(
    () => [
      { value: "", label: "انتخاب محصول" },
      ...(productsData?.data ?? []).map((p) => ({ value: String(p.id), label: p.name })),
    ],
    [productsData]
  );

  return (
    <Modal
      open
      onClose={onClose}
      title={pkg ? "ویرایش پکیج" : "پکیج جدید"}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            انصراف
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={!canSubmit}>
            {savePackage.isPending ? "در حال ذخیره..." : "ذخیره"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {formError && <Alert variant="error">{formError}</Alert>}
        {rateMissing && <Alert variant="warning">نرخ ارز در دسترس نیست</Alert>}

        <Input
          label="نام پکیج"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="مثال: پکیج لیزر فول‌بادی"
        />
        <Textarea
          label="توضیحات"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
        <Input
          label="قیمت (تومان)"
          value={priceToman}
          inputMode="numeric"
          onChange={(e) => setPriceToman(e.target.value)}
          placeholder="مثال: ۳٬۵۰۰٬۰۰۰"
        />

        <div className="flex flex-col gap-2">
          <span className="text-surface-700 text-sm font-medium">خدمات پکیج</span>
          <div className="flex max-h-40 flex-col gap-1 overflow-y-auto">
            {(servicesData?.data ?? []).map((service) => (
              <label key={service.id} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={serviceIds.includes(service.id)}
                  onChange={() => toggleService(service.id)}
                />
                <span className="text-surface-700">{service.title}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-surface-700 text-sm font-medium">مواد مصرفی پکیج</span>
            <Button variant="ghost" size="sm" onClick={addItemRow}>
              + افزودن ردیف
            </Button>
          </div>
          {items.map((row, index) => (
            <div key={index} className="flex items-end gap-2">
              <div className="grow">
                <Select
                  label="محصول"
                  options={productOptions}
                  value={row.product ? String(row.product) : ""}
                  onChange={(e) => updateItem(index, { product: Number(e.target.value) || 0 })}
                />
              </div>
              <div className="w-28">
                <Input
                  label="مقدار"
                  value={row.quantity}
                  inputMode="decimal"
                  onChange={(e) => updateItem(index, { quantity: e.target.value })}
                />
              </div>
              <button
                type="button"
                onClick={() => removeItem(index)}
                aria-label="حذف ردیف"
                className="text-danger-600 hover:bg-danger-50 cursor-pointer rounded-md p-2 transition-colors"
              >
                <CiTrash className="size-4" />
              </button>
            </div>
          ))}
        </div>

        <Toggle label="فعال" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
      </div>
    </Modal>
  );
}
