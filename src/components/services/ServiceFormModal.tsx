import { useMemo, useState } from "react";
import { CiTrash } from "react-icons/ci";

import {
  useCreateService,
  useCurrentRate,
  useProductsList,
  useServiceCategories,
  useSyncServiceItems,
  useUpdateService,
} from "../../hooks/api";
import { extractApiError } from "../../lib/api-error";
import { tomanToUsd } from "../../lib/currency";
import { toLatinDigits } from "../../lib/digits";
import { formatPrice } from "../../lib/format";
import { serviceFormSchema } from "../../lib/validations";
import type { CompensationRole } from "../../types/finance";
import type { Service } from "../../types/service";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { Select } from "../ui/Select";
import { Textarea } from "../ui/Textarea";
import { Toggle } from "../ui/Toggle";

interface ServiceFormModalProps {
  service?: Service | null;
  onClose: () => void;
}

const roleOptions = [
  { value: "none", label: "بدون پورسانت" },
  { value: "doctor", label: "پزشک" },
  { value: "facial", label: "فیشال" },
  { value: "laser", label: "لیزر" },
];

const parseToman = (value: string): number => {
  const latin = toLatinDigits(value.replace(/[^\d۰-۹٠-٩]/g, ""));
  return Number(latin) || 0;
};

/**
 * Service create/edit form: Toman price (converted to USD on save), category +
 * compensation-role selects, and repeatable «مواد مصرفی» rows synced after save.
 */
export function ServiceFormModal({ service, onClose }: ServiceFormModalProps) {
  const [title, setTitle] = useState(service?.title ?? "");
  const [duration, setDuration] = useState(service ? String(service.duration) : "");
  const [priceToman, setPriceToman] = useState(
    service
      ? formatPrice(service.priceToman != null ? Number(service.priceToman) : service.price)
      : ""
  );
  const [description, setDescription] = useState(service?.description ?? "");
  const [categoryId, setCategoryId] = useState(
    service?.category ? String(service.category.id) : ""
  );
  const [role, setRole] = useState<CompensationRole>(service?.compensationRole ?? "none");
  const [isActive, setIsActive] = useState(service?.isActive ?? true);
  const [items, setItems] = useState<{ product: number; quantity: string }[]>(() =>
    (service?.products ?? []).map((row) => ({ product: row.product, quantity: row.quantity }))
  );
  const [formError, setFormError] = useState("");

  const { data: currentRate, isLoading: rateLoading } = useCurrentRate();
  const { data: categoriesData } = useServiceCategories();
  const { data: productsData } = useProductsList({ perPage: 100 });
  const createService = useCreateService();
  const updateService = useUpdateService();
  const syncItems = useSyncServiceItems();

  const rate = useMemo(() => {
    const parsed = Number(currentRate?.rateTomanPerUsd ?? currentRate?.rate);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [currentRate]);

  const rateMissing = !rateLoading && rate === null;
  const isPending = createService.isPending || updateService.isPending || syncItems.isPending;

  const categoryOptions = useMemo(
    () => [
      { value: "", label: "بدون دسته‌بندی" },
      ...(categoriesData ?? []).map((c) => ({ value: String(c.id), label: c.name })),
    ],
    [categoriesData]
  );

  const productOptions = useMemo(
    () => [
      { value: "", label: "انتخاب محصول" },
      ...(productsData?.data ?? []).map((p) => ({ value: String(p.id), label: p.name })),
    ],
    [productsData]
  );

  const addItemRow = () => setItems((prev) => [...prev, { product: 0, quantity: "1.000" }]);
  const updateItem = (index: number, patch: Partial<{ product: number; quantity: string }>) =>
    setItems((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const removeItem = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index));

  const handleSave = async () => {
    setFormError("");
    const parsed = serviceFormSchema.safeParse({
      title: title.trim(),
      duration: parseToman(duration),
      priceToman: parseToman(priceToman),
      description,
      categoryId,
      compensationRole: role,
    });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "ورودی نامعتبر است");
      return;
    }
    const priceUsd = tomanToUsd(parsed.data.priceToman, rate);
    if (priceUsd === null) {
      setFormError("نرخ ارز در دسترس نیست");
      return;
    }
    try {
      const payload: Record<string, unknown> = {
        title: parsed.data.title,
        duration: parsed.data.duration,
        price: parsed.data.priceToman,
        priceUsd,
        categoryId: categoryId ? Number(categoryId) : null,
        compensationRole: role,
        description: description.trim(),
        isActive,
      };
      const saved = service
        ? await updateService.mutateAsync({ id: service.id, data: payload })
        : await createService.mutateAsync(payload);
      const cleanItems = items.filter((row) => row.product > 0);
      await syncItems.mutateAsync({ serviceId: saved.id, items: cleanItems });
      onClose();
    } catch (err: unknown) {
      setFormError(extractApiError(err));
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={service ? "ویرایش خدمت" : "خدمت جدید"}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            انصراف
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={isPending || !title || !priceToman}
          >
            {isPending ? "در حال ذخیره..." : "ذخیره"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {formError && <Alert variant="error">{formError}</Alert>}
        {rateMissing && <Alert variant="warning">نرخ ارز در دسترس نیست</Alert>}

        <Input
          label="نام خدمت"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="مثال: فیشال صورت"
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="مدت زمان (دقیقه)"
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="مثال: ۳۰"
          />
          <Input
            label="قیمت (تومان)"
            value={priceToman}
            inputMode="numeric"
            onChange={(e) => setPriceToman(e.target.value)}
            placeholder="مثال: ۳۵۰٬۰۰۰"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="دسته‌بندی"
            options={categoryOptions}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          />
          <Select
            label="نقش پورسانت"
            options={roleOptions}
            value={role}
            onChange={(e) => setRole(e.target.value as CompensationRole)}
          />
        </div>
        <Textarea
          label="توضیحات"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-surface-700 text-sm font-medium">مواد مصرفی</span>
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
