import { useMemo } from "react";

import { useAllVisits } from "../../hooks/api";
import { formatJalaliDate } from "../../lib/date";
import { toPersianDigits } from "../../lib/digits";
import type { AppointmentStatus } from "../../types/appointment";
import { Badge } from "../ui/Badge";
import { EmptyState } from "../ui/EmptyState";

const visitStatusMeta: Record<
  AppointmentStatus,
  { label: string; variant: "success" | "warning" | "info" | "danger" | "default" }
> = {
  completed: { label: "تکمیل شده", variant: "success" },
  confirmed: { label: "تأیید شده", variant: "success" },
  pending: { label: "در انتظار", variant: "warning" },
  canceled: { label: "لغو شده", variant: "danger" },
};

interface VisitHistoryListProps {
  customerId: number;
  /** Hide the status badge — used where space is tight (wizard). */
  compact?: boolean;
}

/**
 * A single patient's visit history, newest first. The visits API has no
 * customer filter param, so the already-cached full visit log is filtered
 * client-side — pages that render this list usually load `useAllVisits()`
 * anyway, and the shared query key means no extra fetch.
 */
export function VisitHistoryList({ customerId, compact = false }: VisitHistoryListProps) {
  const { data: allVisits, isLoading } = useAllVisits();

  const visits = useMemo(
    () => (allVisits ?? []).filter((visit) => visit.customer === customerId),
    [allVisits, customerId]
  );

  if (isLoading) {
    return <p className="text-surface-400 py-4 text-sm">در حال بارگذاری ویزیت‌ها...</p>;
  }

  if (visits.length === 0) {
    return (
      <EmptyState
        title="ویزیتی ثبت نشده است"
        description="برای این بیمار هنوز مراجعه‌ای در سیستم وجود ندارد."
      />
    );
  }

  return (
    <ul className="divide-surface-100 divide-y">
      {visits.map((visit) => {
        const meta = visitStatusMeta[visit.status];
        return (
          <li key={visit.id} className="flex items-center justify-between gap-3 py-3">
            <div className="flex min-w-0 flex-col">
              <span className="text-surface-800 text-sm font-medium">
                {toPersianDigits(formatJalaliDate(visit.date))}
                <span className="text-surface-500 ms-2 font-normal" dir="ltr">
                  {visit.time}
                </span>
              </span>
              <span className="text-surface-500 mt-0.5 truncate text-xs">
                {visit.serviceNames.length > 0 ? visit.serviceNames.join("، ") : "—"}
              </span>
            </div>
            {!compact && (
              <Badge variant={meta.variant} size="sm">
                {meta.label}
              </Badge>
            )}
          </li>
        );
      })}
    </ul>
  );
}
