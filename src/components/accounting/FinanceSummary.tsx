import type { ReactNode } from "react";

import { useFinancialSummary } from "../../hooks/api";
import { formatPercent, formatPrice } from "../../lib/format";
import { reportPeriodLabel } from "../../lib/report-period";
import type { ReportPeriod } from "../../types/finance";
import { Skeleton } from "../ui/Skeleton";

type MetricTone = "default" | "success" | "warning" | "danger";

const toneText: Record<MetricTone, string> = {
  default: "text-surface-900",
  success: "text-success-600",
  warning: "text-warning-600",
  danger: "text-danger-600",
};

const toneFill: Record<MetricTone, string> = {
  default: "bg-surface-500",
  success: "bg-success-500",
  warning: "bg-warning-500",
  danger: "bg-danger-500",
};

interface SummaryMetricProps {
  label: string;
  value: string;
  hint?: ReactNode;
  tone?: MetricTone;
}

/** Single labelled figure inside a report card — label on top, value below, optional hint. */
export function SummaryMetric({ label, value, hint, tone = "default" }: SummaryMetricProps) {
  return (
    <div className="border-surface-100 bg-surface-50 rounded-lg border p-3">
      <p className="text-surface-500 text-xs">{label}</p>
      <p className={`mt-1 text-xl font-bold ${toneText[tone]}`}>{value}</p>
      {hint && <p className="text-surface-400 mt-0.5 text-xs">{hint}</p>}
    </div>
  );
}

interface FinanceContextProps {
  /** Named range both the tab's own summary and the finance report share. */
  period: ReportPeriod;
  /** Label for the tab's own headline figure, e.g. "هزینه‌های جاری". */
  primaryLabel: string;
  primaryToman: number;
  tone?: MetricTone;
}

/**
 * Finance footer for a report card: places the tab's own total inside the wider
 * money flow of the same period. Reads `/finance/reports/financial-summary/`.
 *
 * Every figure is the backend's own. There is deliberately NO
 * `gross − thisTab` line here — that would be a second definition of "what is
 * left" that silently disagrees with the server's `net_profit`. The backend's
 * net profit is shown verbatim instead.
 */
export function FinanceContext({
  period,
  primaryLabel,
  primaryToman,
  tone = "default",
}: FinanceContextProps) {
  const { data: summary, isLoading } = useFinancialSummary({ period });

  const periodText = reportPeriodLabel(period);
  const revenue = Number(summary?.revenue.toman ?? 0);
  const grossProfit = Number(summary?.grossProfit.toman ?? 0);
  const hasRevenue = Number.isFinite(revenue) && revenue > 0;
  const share = hasRevenue ? (primaryToman / revenue) * 100 : null;

  const items = [
    { label: "درآمد", value: revenue, tone: "default" as MetricTone },
    { label: "سود ناخالص", value: grossProfit, tone: "success" as MetricTone },
    { label: primaryLabel, value: primaryToman, tone },
    {
      label: "سود خالص",
      value: Number(summary?.netProfit.toman ?? 0),
      tone: "default" as MetricTone,
    },
  ];

  return (
    <div className="border-surface-200 bg-surface-50/70 rounded-b-xl border-t px-5 py-4 sm:px-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-surface-600 text-xs font-semibold">موقعیت مالی · {periodText}</span>
        <span className="text-surface-400 text-xs">همه ارقام برای همین بازه</span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        {items.map((item) => (
          <div key={item.label} className="flex flex-col gap-0.5">
            <span className="text-surface-400 text-[11px]">{item.label}</span>
            {isLoading ? (
              <Skeleton width="75%" height="1.1rem" />
            ) : (
              <span className={`text-sm font-semibold ${toneText[item.tone]}`}>
                {formatPrice(item.value)} تومان
              </span>
            )}
          </div>
        ))}
      </div>

      {!isLoading && share !== null && (
        <div className="mt-3 flex items-center gap-3">
          <div
            className="bg-surface-200 h-1.5 flex-1 overflow-hidden rounded-full"
            role="progressbar"
            aria-label={`سهم ${primaryLabel} از درآمد ${periodText}`}
            aria-valuenow={Math.round(share)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={`h-full rounded-full transition-[width] duration-500 ${toneFill[tone]}`}
              style={{ width: `${Math.min(100, Math.max(1.5, share))}%` }}
            />
          </div>
          <span className="text-surface-500 text-xs whitespace-nowrap">
            {primaryLabel} {formatPercent(share)} از درآمد {periodText}
          </span>
        </div>
      )}
    </div>
  );
}
