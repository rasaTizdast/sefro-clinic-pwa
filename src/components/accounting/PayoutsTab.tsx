import { useMemo, useState } from "react";

import { useCompensationRules, usePayoutsList, usePayoutSummary } from "../../hooks/api";
import { formatJalaliDate, jalaliToGregorianISO } from "../../lib/date";
import { formatPrice } from "../../lib/format";
import { REPORT_PERIOD_OPTIONS, reportPeriodLabel } from "../../lib/report-period";
import type {
  CalculationType,
  CompensationRole,
  PayoutStatus,
  ReportPeriod,
} from "../../types/finance";
import { Badge } from "../ui/Badge";
import { Card } from "../ui/Card";
import { JalaliDatePicker } from "../ui/JalaliDatePicker";
import { Pagination } from "../ui/Pagination";
import { Select } from "../ui/Select";
import { type Column, Table } from "../ui/Table";
import { FinanceContext, SummaryMetric } from "./FinanceSummary";

const roleLabels: Record<CompensationRole, string> = {
  doctor: "پزشک",
  facial: "فیشال",
  laser: "لیزر",
  none: "بدون اپراتور",
};

/** How each role's payout is computed — the compensation rule's calculation basis. */
const calculationLabels: Record<CalculationType, string> = {
  percent_profit: "درصد سود",
  fixed_per_session: "مبلغ ثابت هر ویزیت",
  monthly_salary: "ماهانه",
};

const roleFilterOptions = [
  { value: "", label: "همه نقش‌ها" },
  ...(["doctor", "facial", "laser"] as const).map((value) => ({
    value,
    label: roleLabels[value],
  })),
];

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * ISO day for the client-side date range; null while the input is empty or not a
 * full Jalali date. The summary endpoint takes Gregorian `start_date`/`end_date`.
 */
function toIsoDay(value: string | null): string | null {
  if (!value) return null;
  const iso = jalaliToGregorianISO(value);
  return ISO_DAY.test(iso) ? iso : null;
}

const statusFilterOptions = [
  { value: "", label: "همه وضعیت‌ها" },
  { value: "pending", label: "در انتظار" },
  { value: "approved", label: "تأییدشده" },
  { value: "paid", label: "پرداخت‌شده" },
  { value: "cancelled", label: "لغو" },
];

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
 * The period select scopes the summary only; the list below is every payout.
 */
export function PayoutsTab() {
  const [period, setPeriod] = useState<ReportPeriod>("today");
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [role, setRole] = useState<CompensationRole | "">("");
  const [status, setStatus] = useState<PayoutStatus | "">("");
  const [page, setPage] = useState(1);

  // An explicit range wins over the named period inside the service layer.
  const fromDay = toIsoDay(dateFrom);
  const toDay = toIsoDay(dateTo);

  const summaryParams = {
    period,
    ...(fromDay ? { startDate: fromDay } : {}),
    ...(toDay ? { endDate: toDay } : {}),
    ...(role ? { role } : {}),
  };

  const { data: summary, isLoading: summaryLoading } = usePayoutSummary(summaryParams);
  const { data: paginated, isLoading: listLoading } = usePayoutsList({
    page,
    perPage: PAGE_SIZE,
    ...(status ? { status } : {}),
    ...(role ? { role } : {}),
  });

  // The payout basis (percentage / monthly / per-visit) comes from the role's rule.
  const { data: rulesData } = useCompensationRules(role ? { role } : undefined);
  const basisLabel = useMemo(() => {
    if (!role) return null;
    const rule = rulesData?.data.find((r) => r.role === role);
    return rule ? calculationLabels[rule.calculationType] : null;
  }, [role, rulesData]);

  const payouts = paginated?.data ?? [];
  const totalPages = paginated?.totalPages ?? 1;
  const periodText =
    fromDay || toDay ? `${dateFrom ?? "…"} تا ${dateTo ?? "…"}` : reportPeriodLabel(period);

  const cards = [
    {
      label: "مجموع نقدی",
      value: summary ? formatPrice(Number(summary.totalCashToman)) : "—",
      hint: summary ? <span dir="ltr">{`$${summary.totalCashUsd}`}</span> : undefined,
    },
    {
      label: "مجموع ارزش محصول",
      value: summary ? formatPrice(Number(summary.totalProductValueToman)) : "—",
      hint: summary ? <span dir="ltr">{`$${summary.totalProductValueUsd}`}</span> : undefined,
    },
    {
      label: "تعداد تسویه",
      value: summary ? String(summary.payoutCount) : "—",
      hint: `در ${periodText}`,
    },
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
      key: "createdAt",
      header: "تاریخ ثبت",
      align: "center",
      width: "110px",
      render: (item) => <span>{formatJalaliDate(item.createdAt)}</span>,
    },
    {
      key: "approvedAt",
      header: "تاریخ تأیید",
      align: "center",
      width: "110px",
      render: (item) => <span>{item.approvedAt ? formatJalaliDate(item.approvedAt) : "—"}</span>,
    },
    {
      key: "paidAt",
      header: "تاریخ پرداخت",
      align: "center",
      width: "110px",
      render: (item) => <span>{item.paidAt ? formatJalaliDate(item.paidAt) : "—"}</span>,
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
      <Card variant="outlined" padding="none">
        <div className="flex flex-col gap-5 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <h3 className="text-surface-900 text-base font-semibold">خلاصه تسویه‌ها</h3>
              <p className="text-surface-400 text-xs">جمع تسویه‌های ثبت‌شده در {periodText}</p>
              {role && basisLabel && (
                <p className="text-surface-500 mt-1 text-xs">
                  <span className="bg-warning-50 text-warning-700 rounded-full px-2 py-0.5 font-medium">
                    {roleLabels[role]} — محاسبه: {basisLabel}
                  </span>
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-full sm:w-52">
                <Select
                  label="بازه زمانی"
                  options={REPORT_PERIOD_OPTIONS}
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as ReportPeriod)}
                />
              </div>
              <div className="w-full sm:w-44">
                <JalaliDatePicker
                  label="از تاریخ"
                  value={dateFrom}
                  onChange={(value) => {
                    setDateFrom(value);
                    setPage(1);
                  }}
                />
              </div>
              <div className="w-full sm:w-44">
                <JalaliDatePicker
                  label="تا تاریخ"
                  value={dateTo}
                  onChange={(value) => {
                    setDateTo(value);
                    setPage(1);
                  }}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {cards.map((card) => (
              <SummaryMetric
                key={card.label}
                label={card.label}
                value={summaryLoading ? "…" : card.value}
                hint={card.hint}
              />
            ))}
          </div>
        </div>

        <FinanceContext
          period={period}
          primaryLabel="تسویه پرسنل"
          primaryToman={Number(summary?.totalPayoutToman ?? 0)}
          tone="warning"
        />
      </Card>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-surface-900 text-base font-semibold">همه تسویه‌ها</h3>
          <p className="text-surface-400 text-xs">
            {paginated ? `${formatPrice(paginated.total)} ردیف` : "—"} مستقل از بازه زمانی خلاصه
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-48">
            <Select
              label="نقش"
              options={roleFilterOptions}
              value={role}
              onChange={(e) => {
                setRole(e.target.value as CompensationRole | "");
                setPage(1);
              }}
            />
          </div>
          <div className="w-48">
            <Select
              label="وضعیت"
              options={statusFilterOptions}
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as PayoutStatus | "");
                setPage(1);
              }}
            />
          </div>
        </div>
      </div>

      <Card variant="outlined" padding="none">
        <Table
          columns={columns}
          data={payouts}
          rowKey={(item) => item.id}
          loading={listLoading}
          emptyMessage="تسویه‌ای ثبت نشده است"
          className="rounded-none border-0"
          caption="لیست تسویه‌های پرسنل"
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
