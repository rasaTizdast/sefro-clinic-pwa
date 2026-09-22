import { formatUsd } from "../../lib/currency";
import { formatPrice } from "../../lib/format";
import type { CompensationRole } from "../../types/finance";
import type { Service } from "../../types/service";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Modal } from "../ui/Modal";
import { type Column, Table } from "../ui/Table";

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

const money = (toman: number | null, usd: number) =>
  toman != null ? `${formatPrice(Math.round(toman))} تومان (${formatUsd(usd)})` : formatUsd(usd);

/**
 * Service detail under the "fee + goods" model: the service price is labor only,
 * materials are billed on top, so finished price = fee + goods and real profit =
 * finished price minus the purchase cost of the materials.
 */
export function ServiceDetailModal({ service, onClose }: ServiceDetailModalProps) {
  const rate = toNum(service.exchangeRate);
  const usableRate = rate != null && rate > 0 ? rate : null;

  const tomanFromUsd = (usd: number): number | null =>
    usableRate == null ? null : usd * usableRate;

  const feeU = toNum(service.priceUsd) ?? 0;
  const feeT = toNum(service.priceToman) ?? tomanFromUsd(feeU);
  const goodsU = toNum(service.estimatedCostUsd) ?? 0;
  const goodsT = toNum(service.estimatedCostToman) ?? tomanFromUsd(goodsU);

  const finishedU = feeU + goodsU;
  const finishedT = feeT != null && goodsT != null ? feeT + goodsT : tomanFromUsd(finishedU);
  const gainU = finishedU - goodsU;
  const gainT = finishedT != null && goodsT != null ? finishedT - goodsT : tomanFromUsd(gainU);
  const margin = finishedU > 0 ? (gainU / finishedU) * 100 : 0;
  const goodsShare = finishedU > 0 ? (goodsU / finishedU) * 100 : 0;
  const gainShare = finishedU > 0 ? (gainU / finishedU) * 100 : 0;

  const columns: Column<(typeof service.products)[number]>[] = [
    { key: "name", header: "محصول" },
    {
      key: "quantity",
      header: "مقدار",
      align: "center",
      width: "90px",
      render: (item) => <span>{item.quantity}</span>,
    },
    {
      key: "unitCost",
      header: "قیمت واحد",
      align: "end",
      render: (item) => {
        const unit = toNum(item.unitCostUsd) ?? 0;
        return <span className="text-surface-700 text-sm">{money(tomanFromUsd(unit), unit)}</span>;
      },
    },
    {
      key: "cost",
      header: "هزینه",
      align: "end",
      render: (item) => {
        const total = toNum(item.totalCostUsd) ?? 0;
        return (
          <span className="text-surface-700 text-sm">{money(tomanFromUsd(total), total)}</span>
        );
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
          <Badge variant={service.compensationRole === "none" ? "default" : "success"} size="sm">
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

        {/* Fee + goods + finished + real profit */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card variant="outlined" padding="lg">
            <div className="flex flex-col gap-1">
              <span className="text-surface-500 text-sm">اجرت خدمت</span>
              <span className="text-surface-900 text-lg font-bold">{money(feeT, feeU)}</span>
              <span className="text-surface-400 text-xs leading-relaxed">
                دستمزد خدمت؛ بهای مواد داخل آن نیست
              </span>
            </div>
          </Card>
          <Card variant="outlined" padding="lg">
            <div className="flex flex-col gap-1">
              <span className="text-surface-500 text-sm">بهای مواد مصرفی</span>
              <span className="text-surface-900 text-lg font-bold">{money(goodsT, goodsU)}</span>
              <span className="text-surface-400 text-xs leading-relaxed">
                به قیمت خرید؛ همین مبلغ به صورتحساب مشتری اضافه می‌شود
              </span>
            </div>
          </Card>
          <Card variant="outlined" padding="lg" className="ring-primary-500 bg-primary-50 ring-2">
            <div className="flex flex-col gap-1">
              <span className="text-surface-500 text-sm">مبلغ نهایی مشتری</span>
              <span className="text-primary-700 text-lg font-bold">
                {money(finishedT, finishedU)}
              </span>
              <span className="text-surface-400 text-xs leading-relaxed">
                اجرت + مواد = مبلغ تمام‌شده‌ای که از مشتری دریافت می‌شود
              </span>
            </div>
          </Card>
          <Card variant="outlined" padding="lg">
            <div className="flex flex-col gap-1">
              <span className="text-surface-500 text-sm">سود واقعی خدمت</span>
              <span className="text-surface-900 text-lg font-bold">{money(gainT, gainU)}</span>
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
              {finishedT != null && feeT != null && goodsT != null && (
                <>
                  {formatPrice(Math.round(finishedT))} = {formatPrice(Math.round(feeT))} +{" "}
                  {formatPrice(Math.round(goodsT))}
                </>
              )}
            </div>
            <div className="text-surface-600 bg-surface-50 rounded-lg px-3 py-2 text-center text-sm leading-loose">
              حاشیه سود واقعی = (سود واقعی ÷ مبلغ نهایی) × ۱۰۰ ={" "}
              {formatPrice(Number(margin.toFixed(1)))}٪
            </div>
            <div className="bg-surface-200 flex h-4 overflow-hidden rounded-full" dir="ltr">
              {goodsShare > 0 && (
                <div
                  className="bg-danger-500 h-full"
                  style={{ width: `${goodsShare}%` }}
                  title={`سهم مواد از مبلغ نهایی: ${goodsShare.toFixed(1)}%`}
                />
              )}
              {gainShare > 0 && (
                <div
                  className="bg-success-500 h-full"
                  style={{ width: `${gainShare}%` }}
                  title={`سهم سود از مبلغ نهایی: ${gainShare.toFixed(1)}%`}
                />
              )}
            </div>
            <div className="flex gap-4 text-xs">
              <span className="text-danger-600 flex items-center gap-1">
                <span className="bg-danger-500 h-3 w-3 rounded" />
                بهای مواد
              </span>
              <span className="text-success-600 flex items-center gap-1">
                <span className="bg-success-500 h-3 w-3 rounded" />
                سود واقعی
              </span>
            </div>
          </div>
        </Card>

        {/* Consumables */}
        <div className="flex flex-col gap-2">
          <span className="text-surface-700 text-sm font-medium">مواد مصرفی این خدمت</span>
          {service.products.length > 0 ? (
            <>
              <Table columns={columns} data={service.products} rowKey={(item) => item.product} />
              <div className="text-surface-600 text-sm">جمع بهای مواد: {money(goodsT, goodsU)}</div>
            </>
          ) : (
            <p className="text-surface-400 text-sm">ماده مصرفی ثبت نشده است.</p>
          )}
        </div>
      </div>
    </Modal>
  );
}
