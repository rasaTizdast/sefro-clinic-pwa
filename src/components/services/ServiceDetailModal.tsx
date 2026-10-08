import { useAllProducts } from "../../hooks/api/useProductsQuery";
import { formatUsd } from "../../lib/currency";
import { ceilUp, formatPrice, parseTomanAmount } from "../../lib/format";
import type { CompensationRole } from "../../types/finance";
import type { Service, ServiceConsumable } from "../../types/service";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Modal } from "../ui/Modal";
import { type Column, Table } from "../ui/Table";
import { UsdTag } from "../ui/UsdTag";

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

/**
 * Service detail under the "fee + billable goods" model: the service price is
 * labor only, materials are billed on top AT THEIR CUSTOMER-FACING UNIT PRICE
 * (Product.unit_price — the same basis the wizard bills), so
 * finished price = fee + goods and real profit = finished price minus the
 * purchase cost of the materials (estimated cost, never billed as-is).
 */
export function ServiceDetailModal({ service, onClose }: ServiceDetailModalProps) {
  const rate = toNum(service.exchangeRate);
  const usableRate = rate != null && rate > 0 ? rate : null;

  const tomanFromUsd = (usd: number): number | null =>
    usableRate == null ? null : usd * usableRate;

  const { data: productsData } = useAllProducts();
  const unitPriceByProduct = new Map(
    (productsData ?? []).map((p) => [p.id, parseTomanAmount(p.unitPrice)])
  );

  const lineBillableToman = (item: ServiceConsumable): number | null => {
    const unit = unitPriceByProduct.get(item.product);
    const qty = Number(item.quantity);
    if (unit == null || !Number.isFinite(qty)) return null;
    return ceilUp(unit * qty);
  };

  const feeU = toNum(service.priceUsd) ?? 0;
  const feeT = toNum(service.priceToman) ?? tomanFromUsd(feeU);
  // Purchase cost of the materials — used for profit only, never billed.
  const costU = toNum(service.estimatedCostUsd) ?? 0;
  const costT = toNum(service.estimatedCostToman) ?? tomanFromUsd(costU);

  // Customer-billable goods at Product.unit_price (null until prices are loaded).
  let billT: number | null = 0;
  if (service.products.length > 0) {
    const lines = service.products.map(lineBillableToman);
    billT = lines.every((line): line is number => line != null)
      ? lines.reduce((sum, line) => sum + line, 0)
      : null;
  }
  const billU = billT != null && usableRate != null ? billT / usableRate : null;

  const finishedT = billT != null && feeT != null ? feeT + billT : null;
  const finishedU = billU != null ? feeU + billU : null;
  const gainT = finishedT != null && costT != null ? finishedT - costT : null;
  const gainU = finishedU != null ? finishedU - costU : null;
  const margin =
    finishedU != null && finishedU > 0 && gainU != null ? (gainU / finishedU) * 100 : 0;
  const billShare =
    finishedT != null && billT != null && finishedT > 0 ? (billT / finishedT) * 100 : 0;
  const gainShare =
    finishedT != null && gainT != null && finishedT > 0 ? (gainT / finishedT) * 100 : 0;

  const columns: Column<ServiceConsumable>[] = [
    { key: "name", header: "محصول" },
    {
      key: "quantity",
      header: "مقدار",
      align: "center",
      width: "90px",
      render: (item) => <span>{item.quantity}</span>,
    },
    {
      key: "unitPrice",
      header: "قیمت واحد",
      align: "end",
      render: (item) => {
        const unit = unitPriceByProduct.get(item.product);
        if (unit == null) return <span className="text-surface-700 text-sm">—</span>;
        return (
          <span className="flex flex-col items-end gap-0.5">
            <span className="text-surface-700 text-sm">{formatPrice(unit)} تومان</span>
            <UsdTag toman={unit} rate={usableRate} />
          </span>
        );
      },
    },
    {
      key: "amount",
      header: "مبلغ",
      align: "end",
      render: (item) => {
        const line = lineBillableToman(item);
        const usd = line != null && usableRate != null ? line / usableRate : null;
        return <span className="text-surface-700 text-sm">{fmt(line, usd)}</span>;
      },
    },
  ];

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
          {service.category ? (
            <Badge variant="info" size="sm">
              {service.category.name}
            </Badge>
          ) : (
            <Badge variant="default" size="sm">
              بدون دسته‌بندی
            </Badge>
          )}
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

        {/* Fee + billable goods + finished + real profit */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card variant="outlined" padding="lg">
            <div className="flex flex-col gap-1">
              <span className="text-surface-500 text-sm">اجرت خدمت</span>
              <span className="text-surface-900 text-lg font-bold">{fmt(feeT, feeU)}</span>
              <span className="text-surface-400 text-xs leading-relaxed">
                دستمزد خدمت؛ بهای مواد داخل آن نیست
              </span>
            </div>
          </Card>
          <Card variant="outlined" padding="lg">
            <div className="flex flex-col gap-1">
              <span className="text-surface-500 text-sm">بهای مواد مصرفی</span>
              <span className="text-surface-900 text-lg font-bold">{fmt(billT, billU)}</span>
              <span className="text-surface-400 text-xs leading-relaxed">
                به قیمت فروش واحد محصول؛ همین مبلغ به صورتحساب مشتری اضافه می‌شود
              </span>
            </div>
          </Card>
          <Card variant="outlined" padding="lg" className="ring-primary-500 bg-primary-50 ring-2">
            <div className="flex flex-col gap-1">
              <span className="text-surface-500 text-sm">مبلغ نهایی مشتری</span>
              <span className="text-primary-700 text-lg font-bold">
                {fmt(finishedT, finishedU)}
              </span>
              <span className="text-surface-400 text-xs leading-relaxed">
                اجرت + مواد = مبلغ تمام‌شده‌ای که از مشتری دریافت می‌شود
              </span>
            </div>
          </Card>
          <Card variant="outlined" padding="lg">
            <div className="flex flex-col gap-1">
              <span className="text-surface-500 text-sm">سود واقعی خدمت</span>
              <span className="text-surface-900 text-lg font-bold">{fmt(gainT, gainU)}</span>
              <span className="text-surface-400 text-xs leading-relaxed">
                مبلغ نهایی منهای بهای خرید مواد؛ سهم اپراتور جداگانه در تسویه‌ها کسر می‌شود
              </span>
            </div>
          </Card>
        </div>

        {/* How the numbers connect */}
        <Card variant="outlined" padding="md">
          <div className="flex flex-col gap-3">
            <span className="text-surface-700 text-sm font-medium">تحلیل مبلغ نهایی</span>
            <div className="text-surface-600 bg-surface-50 rounded-lg px-3 py-2 text-center text-sm leading-loose">
              مبلغ نهایی = اجرت + مواد
              <br />
              {finishedT != null && feeT != null && billT != null && (
                <>
                  {formatPrice(ceilUp(finishedT))} = {formatPrice(ceilUp(feeT))} +{" "}
                  {formatPrice(ceilUp(billT))}
                </>
              )}
            </div>
            <div className="text-surface-600 bg-surface-50 rounded-lg px-3 py-2 text-center text-sm leading-loose">
              حاشیه سود واقعی = (سود واقعی ÷ مبلغ نهایی) × ۱۰۰ ={" "}
              {formatPrice(Number(margin.toFixed(1)))}٪
              <br />
              <span className="text-surface-500 text-xs">
                بهای خرید مواد (پایه سود): {fmt(costT, costU)}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-1">
                <span className="text-surface-500 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1">
                    <span className="bg-danger-500 h-3 w-3 rounded" />
                    سهم مواد از مبلغ نهایی
                  </span>
                  <span>{billShare.toFixed(1)}٪</span>
                </span>
                <div className="bg-surface-200 h-4 overflow-hidden rounded-full" dir="ltr">
                  <div
                    className="bg-danger-500 h-full"
                    style={{ width: `${Math.min(billShare, 100)}%` }}
                    title={`سهم مواد از مبلغ نهایی: ${billShare.toFixed(1)}%`}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-surface-500 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1">
                    <span className="bg-success-500 h-3 w-3 rounded" />
                    سهم سود واقعی از مبلغ نهایی
                  </span>
                  <span>{gainShare.toFixed(1)}٪</span>
                </span>
                <div className="bg-surface-200 h-4 overflow-hidden rounded-full" dir="ltr">
                  <div
                    className="bg-success-500 h-full"
                    style={{ width: `${Math.min(gainShare, 100)}%` }}
                    title={`سهم سود از مبلغ نهایی: ${gainShare.toFixed(1)}%`}
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Consumables */}
        <div className="flex flex-col gap-2">
          <span className="text-surface-700 text-sm font-medium">مواد مصرفی این خدمت</span>
          {service.products.length > 0 ? (
            <>
              <Table columns={columns} data={service.products} rowKey={(item) => item.product} />
              <div className="text-surface-600 text-sm">
                جمع مواد (به صورتحساب مشتری): {fmt(billT, billU)}
              </div>
            </>
          ) : (
            <p className="text-surface-400 text-sm">ماده مصرفی ثبت نشده است.</p>
          )}
        </div>
      </div>
    </Modal>
  );
}
