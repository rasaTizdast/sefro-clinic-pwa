import { useMemo, useState } from "react";

import { useAllServices, useCurrentRate, useSavePackage } from "../../hooks/api";
import { extractApiError } from "../../lib/api-error";
import { tomanToUsd } from "../../lib/currency";
import { formatPrice, parseTomanAmount } from "../../lib/format";
import type { Package } from "../../types/finance";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { Textarea } from "../ui/Textarea";
import { Toggle } from "../ui/Toggle";

interface PackageFormModalProps {
  pkg?: Package | null;
  onClose: () => void;
}

const parseToman = (value: string): number => parseTomanAmount(value);

/** Package CRUD form: Toman price (converted to USD) and service multi-select. */
export function PackageFormModal({ pkg, onClose }: PackageFormModalProps) {
  const [name, setName] = useState(pkg?.name ?? "");
  const [description, setDescription] = useState(pkg?.description ?? "");
  const [priceToman, setPriceToman] = useState(
    pkg?.priceToman != null && Number(pkg.priceToman) > 0
      ? formatPrice(parseTomanAmount(pkg.priceToman))
      : ""
  );
  const [isActive, setIsActive] = useState(pkg?.isActive ?? true);
  const [serviceIds, setServiceIds] = useState<number[]>(pkg?.services ?? []);
  const [formError, setFormError] = useState("");

  const { data: currentRate, isLoading: rateLoading } = useCurrentRate();
  const { data: servicesData } = useAllServices();
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

  const handleSave = async () => {
    setFormError("");
    const priceUsd = tomanToUsd(totalToman, rate);
    if (priceUsd === null) {
      setFormError("نرخ ارز در دسترس نیست");
      return;
    }
    try {
      // No `items` key: omitting it keeps the backend recipe untouched.
      await savePackage.mutateAsync({
        ...(pkg ? { id: pkg.id } : {}),
        name: name.trim(),
        description: description.trim(),
        priceUsd,
        isActive,
        serviceIds,
      });
      onClose();
    } catch (err: unknown) {
      setFormError(extractApiError(err));
    }
  };

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
          onChange={(e) => {
            const num = parseToman(e.target.value);
            setPriceToman(num > 0 ? formatPrice(num) : "");
          }}
          placeholder="مثال: ۳٬۵۰۰٬۰۰۰"
        />

        <div className="flex flex-col gap-2">
          <span className="text-surface-700 text-sm font-medium">خدمات پکیج</span>
          <div className="flex max-h-40 flex-col gap-1 overflow-y-auto">
            {(servicesData ?? []).map((service) => (
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

        <Toggle label="فعال" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
      </div>
    </Modal>
  );
}
