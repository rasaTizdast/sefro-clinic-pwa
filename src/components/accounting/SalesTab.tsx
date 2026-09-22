import { useMemo, useState } from "react";
import { BiCreditCard, BiPlus, BiTrash } from "react-icons/bi";

import {
  useCustomersList,
  usePackagesList,
  useSalesList,
  useServicesList,
  useVisitsList,
} from "../../hooks/api";
import { usePermissions } from "../../hooks/usePermissions";
import { formatJalaliDate } from "../../lib/date";
import { toLatinDigits } from "../../lib/digits";
import { formatPrice } from "../../lib/format";
import type { Appointment } from "../../types/appointment";
import type { Sale, SaleStatus } from "../../types/finance";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { Pagination } from "../ui/Pagination";
import { Select } from "../ui/Select";
import { type Column, Table } from "../ui/Table";
import { Tooltip } from "../ui/Tooltip";
import { CheckoutModal } from "./CheckoutModal";
import { RefundModal } from "./RefundModal";
import { VisitCheckoutModal } from "./VisitCheckoutModal";

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
  const [newTotalHint, setNewTotalHint] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutVisitId, setCheckoutVisitId] = useState<number | null>(null);

  const { canManageFinance } = usePermissions();
  const { data: paginated, isLoading } = useSalesList({
    page,
    perPage: PAGE_SIZE,
    ...(status ? { status: status as SaleStatus } : {}),
  });
  const { data: customersData } = useCustomersList({ perPage: 200 });
  const { data: packagesData } = usePackagesList({ perPage: 100 });
  const { data: servicesData } = useServicesList({ perPage: 200 });
  const { data: visitsData, isLoading: visitsLoading } = useVisitsList({
    status: "completed",
    perPage: 200,
  });

  // Package price lookup
  const packagePrices = useMemo(() => {
    const map = new Map<number, number>();
    for (const p of packagesData?.data ?? []) {
      map.set(p.id, Number(p.priceToman ?? p.priceUsd ?? 0));
    }
    return map;
  }, [packagesData?.data]);

  // Service price lookup
  const servicePrices = useMemo(() => {
    const map = new Map<number, number>();
    for (const s of servicesData?.data ?? []) {
      map.set(s.id, Number(s.price ?? 0));
    }
    return map;
  }, [servicesData?.data]);

  const customerNames = useMemo(() => {
    const map = new Map<number, string>();
    for (const c of customersData?.data ?? []) map.set(c.id, `${c.firstName} ${c.lastName}`.trim());
    return map;
  }, [customersData]);

  const sales = useMemo(() => paginated?.data ?? [], [paginated?.data]);
  const totalPages = paginated?.totalPages ?? 1;

  // Find paid visit IDs from sales
  const paidVisitIds = useMemo(() => {
    const ids = new Set<number>();
    for (const sale of sales) {
      if (sale.visit && sale.status === "paid") {
        ids.add(sale.visit);
      }
    }
    return ids;
  }, [sales]);

  // Filter completed visits that are not paid
  const unpaidVisits = useMemo((): Appointment[] => {
    const visits = visitsData?.data ?? [];
    return visits.filter((v) => !paidVisitIds.has(v.id));
  }, [visitsData?.data, paidVisitIds]);

  // Compute visit totals
  const visitTotals = useMemo(() => {
    const map = new Map<number, number>();
    for (const visit of unpaidVisits) {
      const total = visit.services.reduce((sum, id) => sum + (servicePrices.get(id) ?? 0), 0);
      map.set(visit.id, total);
    }
    return map;
  }, [unpaidVisits, servicePrices]);

  const startCheckout = () => {
    if (!newCustomerId || parseToman(newTotal) <= 0) return;
    setNewSaleOpen(false);
    setCheckoutOpen(true);
  };

  const openVisitCheckout = (visitId: number) => {
    setCheckoutVisitId(visitId);
  };

  const closeVisitCheckout = () => {
    setCheckoutVisitId(null);
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
            width: "90px",
            render: (item: Sale) =>
              item.status === "paid" || item.status === "partially_refunded" ? (
                <div className="flex justify-center gap-1.5">
                  <Tooltip content="استرداد" side="top">
                    <Button
                      variant="ghost"
                      size="sm"
                      iconOnly
                      aria-label={`استرداد فروش #${item.id}`}
                      onClick={() => setRefundSale(item)}
                    >
                      <BiTrash className="text-danger-600 size-4" />
                    </Button>
                  </Tooltip>
                </div>
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
          caption="لیست فروش‌ها"
        />
        {totalPages > 1 && (
          <div className="border-surface-200 flex items-center justify-center border-t px-5 py-4">
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </Card>

      {unpaidVisits.length > 0 && (
        <Card variant="outlined" padding="md">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-surface-900 text-lg font-semibold">
              نوبت‌های تکمیل‌شده و تسویه‌نشده
            </h3>
            <Badge variant="warning" size="sm">
              {unpaidVisits.length} نوبت
            </Badge>
          </div>
          <div className="flex flex-col gap-2">
            {unpaidVisits.map((visit) => (
              <div
                key={visit.id}
                className="border-surface-200 hover:bg-surface-50 flex items-center justify-between gap-4 rounded-lg border p-3 transition-colors"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="bg-primary-100 text-primary-700 flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold">
                    {visit.customerName[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-surface-900 truncate text-sm font-medium">
                      {visit.customerName}
                    </p>
                    <p className="text-surface-500 text-xs" dir="ltr">
                      {visit.time} · {visit.serviceNames?.join("، ") ?? "—"}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-surface-600 text-sm">
                    {formatPrice(visitTotals.get(visit.id) ?? 0)} تومان
                  </span>
                  <Button
                    size="sm"
                    variant="primary"
                    startIcon={<BiCreditCard className="size-4" />}
                    onClick={() => openVisitCheckout(visit.id)}
                    disabled={visitsLoading}
                  >
                    تسویه
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

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
            onChange={(e) => {
              const pkgId = e.target.value ? Number(e.target.value) : null;
              setNewPackageId(e.target.value);
              if (pkgId) {
                const price = packagePrices.get(pkgId) ?? 0;
                setNewTotal(String(price));
                setNewTotalHint(`(هزینه پکیج: ${formatPrice(price)} تومان)`);
              } else {
                setNewTotalHint("");
              }
            }}
          />
          <Input
            label="مبلغ کل (تومان)"
            value={newTotal}
            inputMode="numeric"
            onChange={(e) => {
              setNewTotal(e.target.value);
              setNewTotalHint("");
            }}
          />
          {newTotalHint && <p className="text-surface-400 mt-1 text-xs">{newTotalHint}</p>}
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

      {checkoutVisitId && (
        <VisitCheckoutModal visitId={checkoutVisitId} onClose={closeVisitCheckout} />
      )}
    </div>
  );
}
