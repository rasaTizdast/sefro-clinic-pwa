import { formatUsd } from "../../lib/currency";
import { ceilUp, formatPrice } from "../../lib/format";
import type { CompensationRole } from "../../types/finance";
import type { Service } from "../../types/service";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Modal } from "../ui/Modal";

interface ServiceDetailModalProps {
  service: Service;
  onClose: () => void;
}

const roleLabels: Record<CompensationRole, string> = {
  doctor: "پزشک",
  facial: "فیشال",
  laser: "لیزر",
  none: "بدون اپراتور",
};

const toNum = (value: string | number | null | undefined): number | null => {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

/** Renders a money pair, "—" when a side is unknown (e.g. rate missing). */
const fmt = (toman: number | null, usd: number | null): string => {
  if (toman != null && usd != null)
    return `${formatPrice(ceilUp(toman))} تومان (${formatUsd(usd)})`;
  if (toman != null) return `${formatPrice(ceilUp(toman))} تومان`;
  if (usd != null) return formatUsd(usd);
  return "—";
};

/** Read-only service detail: duration, role, status, description and price. */
export function ServiceDetailModal({ service, onClose }: ServiceDetailModalProps) {
  const rate = toNum(service.exchangeRate);
  const usableRate = rate != null && rate > 0 ? rate : null;

  const tomanFromUsd = (usd: number): number | null =>
    usableRate == null ? null : usd * usableRate;

  const feeU = toNum(service.priceUsd) ?? 0;
  const feeT = toNum(service.priceToman) ?? tomanFromUsd(feeU);

  return (
    <Modal
      open
      onClose={onClose}
      title={service.title}
      size="lg"
      footer={
        <Button variant="outline" onClick={onClose}>
          بستن
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Meta + description */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="default" size="sm">
            {formatPrice(service.duration)} دقیقه
          </Badge>
          <Badge variant="success" size="sm">
            {roleLabels[service.compensationRole]}
          </Badge>
          <Badge variant={service.isActive ? "success" : "warning"} size="sm">
            {service.isActive ? "فعال" : "غیرفعال"}
          </Badge>
        </div>
        <p className="text-surface-600 text-sm leading-relaxed">
          {service.description?.trim()
            ? service.description
            : "توضیحاتی برای این خدمت ثبت نشده است."}
        </p>

        <Card variant="outlined" padding="lg">
          <div className="flex flex-col gap-1">
            <span className="text-surface-500 text-sm">قیمت خدمت</span>
            <span className="text-surface-900 text-lg font-bold">{fmt(feeT, feeU)}</span>
          </div>
        </Card>
      </div>
    </Modal>
  );
}
