import { formatUsd } from "../../lib/currency";
import { formatPrice } from "../../lib/format";
import type { Service } from "../../types/service";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Modal } from "../ui/Modal";
import { type Column, Table } from "../ui/Table";

interface ServiceDetailModalProps {
  service: Service;
  onClose: () => void;
}

const money = (toman: string | null, usd: string) =>
  toman != null ? `${formatPrice(Number(toman))} تومان (${formatUsd(usd)})` : formatUsd(usd);

/** Service detail: consumables table + estimated cost / gross-profit / margin cards. */
export function ServiceDetailModal({ service, onClose }: ServiceDetailModalProps) {
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
      key: "cost",
      header: "هزینه",
      align: "end",
      render: (item) => (
        <span className="text-surface-700 text-sm">{money(null, item.totalCostUsd)}</span>
      ),
    },
  ];

  const cards = [
    { title: "هزینه تمام‌شده", value: money(service.estimatedCostToman, service.estimatedCostUsd) },
    {
      title: "سود ناخالص",
      value: money(service.estimatedGrossProfitToman, service.estimatedGrossProfitUsd),
    },
    { title: "حاشیه سود", value: `${service.estimatedMarginPercent}٪` },
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
        <div className="grid gap-4 sm:grid-cols-3">
          {cards.map((card) => (
            <Card key={card.title} variant="outlined" padding="lg">
              <div className="flex flex-col gap-1">
                <span className="text-surface-500 text-sm">{card.title}</span>
                <span className="text-surface-900 text-lg font-bold">{card.value}</span>
              </div>
            </Card>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-surface-700 text-sm font-medium">مواد مصرفی</span>
          {service.products.length > 0 ? (
            <Table columns={columns} data={service.products} rowKey={(item) => item.product} />
          ) : (
            <p className="text-surface-400 text-sm">ماده مصرفی ثبت نشده است.</p>
          )}
        </div>
      </div>
    </Modal>
  );
}
