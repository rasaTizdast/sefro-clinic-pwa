import { useMemo, useState } from "react";
import { BiCreditCard } from "react-icons/bi";

import { useAllServices, useAllVisits, usePaidVisitIds } from "../../hooks/api";
import { formatPrice } from "../../lib/format";
import type { Appointment } from "../../types/appointment";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { VisitCheckoutModal } from "./VisitCheckoutModal";

const MAX_ROWS = 20;

export function SalesTab() {
  const [checkoutVisitId, setCheckoutVisitId] = useState<number | null>(null);

  const { data: servicesData } = useAllServices();
  const { data: visitsData, isLoading: visitsLoading } = useAllVisits({
    status: "completed",
  });
  const { data: paidVisitIdList } = usePaidVisitIds();

  // Service price lookup
  const servicePrices = useMemo(() => {
    const map = new Map<number, number>();
    for (const s of servicesData ?? []) {
      map.set(s.id, Number(s.price ?? 0));
    }
    return map;
  }, [servicesData]);

  const paidVisitIds = useMemo(() => new Set(paidVisitIdList ?? []), [paidVisitIdList]);

  // Completed visits that have no paid sale yet
  const unpaidVisits = useMemo((): Appointment[] => {
    const visits = visitsData ?? [];
    return visits.filter((v) => !paidVisitIds.has(v.id)).slice(0, MAX_ROWS);
  }, [visitsData, paidVisitIds]);

  // Compute visit totals
  const visitTotals = useMemo(() => {
    const map = new Map<number, number>();
    for (const visit of unpaidVisits) {
      const total = visit.services.reduce((sum, id) => sum + (servicePrices.get(id) ?? 0), 0);
      map.set(visit.id, total);
    }
    return map;
  }, [unpaidVisits, servicePrices]);

  return (
    <div className="flex flex-col gap-4">
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
          {visitsLoading ? (
            <p className="text-surface-500 text-sm">در حال بارگذاری…</p>
          ) : unpaidVisits.length === 0 ? (
            <p className="text-surface-500 text-sm">نوبت تسویه‌نشده‌ای وجود ندارد.</p>
          ) : (
            unpaidVisits.map((visit) => (
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
                    onClick={() => setCheckoutVisitId(visit.id)}
                    disabled={visitsLoading}
                  >
                    تسویه
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {checkoutVisitId && (
        <VisitCheckoutModal visitId={checkoutVisitId} onClose={() => setCheckoutVisitId(null)} />
      )}
    </div>
  );
}
