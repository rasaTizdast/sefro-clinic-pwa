import { useState } from "react";

import { useAllPurchases, useFinancialSummary, useWelcomePackReport } from "../../hooks/api";
import { extractApiError } from "../../lib/api-error";
import { formatPrice } from "../../lib/format";
import {
  REPORT_PERIOD_OPTIONS,
  reportPeriodLabel,
  reportPeriodRange,
} from "../../lib/report-period";
import { sumPurchasesInRange } from "../../services/inventoryFinance";
import type { ReportPeriod } from "../../types/finance";
import { Alert } from "../ui/Alert";
import { Card, CardTitle } from "../ui/Card";
import { Select } from "../ui/Select";
import { Skeleton } from "../ui/Skeleton";

/**
 * EVERY figure below is read straight from the backend. This component performs
 * no arithmetic on money: `gross_profit`, `below_the_line_total` and `net_profit`
 * are the server's own values, and each deduction row is the server's own
 * bucket from the same response. Adding or subtracting rows here would create a
 * second, divergent definition of profit — the one thing this tab must never do.
 */

/** Role keys the backend groups payouts by, with the labels the clinic uses. */
const ROLE_LABELS: Record<string, string> = {
  doctor: "پزشک (تسویه)",
  facial: "اپراتور فیشال (تسویه)",
  laser: "اپراتور لیزر (تسویه)",
};

const ROLE_HINTS: Record<string, string> = {
  doctor: "درصدی از سود خدمات پزشک — نرخ تعیین‌شده",
  facial: "درصدی از سود خدمات فیشال — نرخ تعیین‌شده",
  laser: "حقوق ماهانه + ایاب و ذهاب — مبلغ تعیین‌شده",
};

type Sign = "plus" | "minus" | "equals";

interface BridgeRow {
  label: string;
  /** Stable test hook — the label itself is not unique across the tab. */
  testId: string;
  /** Toman amount exactly as the backend returned it. */
  toman: string;
  usd: string;
  sign: Sign;
  hint?: string;
  /** Present for display but outside the backend's own net_profit formula. */
  informational?: boolean;
}

interface BridgeBlockProps {
  title: string;
  rows: BridgeRow[];
  loading?: boolean;
}

/** USD with trailing zeros trimmed, e.g. "$12" / "$12.50". */
function usdLabel(value: string | number): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "$0";
  return `$${n.toFixed(2).replace(/\.?0+$/, "")}`;
}

/** Whole-Toman amount, Persian digits + ٬ separator. Zero is a real zero, not "—". */
function tomanLabel(value: string | number | null | undefined): string {
  const n = Number(value);
  return `${formatPrice(Number.isFinite(n) ? n : 0)} تومان`;
}

function BridgeRowView({ row }: { row: BridgeRow }) {
  const marker = row.sign === "minus" ? "−" : row.sign === "plus" ? "+" : "=";
  return (
    <div
      data-testid={row.testId}
      className={`border-surface-100 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b py-2.5 last:border-b-0 ${
        row.sign === "equals" ? "font-semibold" : ""
      }`}
    >
      <span className="text-surface-600 flex items-baseline gap-2 text-sm">
        <span aria-hidden className="text-surface-400 w-4 shrink-0 text-center">
          {marker}
        </span>
        <span>{row.label}</span>
        {row.informational && (
          <span className="bg-warning-100 text-warning-700 rounded px-1.5 py-0.5 text-[11px]">
            در سود خالص کسر نمی‌شود
          </span>
        )}
      </span>
      <span className="flex items-baseline gap-2">
        <span className="text-surface-900 text-sm font-medium">{tomanLabel(row.toman)}</span>
        <span dir="ltr" className="text-surface-400 text-xs">
          {usdLabel(row.usd)}
        </span>
      </span>
      {row.hint && <span className="text-surface-400 w-full ps-6 text-xs">{row.hint}</span>}
    </div>
  );
}

function BridgeBlock({ title, rows, loading }: BridgeBlockProps) {
  return (
    <Card variant="outlined" padding="lg">
      <CardTitle>{title}</CardTitle>
      <div className="mt-2">
        {loading
          ? [0, 1, 2].map((i) => <Skeleton key={i} width="100%" height="2.5rem" className="mb-2" />)
          : rows.map((row) => <BridgeRowView key={row.label} row={row} />)}
      </div>
    </Card>
  );
}

export function FinancialSummaryTab() {
  const [period, setPeriod] = useState<ReportPeriod>("this_month");

  const { data: summary, isLoading, isError, error } = useFinancialSummary({ period });
  const { data: packReport } = useWelcomePackReport({ period });
  const { data: allPurchases } = useAllPurchases();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton width="100%" height="6rem" variant="rectangular" />
        <Skeleton width="100%" height="12rem" variant="rectangular" />
      </div>
    );
  }

  if (isError || !summary) {
    return (
      <Alert variant="error" title="گزارش مالی در دسترس نیست">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>
            {extractApiError(error) ||
              "سرویس گزارش مالی پاسخ نداد. تا زمانی که سرویس بالا نیاید هیچ رقم مالی نمایش داده نمی‌شود."}
          </span>
        </div>
      </Alert>
    );
  }

  const packsIssued = Number(packReport?.totalPacksIssued ?? 0);
  const periodText = reportPeriodLabel(period);

  // Cash that left the clinic to restock inventory this period. Reported as its
  // own line, deliberately OUT of the backend's gross_profit (which books the
  // same stock when it is consumed) so nothing is counted twice.
  const purchaseCost = sumPurchasesInRange(allPurchases ?? [], reportPeriodRange(period));

  const staff = summary.staffCompensation;
  const roles = Object.values(staff.byRole).filter((r) => r.role !== "");

  const roleRows: BridgeRow[] = roles.map((role) => ({
    label: ROLE_LABELS[role.role] ?? role.role,
    testId: `bridge-role-${role.role}`,
    toman: role.totalToman,
    usd: role.totalUsd,
    sign: "minus",
    hint: `${role.count.toLocaleString("fa-IR")} فیش — ${
      ROLE_HINTS[role.role] ?? "محاسبه‌شده در سامانه"
    }`,
  }));

  const deductionRows: BridgeRow[] = [
    // Per-role rows come straight from `staff_compensation.by_role`. When the
    // backend has no payouts at all the role list is empty and only the total
    // row shows — no role figure is invented on the client.
    ...roleRows,
    {
      label: "جمع تسویه پرسنل",
      testId: "bridge-staff-payout",
      toman: staff.total.toman,
      usd: staff.total.usd,
      sign: "minus",
      hint:
        staff.payoutCount > 0
          ? `${staff.payoutCount.toLocaleString("fa-IR")} فیش تسویه — نقدی و کالا`
          : "فیش تسویه‌ای ثبت نشده است",
    },
    {
      label: "هزینه‌های عمومی کلینیک",
      testId: "bridge-operating",
      toman: summary.operatingExpenses.toman,
      usd: summary.operatingExpenses.usd,
      sign: "minus",
      hint:
        summary.operatingExpenses.count > 0
          ? `${summary.operatingExpenses.count.toLocaleString("fa-IR")} ردیف هزینه جاری`
          : "ردیف هزینه‌ای ثبت نشده است",
    },
    {
      label: "مطالبات پرسنل",
      testId: "bridge-staff-claims",
      toman: summary.staffExpenseClaims.toman,
      usd: summary.staffExpenseClaims.usd,
      sign: "minus",
      hint:
        summary.staffExpenseClaims.count > 0
          ? `${summary.staffExpenseClaims.count.toLocaleString("fa-IR")} فاکتور مطالبات تأییدشده یا پرداخت‌شده`
          : "مطالبات تأییدشده‌ای ثبت نشده است",
    },
    {
      label: "جمع هزینه‌های زیر سود ناخالص",
      testId: "bridge-below-the-line",
      toman: summary.belowTheLineTotal.toman,
      usd: summary.belowTheLineTotal.usd,
      sign: "minus",
      hint: "تسویه پرسنل + هزینه‌های عمومی + مطالبات پرسنل — محاسبه‌شده در سامانه",
    },
    {
      label: "سود خالص",
      testId: "bridge-net-profit",
      toman: summary.netProfit.toman,
      usd: summary.netProfit.usd,
      sign: "equals",
      hint: "سود ناخالص منهای جمع هزینه‌های زیر سود ناخالص — محاسبه‌شده در سامانه",
    },
  ];

  const revenueRows: BridgeRow[] = [
    {
      label: "درآمد",
      testId: "bridge-revenue",
      toman: summary.revenue.toman,
      usd: summary.revenue.usd,
      sign: "plus",
      hint: `از ${summary.counts.paidSales.toLocaleString("fa-IR")} فروش پرداخت‌شده`,
    },
    {
      label: "هزینه محصول",
      testId: "bridge-product-cost",
      toman: summary.productCost.toman,
      usd: summary.productCost.usd,
      sign: "minus",
      hint: `${formatPrice(Number(summary.counts.productsSoldQuantity))} قلم مصرف‌شده`,
    },
    {
      label: "هزینه بسته خوش‌آمدید",
      testId: "bridge-welcome-pack",
      toman: summary.welcomePackCost.toman,
      usd: summary.welcomePackCost.usd,
      sign: "minus",
      hint: `بیماران بابت این بسته چیزی پرداخت نمی‌کنند — ${
        packsIssued > 0
          ? `${packsIssued.toLocaleString("fa-IR")} بسته صادر شده`
          : "بسته‌ای صادر نشده"
      }`,
    },
    {
      label: "سود ناخالص",
      testId: "bridge-gross-profit",
      toman: summary.grossProfit.toman,
      usd: summary.grossProfit.usd,
      sign: "equals",
      hint: "درآمد منهای هزینه محصول و هزینه بسته خوش‌آمدید — محاسبه‌شده در سامانه",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="w-full sm:w-64">
        <Select
          label="بازه زمانی"
          options={REPORT_PERIOD_OPTIONS}
          value={period}
          onChange={(e) => setPeriod(e.target.value as ReportPeriod)}
        />
      </div>

      {summary.revenueBasis && summary.revenueBasis !== "sale_ledger" && (
        <Alert variant="warning" title="درآمد این گزارش بالقوه است، نه دریافت‌شده">
          <p>
            این بازه با
            <span className="font-semibold"> قیمت لیست خدمات </span>
            محاسبه شده است، نه با پولی که واقعاً دریافت شده — بنابراین تخفیف، پکیج و پرداخت ناقص در
            آن لحاظ نشده‌اند.
          </p>
        </Alert>
      )}

      {summary.costCoverage.zeroCostRows > 0 && (
        <Alert variant="warning" title="پوشش هزینه محصول ناقص است">
          <p>
            {summary.costCoverage.zeroCostRows.toLocaleString("fa-IR")} ردیف مصرف با
            <span className="font-semibold"> بهای صفر </span>
            ثبت شده است. تا وقتی برای این کالاها قیمت خرید ثبت نشود، هزینه محصول و در نتیجه سود
            ناخالص کمتر از واقع نمایش داده می‌شود.
          </p>
        </Alert>
      )}

      <BridgeBlock title={`جریان مالی · ${periodText}`} rows={revenueRows} />

      <BridgeBlock title={`کسرشونده از سود ناخالص · ${periodText}`} rows={deductionRows} />

      <Card variant="outlined" padding="lg">
        <CardTitle>خروج نقد تأمین موجودی</CardTitle>
        <p className="text-surface-400 mt-0.5 text-xs">
          بیرون از محاسبه سود — هزینه محصول همین کالا را هنگام مصرف دوباره حساب می‌کند
        </p>
        <div className="mt-3">
          <BridgeRowView
            row={{
              label: "خرید کالا (خروج نقد)",
              testId: "bridge-purchase-cashout",
              toman: String(purchaseCost.toman),
              usd: String(purchaseCost.usd),
              sign: "minus",
              informational: true,
              hint:
                purchaseCost.count > 0
                  ? `${purchaseCost.count.toLocaleString("fa-IR")} فاکتور خرید در این بازه`
                  : "در این بازه خرید کالایی ثبت نشده",
            }}
          />
        </div>
      </Card>

      <Card variant="outlined" padding="lg">
        <CardTitle>روش پرداخت</CardTitle>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="bg-surface-50 rounded-lg p-3">
            <span className="text-surface-500 text-xs">نقدی</span>
            <div className="text-surface-900 text-lg font-bold" dir="ltr">
              {usdLabel(summary.paymentMethods.cash)}
            </div>
          </div>
          <div className="bg-surface-50 rounded-lg p-3">
            <span className="text-surface-500 text-xs">کارت</span>
            <div className="text-surface-900 text-lg font-bold" dir="ltr">
              {usdLabel(summary.paymentMethods.card)}
            </div>
          </div>
          <div className="bg-surface-50 rounded-lg p-3">
            <span className="text-surface-500 text-xs">کیف پول</span>
            <div className="text-surface-900 text-lg font-bold" dir="ltr">
              {usdLabel(summary.paymentMethods.wallet)}
            </div>
          </div>
        </div>
      </Card>

      <Card variant="outlined" padding="lg">
        <CardTitle>آمار · {periodText}</CardTitle>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <span className="text-surface-500 text-xs">ویزیت‌های انجام‌شده</span>
            <div className="text-surface-900 text-lg font-bold">
              {summary.counts.appointments.toLocaleString("fa-IR")}
            </div>
          </div>
          <div>
            <span className="text-surface-500 text-xs">پکیج فروخته شده</span>
            <div className="text-surface-900 text-lg font-bold">
              {summary.counts.packagesSold.toLocaleString("fa-IR")}
            </div>
          </div>
          <div>
            <span className="text-surface-500 text-xs">محصولات مصرف‌شده</span>
            <div className="text-surface-900 text-lg font-bold">
              {formatPrice(Number(summary.counts.productsSoldQuantity))}
            </div>
          </div>
          <div>
            <span className="text-surface-500 text-xs">بسته خوش‌آمدید صادرشده</span>
            <div className="text-surface-900 text-lg font-bold">
              {packsIssued.toLocaleString("fa-IR")}
            </div>
          </div>
          <div>
            <span className="text-surface-500 text-xs">فروش‌های پرداخت شده</span>
            <div className="text-surface-900 text-lg font-bold">
              {summary.counts.paidSales.toLocaleString("fa-IR")}
            </div>
          </div>
          <div>
            <span className="text-surface-500 text-xs">میانگین تراکنش</span>
            {/* backend value, not revenue/paidSales computed here */}
            <div className="text-surface-900 text-lg font-bold" dir="ltr">
              {usdLabel(summary.counts.averageTransactionValue)}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
