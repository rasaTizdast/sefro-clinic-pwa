import { CiMoneyBill } from "react-icons/ci";
import { MdAttachMoney, MdInventory, MdShoppingCart } from "react-icons/md";

import { useFinancialSummary } from "../../hooks/api";
import { formatPrice } from "../../lib/format";
import { Alert } from "../ui/Alert";
import { Card } from "../ui/Card";
import { Skeleton } from "../ui/Skeleton";

/** USD with trailing zeros trimmed (e.g. $12 → $12, $12.50 stays). */
function trimUsdZeros(value: string | number): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "$0";
  return `$${n.toFixed(2).replace(/\.?0+$/, "")}`;
}

/**
 * Headline money for the dashboard.
 *
 * Revenue and net profit come from `/finance/reports/financial-summary/` — the
 * canonical report — rather than `/finance/dashboard/`, whose revenue and cost
 * aggregations are a separate implementation with a different status filter.
 * Mixing the two would put two different "revenue" and "net profit" numbers on
 * screen for the same day.
 *
 * Operational (non-financial) counts still come from the dashboard endpoint.
 */
export function FinanceKpiCards() {
  const { data: summary, isLoading, isError } = useFinancialSummary({ period: "today" });

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} variant="outlined" padding="lg">
            <Skeleton width="60%" height="1rem" />
            <Skeleton width="40%" height="2rem" className="mt-2" />
          </Card>
        ))}
      </div>
    );
  }

  // A fetch error must stay visible — silently vanishing looks like "no data".
  if (isError) {
    return (
      <Alert variant="error" title="خطا در دریافت خلاصه مالی">
        خلاصه مالی امروز بارگذاری نشد. اتصال سرور را بررسی کنید.
      </Alert>
    );
  }

  if (!summary) return null;

  const kpis = [
    {
      title: "درآمد امروز",
      value: `${formatPrice(Number(summary.revenue.toman))} تومان`,
      sub: trimUsdZeros(summary.revenue.usd),
      icon: <CiMoneyBill className="size-5" />,
      variant: "success" as const,
    },
    {
      title: "سود خالص",
      value: `${formatPrice(Number(summary.netProfit.toman))} تومان`,
      sub: trimUsdZeros(summary.netProfit.usd),
      icon: <MdAttachMoney className="size-5" />,
      variant: "info" as const,
    },
    {
      title: "تعداد فروش",
      value: String(summary.counts.paidSales),
      sub: `میانگین: ${trimUsdZeros(summary.counts.averageTransactionValue)}`,
      icon: <MdShoppingCart className="size-5" />,
      variant: "warning" as const,
    },
    {
      title: "هزینه محصول امروز",
      value: `${formatPrice(Number(summary.productCost.toman))} تومان`,
      sub: trimUsdZeros(summary.productCost.usd),
      icon: <MdInventory className="size-5" />,
      variant: "default" as const,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi) => (
        <Card key={kpi.title} variant="outlined" padding="lg">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-surface-500 flex items-center gap-1.5 text-sm">
                <span className="text-primary-600">{kpi.icon}</span>
                {kpi.title}
              </span>
              <span className="text-surface-900 text-lg font-bold">{kpi.value}</span>
              <span className="text-surface-400 text-xs">{kpi.sub}</span>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
