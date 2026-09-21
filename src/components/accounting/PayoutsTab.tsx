import { useState } from "react";

import { usePayoutsList, usePayoutSummary } from "../../hooks/api";
import { formatPrice } from "../../lib/format";
import type { CompensationRole, PayoutStatus, ReportPeriod } from "../../types/finance";
import { Badge } from "../ui/Badge";
import { Card } from "../ui/Card";
import { Pagination } from "../ui/Pagination";
import { Select } from "../ui/Select";
import { type Column, Table } from "../ui/Table";

const periodOptions = [
  { value: "today", label: "امروز" },
  { value: "this_week", label: "این هفته" },
  { value: "this_month", label: "این ماه" },
  { value: "prev_month", label: "ماه قبل" },
  { value: "this_year", label: "امسال" },
];

const roleLabels: Record<CompensationRole, string> = {
  doctor: "پزشک",
  facial: "فیشال",
  laser: "لیزر",
  none: "بدون پورسانت",
};

const payoutStatusConfig: Record<
  PayoutStatus,
  { label: string; variant: "success" | "warning" | "danger" | "info" }
> = {
  pending: { label: "در انتظار", variant: "warning" },
  approved: { label: "تأییدشده", variant: "info" },
  paid: { label: "پرداخت‌شده", variant: "success" },
  cancelled: { label: "لغو", variant: "danger" },
};

const PAGE_SIZE = 20;

/**
 * Payouts reporting view (list + summary + status badges). Approve/pay actions are
 * deferred — the backend `StaffPayoutViewSet` exposes no approve/pay endpoints.
 */
export function PayoutsTab() {
  const [period, setPeriod] = useState<ReportPeriod>("today");
  const [page, setPage] = useState(1);

  const { data: summary, isLoading: summaryLoading } = usePayoutSummary({ period });
  const { data: paginated, isLoading: listLoading } = usePayoutsList({ page, perPage: PAGE_SIZE });

  const payouts = paginated?.data ?? [];
  const totalPages = paginated?.totalPages ?? 1;

  const cards = [
    { title: "مجموع نقدی", value: summary ? formatPrice(Number(summary.totalCashToman)) : "—" },
    {
      title: "مجموع ارزش محصول",
      value: summary ? formatPrice(Number(summary.totalProductValueToman)) : "—",
    },
    { title: "تعداد تسویه", value: summary ? String(summary.payoutCount) : "—" },
  ];

  const columns: Column<(typeof payouts)[number]>[] = [
    { key: "staff", header: "پرسنل", render: (item) => <span>{item.staffName}</span> },
    {
      key: "service",
      header: "خدمت",
      render: (item) => <span>{item.serviceName ?? `#${item.service}`}</span>,
    },
    {
      key: "role",
      header: "نقش",
      align: "center",
      width: "100px",
      render: (item) => <span className="text-surface-600">{roleLabels[item.role]}</span>,
    },
    {
      key: "amount",
      header: "مبلغ تسویه",
      align: "end",
      render: (item) => (
        <span>
          <span className="text-surface-900 font-medium">
            {formatPrice(Number(item.totalPayoutToman))} تومان
          </span>{" "}
          <span className="text-surface-400 text-xs">${item.totalPayoutUsd}</span>
        </span>
      ),
    },
    {
      key: "status",
      header: "وضعیت",
      align: "center",
      width: "110px",
      render: (item) => {
        const s = payoutStatusConfig[item.status];
        return (
          <Badge variant={s.variant} size="sm">
            {s.label}
          </Badge>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="w-full sm:w-64">
        <Select
          label="بازه زمانی"
          options={periodOptions}
          value={period}
          onChange={(e) => setPeriod(e.target.value as ReportPeriod)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.title} variant="outlined" padding="lg">
            <div className="flex flex-col gap-1">
              <span className="text-surface-500 text-sm">{card.title}</span>
              <span className="text-surface-900 text-2xl font-bold">
                {summaryLoading ? "..." : card.value}
              </span>
            </div>
          </Card>
        ))}
      </div>

      <Card variant="outlined" padding="none">
        <Table
          columns={columns}
          data={payouts}
          rowKey={(item) => item.id}
          loading={listLoading}
          className="rounded-none border-0"
        />
        {totalPages > 1 && (
          <div className="border-surface-200 flex items-center justify-center border-t px-5 py-4">
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </Card>
    </div>
  );
}
