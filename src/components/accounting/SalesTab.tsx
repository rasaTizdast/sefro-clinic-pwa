import { useMemo, useState } from "react";
import { BiPlus } from "react-icons/bi";

import { useCustomersList, usePackagesList, useSalesList } from "../../hooks/api";
import { usePermissions } from "../../hooks/usePermissions";
import { formatJalaliDate } from "../../lib/date";
import { toLatinDigits } from "../../lib/digits";
import { formatPrice } from "../../lib/format";
import type { Sale, SaleStatus } from "../../types/finance";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { Pagination } from "../ui/Pagination";
import { Select } from "../ui/Select";
import { type Column, Table } from "../ui/Table";
import { CheckoutModal } from "./CheckoutModal";
import { RefundModal } from "./RefundModal";

const saleStatusConfig: Record<
  SaleStatus,
  { label: string; variant: "success" | "warning" | "danger" | "info" | "default" }
> = {
  paid: { label: "پرداخت‌شده", variant: "success" },
  refunded: { label: "مسترد", variant: "danger" },
  partially_refunded: { label: "جزئی", variant: "warning" },
  cancelled: { label: "لغو", variant: "default" },
  pending: { label: "در انتظار", variant: "info" },
};

const statusFilterOptions = [
  { value: "", label: "همه وضعیت‌ها" },
  { value: "paid", label: "پرداخت‌شده" },
  { value: "pending", label: "در انتظار" },
  { value: "partially_refunded", label: "جزئی" },
  { value: "refunded", label: "مسترد" },
  { value: "cancelled", label: "لغو" },
];

const PAGE_SIZE = 20;

const parseToman = (value: string): number => {
  const latin = toLatinDigits(value.replace(/[^\d۰-۹٠-٩]/g, ""));
  return Number(latin) || 0;
};

export function SalesTab() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [refundSale, setRefundSale] = useState<Sale | null>(null);
  const [newSaleOpen, setNewSaleOpen] = useState(false);
  const [newCustomerId, setNewCustomerId] = useState("");
  const [newPackageId, setNewPackageId] = useState("");
  const [newTotal, setNewTotal] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const { canManageFinance } = usePermissions();
  const { data: paginated, isLoading } = useSalesList({
    page,
    perPage: PAGE_SIZE,
    ...(status ? { status: status as SaleStatus } : {}),
  });
  const { data: customersData } = useCustomersList({ perPage: 200 });
  const { data: packagesData } = usePackagesList({ perPage: 100 });

  const customerNames = useMemo(() => {
    const map = new Map<number, string>();
    for (const c of customersData?.data ?? []) map.set(c.id, `${c.firstName} ${c.lastName}`.trim());
    return map;
  }, [customersData]);

  const sales = paginated?.data ?? [];
  const totalPages = paginated?.totalPages ?? 1;

  const startCheckout = () => {
    if (!newCustomerId || parseToman(newTotal) <= 0) return;
    setNewSaleOpen(false);
    setCheckoutOpen(true);
  };

  const columns: Column<Sale>[] = [
    {
      key: "id",
      header: "شناسه",
      width: "80px",
      align: "center",
      render: (item) => <span>#{item.id}</span>,
    },
    {
      key: "customer",
      header: "بیمار",
      render: (item) => <span>{customerNames.get(item.customer) ?? `#${item.customer}`}</span>,
    },
    {
      key: "amount",
      header: "مبلغ",
      align: "end",
      render: (item) => (
        <span>
          <span className="text-surface-900 font-medium">
            {formatPrice(Number(item.amountToman))} تومان
          </span>{" "}
          <span className="text-surface-400 text-xs">${item.amountUsd}</span>
        </span>
      ),
    },
    {
      key: "status",
      header: "وضعیت",
      align: "center",
      width: "110px",
      render: (item) => {
        const s = saleStatusConfig[item.status];
        return (
          <Badge variant={s.variant} size="sm">
            {s.label}
          </Badge>
        );
      },
    },
    {
      key: "createdAt",
      header: "تاریخ",
      align: "center",
      width: "110px",
      render: (item) => <span>{formatJalaliDate(item.createdAt)}</span>,
    },
    ...(canManageFinance
      ? [
          {
            key: "actions",
            header: "عملیات",
            align: "center" as const,
            width: "110px",
            render: (item: Sale) =>
              item.status === "paid" ? (
                <Button variant="ghost" size="sm" onClick={() => setRefundSale(item)}>
                  استرداد
                </Button>
              ) : null,
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Select
          label="وضعیت"
          options={statusFilterOptions}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        />
        <div className="me-auto" />
        <Button
          variant="primary"
          startIcon={<BiPlus className="size-5" />}
          onClick={() => setNewSaleOpen(true)}
        >
          فروش جدید
        </Button>
      </div>

      <Card variant="outlined" padding="none">
        <Table
          columns={columns}
          data={sales}
          rowKey={(item) => item.id}
          loading={isLoading}
          className="rounded-none border-0"
        />
        {totalPages > 1 && (
          <div className="border-surface-200 flex items-center justify-center border-t px-5 py-4">
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </Card>

      {refundSale && <RefundModal sale={refundSale} onClose={() => setRefundSale(null)} />}

      <Modal
        open={newSaleOpen}
        onClose={() => setNewSaleOpen(false)}
        title="فروش جدید"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setNewSaleOpen(false)}>
              انصراف
            </Button>
            <Button
              variant="primary"
              onClick={startCheckout}
              disabled={!newCustomerId || parseToman(newTotal) <= 0}
            >
              ادامه به تسویه
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Select
            label="بیمار"
            options={(customersData?.data ?? []).map((c) => ({
              value: String(c.id),
              label: `${c.firstName} ${c.lastName}`.trim(),
            }))}
            value={newCustomerId}
            onChange={(e) => setNewCustomerId(e.target.value)}
          />
          <Select
            label="پکیج (اختیاری)"
            options={[
              { value: "", label: "بدون پکیج" },
              ...(packagesData?.data ?? []).map((p) => ({ value: String(p.id), label: p.name })),
            ]}
            value={newPackageId}
            onChange={(e) => setNewPackageId(e.target.value)}
          />
          <Input
            label="مبلغ کل (تومان)"
            value={newTotal}
            inputMode="numeric"
            onChange={(e) => setNewTotal(e.target.value)}
          />
        </div>
      </Modal>

      {checkoutOpen && (
        <CheckoutModal
          open
          onClose={() => setCheckoutOpen(false)}
          customerId={Number(newCustomerId)}
          packageId={newPackageId ? Number(newPackageId) : null}
          defaultTotalToman={parseToman(newTotal)}
        />
      )}
    </div>
  );
}
