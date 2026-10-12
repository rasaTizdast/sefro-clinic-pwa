import { useMemo, useState } from "react";

import { useCreateService, useCurrentRate, useUpdateService } from "../../hooks/api";
import { extractApiError } from "../../lib/api-error";
import { tomanToUsd } from "../../lib/currency";
import { formatPrice, parseTomanAmount, serviceDisplayToman } from "../../lib/format";
import { serviceFormSchema } from "../../lib/validations";
import type { CompensationRole } from "../../types/finance";
import type { Service } from "../../types/service";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { Select } from "../ui/Select";
import { Textarea } from "../ui/Textarea";

interface ServiceFormModalProps {
  service?: Service | null;
  onClose: () => void;
}

const roleOptions = [
  { value: "doctor", label: "پزشک" },
  { value: "facial", label: "فیشال" },
  { value: "laser", label: "لیزر" },
];

const parseToman = (value: string): number => parseTomanAmount(value);

/**
 * Service create/edit form: Toman price (converted to USD on save) and
 * compensation-role select. Consumable recipes are managed elsewhere.
 */
export function ServiceFormModal({ service, onClose }: ServiceFormModalProps) {
  const [title, setTitle] = useState(service?.title ?? "");
  const [duration, setDuration] = useState(service ? String(service.duration) : "");
  const [priceToman, setPriceToman] = useState(
    service ? formatPrice(serviceDisplayToman(service)) : ""
  );
  const [description, setDescription] = useState(service?.description ?? "");
  const [role, setRole] = useState<CompensationRole>(service?.compensationRole ?? "doctor");
  const [isActive] = useState(service?.isActive ?? true);
  const [formError, setFormError] = useState("");

  const { data: currentRate, isLoading: rateLoading } = useCurrentRate();
  const createService = useCreateService();
  const updateService = useUpdateService();

  const rate = useMemo(() => {
    const parsed = Number(currentRate?.rateTomanPerUsd ?? currentRate?.rate);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [currentRate]);

  const rateMissing = !rateLoading && rate === null;
  const isPending = createService.isPending || updateService.isPending;
  const priceNumber = parseToman(priceToman);
  const priceUsdPreview = priceNumber > 0 ? tomanToUsd(priceNumber, rate) : null;

  const handleSave = async () => {
    setFormError("");
    const parsed = serviceFormSchema.safeParse({
      title: title.trim(),
      duration: parseToman(duration),
      priceToman: parseToman(priceToman),
      description,
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
        // No priceUsd: the backend derives the USD value from this Toman price at its current rate (ServiceSerializer.validate), so the pair can never disagree after an exchange-rate change.
        compensationRole: role,
        description: description.trim(),
        isActive,
      };
      if (service) {
        await updateService.mutateAsync({ id: service.id, data: payload });
      } else {
        await createService.mutateAsync(payload);
      }
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
            min={1}
            value={duration}
            onChange={(e) => setDuration(e.target.value.replace(/[^\d۰-۹٠-٩]/g, ""))}
            placeholder="مثال: ۳۰"
          />
          <Input
            label="قیمت (تومان)"
            value={priceToman}
            inputMode="numeric"
            onChange={(e) => {
              const num = parseToman(e.target.value);
              setPriceToman(num > 0 ? formatPrice(num) : "");
            }}
            placeholder="مثال: ۳۵۰٬۰۰۰"
          />
        </div>
        {priceNumber > 0 && (
          <p className="text-surface-500 -mt-2 text-xs">
            {formatPrice(priceNumber)} تومان
            {priceUsdPreview != null && (
              <span className="text-surface-400"> (${priceUsdPreview})</span>
            )}
          </p>
        )}
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="نقش اپراتور"
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
      </div>
    </Modal>
  );
}
