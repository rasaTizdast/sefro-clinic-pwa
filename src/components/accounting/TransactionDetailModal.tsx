import type { Transaction } from "../../types/accounting";
import type { Service } from "../../types/service";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";

interface TransactionDetailModalProps {
  open: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  service?: Service;
}

const paymentMethodLabels: Record<string, string> = {
  cash: "نقدی",
  card: "کارت خوان",
  online: "آنلاین",
  cheque: "چک",
};

const statusConfig: Record<string, { label: string; variant: "success" | "danger" }> = {
  paid: { label: "پرداخت شده", variant: "success" },
  cancelled: { label: "لغو شده", variant: "danger" },
};

const formatPrice = (amount: number) => amount.toLocaleString("fa-IR");

export function TransactionDetailModal({
  open,
  onClose,
  transaction,
  service,
}: TransactionDetailModalProps) {
  if (!transaction) return null;

  const status = statusConfig[transaction.status];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="جزئیات تراکنش"
      size="md"
      footer={
        <Button variant="outline" onClick={onClose}>
          بستن
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <DetailField label="تاریخ" value={transaction.date} />
          <DetailField label="بیمار" value={transaction.patient} />
        </div>

        <DetailField label="توضیحات" value={transaction.description} />

        {service && (
          <div className="bg-surface-50 border-surface-200 rounded-lg border p-3">
            <span className="text-surface-500 text-xs font-medium">خدمت مرتبط</span>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-surface-900 text-sm font-medium">{service.title}</span>
              <span className="text-surface-500 text-xs">{service.duration} دقیقه</span>
            </div>
            {service.description && (
              <p className="text-surface-500 mt-1 text-xs">{service.description}</p>
            )}
          </div>
        )}

        <div className="bg-success-50 flex items-center justify-between rounded-lg p-3">
          <span className="text-surface-700 text-sm font-medium">مبلغ</span>
          <span className="text-success-700 text-lg font-bold">
            {formatPrice(transaction.amount)} تومان
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <DetailField
            label="روش پرداخت"
            value={paymentMethodLabels[transaction.paymentMethod] || transaction.paymentMethod}
          />
          <div className="flex flex-col gap-1">
            <span className="text-surface-500 text-xs font-medium">وضعیت</span>
            <Badge variant={status.variant} size="md">
              {status.label}
            </Badge>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-surface-500 text-xs font-medium">{label}</span>
      <span className="text-surface-900 text-sm">{value}</span>
    </div>
  );
}
