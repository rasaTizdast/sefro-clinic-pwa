import { useState } from "react";

import { useFinancialSummary } from "../../hooks/api";
import { formatPrice } from "../../lib/format";
import type { ReportPeriod } from "../../types/finance";
import { Card, CardTitle } from "../ui/Card";
import { Select } from "../ui/Select";
import { Skeleton } from "../ui/Skeleton";

const periodOptions = [
  { value: "today", label: "امروز" },
  { value: "this_week", label: "این هفته" },
  { value: "this_month", label: "این ماه" },
  { value: "prev_month", label: "ماه قبل" },
  { value: "this_year", label: "امسال" },
];

export function FinancialSummaryTab() {
  const [period, setPeriod] = useState<ReportPeriod>("today");
  const { data: summary, isLoading } = useFinancialSummary({ period });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton width="100%" height="6rem" variant="rectangular" />
        <Skeleton width="100%" height="12rem" variant="rectangular" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="w-full sm:w-64">
        <Select
          label="بازه زمانی"
          options={periodOptions}
          value={period}
          onChange={(e) => setPeriod(e.target.value as ReportPeriod)}
        />
      </div>

      {summary && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card variant="outlined" padding="lg">
              <span className="text-surface-500 text-sm">درآمد</span>
              <div className="text-surface-900 mt-1 text-xl font-bold">
                {formatPrice(Number(summary.revenue.toman))} تومان
              </div>
              <span className="text-surface-400 text-xs">
                ${Number(summary.revenue.usd).toFixed(2)}
              </span>
            </Card>
            <Card variant="outlined" padding="lg">
              <span className="text-surface-500 text-sm">هزینه محصول</span>
              <div className="text-surface-900 mt-1 text-xl font-bold">
                {formatPrice(Number(summary.productCost.toman))} تومان
              </div>
              <span className="text-surface-400 text-xs">
                ${Number(summary.productCost.usd).toFixed(2)}
              </span>
            </Card>
            <Card variant="outlined" padding="lg">
              <span className="text-surface-500 text-sm">سود ناخالص</span>
              <div className="text-success-600 mt-1 text-xl font-bold">
                {formatPrice(Number(summary.grossProfit.toman))} تومان
              </div>
              <span className="text-surface-400 text-xs">
                ${Number(summary.grossProfit.usd).toFixed(2)}
              </span>
            </Card>
            <Card variant="outlined" padding="lg">
              <span className="text-surface-500 text-sm">سود خالص</span>
              <div className="text-primary-600 mt-1 text-xl font-bold">
                {formatPrice(Number(summary.netProfit.toman))} تومان
              </div>
              <span className="text-surface-400 text-xs">
                ${Number(summary.netProfit.usd).toFixed(2)}
              </span>
            </Card>
          </div>

          <Card variant="outlined" padding="lg">
            <CardTitle>روش پرداخت</CardTitle>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="bg-surface-50 rounded-lg p-3">
                <span className="text-surface-500 text-xs">نقدی</span>
                <div className="text-surface-900 text-lg font-bold">
                  {formatPrice(Number(summary.paymentMethods.cash))} تومان
                </div>
              </div>
              <div className="bg-surface-50 rounded-lg p-3">
                <span className="text-surface-500 text-xs">کارت</span>
                <div className="text-surface-900 text-lg font-bold">
                  {formatPrice(Number(summary.paymentMethods.card))} تومان
                </div>
              </div>
            </div>
          </Card>

          <Card variant="outlined" padding="lg">
            <CardTitle>آمار</CardTitle>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <span className="text-surface-500 text-xs">ویزیت‌ها</span>
                <div className="text-surface-900 text-lg font-bold">
                  {summary.counts.appointments}
                </div>
              </div>
              <div>
                <span className="text-surface-500 text-xs">پکیج فروخته شده</span>
                <div className="text-surface-900 text-lg font-bold">
                  {summary.counts.packagesSold}
                </div>
              </div>
              <div>
                <span className="text-surface-500 text-xs">فروش‌های پرداخت شده</span>
                <div className="text-surface-900 text-lg font-bold">{summary.counts.paidSales}</div>
              </div>
              <div>
                <span className="text-surface-500 text-xs">میانگین تراکنش</span>
                <div className="text-surface-900 text-lg font-bold">
                  {formatPrice(Number(summary.counts.averageTransactionValue))} تومان
                </div>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
