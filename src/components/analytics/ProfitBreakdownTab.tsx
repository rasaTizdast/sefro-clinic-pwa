import { useMemo, useState } from "react";

import {
  useAllPayouts,
  useProfitByPackage,
  useProfitByService,
  useProfitByStaff,
} from "../../hooks/api";
import { formatPrice } from "../../lib/format";
import { REPORT_PERIOD_OPTIONS, reportPeriodRange } from "../../lib/report-period";
import type { ProfitRow, ReportPeriod, StaffPayout } from "../../types/finance";
import { Card } from "../ui/Card";
import { Select } from "../ui/Select";
import { Skeleton } from "../ui/Skeleton";
import { type Column, Table } from "../ui/Table";
import { TabPanel, Tabs } from "../ui/Tabs";

const breakdownTabs = [
  { id: "service", label: "خدمت" },
  { id: "package", label: "پکیج" },
  { id: "staff", label: "پرسنل" },
];

type CountHeader = "تعداد ویزیت" | "تعداد فروش" | "تعداد خدمات";

function profitColumns(
  nameKey: keyof ProfitRow,
  nameHeader: string,
  countHeader: CountHeader
): Column<ProfitRow>[] {
  return [
    { key: nameKey, header: nameHeader },
    {
      key: "revenueUsd",
      // The backend computes this as `Service.price_usd` per visit — the LIST
      // price — not money actually collected. It ignores discounts, packages and
      // partial payments, so it must not read as cash in hand.
      header: "درآمد بالقوه (قیمت لیست)",
      align: "center",
      render: (row) => (
        <span className="text-surface-700 text-sm">
          ${Number(row.revenueUsd).toFixed(2)}
          {row.revenueToman && (
            <span className="text-surface-400 mr-1 text-xs">
              ({formatPrice(Number(row.revenueToman))})
            </span>
          )}
        </span>
      ),
    },
    {
      key: "productCostUsd",
      header: "هزینه محصول",
      align: "center",
      render: (row) => (
        <span className="text-surface-700 text-sm">${Number(row.productCostUsd).toFixed(2)}</span>
      ),
    },
    {
      key: "profitUsd",
      // Derived from the list-price column above, so it is a potential margin,
      // not realized profit.
      header: "سود بالقوه",
      align: "center",
      render: (row) => (
        <span className="text-success-600 text-sm font-medium">
          ${Number(row.profitUsd).toFixed(2)}
          {row.profitToman && (
            <span className="text-surface-400 mr-1 text-xs">
              ({formatPrice(Number(row.profitToman))})
            </span>
          )}
        </span>
      ),
    },
    { key: "count", header: countHeader, align: "center", width: "90px" },
  ];
}

interface StaffPayoutTotal {
  staffId: number;
  staffName: string;
  payoutUsd: number;
  payoutToman: number;
  payouts: number;
}

const dayOf = (iso: string): string | null => {
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
};

/**
 * Payout totals per staff for the selected period.
 * `StaffPayoutViewSet` exposes no date filter, so the whole log is walked once and
 * narrowed here against the same day bounds the `period=` reports use.
 */
function useStaffPayoutTotals(period: ReportPeriod): Map<number, StaffPayoutTotal> {
  const { data: payouts } = useAllPayouts();

  return useMemo(() => {
    const { start, end } = reportPeriodRange(period);
    const totals = new Map<number, StaffPayoutTotal>();
    for (const payout of (payouts ?? []) as StaffPayout[]) {
      const day = dayOf(payout.createdAt);
      if (day && (day < start || day > end)) continue;
      const existing =
        totals.get(payout.staff) ??
        ({
          staffId: payout.staff,
          staffName: payout.staffName,
          payoutUsd: 0,
          payoutToman: 0,
          payouts: 0,
        } satisfies StaffPayoutTotal);
      existing.payoutUsd += Number(payout.totalPayoutUsd);
      existing.payoutToman += Number(payout.totalPayoutToman);
      existing.payouts += 1;
      totals.set(payout.staff, existing);
    }
    return totals;
  }, [payouts, period]);
}

export function ProfitBreakdownTab() {
  const [activeTab, setActiveTab] = useState("service");
  const [period, setPeriod] = useState<ReportPeriod>("this_month");

  const { data: serviceData, isLoading: serviceLoading } = useProfitByService({ period });
  const { data: packageData, isLoading: packageLoading } = useProfitByPackage({ period });
  const { data: staffData, isLoading: staffLoading } = useProfitByStaff({ period });
  const payoutTotals = useStaffPayoutTotals(period);

  const serviceColumns = useMemo(() => profitColumns("serviceName", "خدمت", "تعداد ویزیت"), []);
  const packageColumns = useMemo(() => profitColumns("packageName", "پکیج", "تعداد فروش"), []);
  const staffColumns = useMemo(() => {
    const base = profitColumns("staffName", "پرسنل", "تعداد خدمات");
    return [
      ...base,
      {
        key: "payoutUsd" as keyof ProfitRow,
        header: "حقوق/پرداختی",
        align: "center" as const,
        render: (row: ProfitRow) => {
          const total = row.staffId != null ? payoutTotals.get(row.staffId) : undefined;
          if (!total) {
            return <span className="text-surface-400 text-sm">—</span>;
          }
          return (
            <span className="text-surface-700 text-sm">
              ${total.payoutUsd.toFixed(2)}
              <span className="text-surface-400 mr-1 text-xs">
                ({formatPrice(total.payoutToman)})
              </span>
            </span>
          );
        },
      },
    ];
  }, [payoutTotals]);

  const serviceRows = useMemo(
    () => (serviceData ?? []).map((r) => ({ ...r, count: r.count })),
    [serviceData]
  );
  const packageRows = useMemo(
    () => (packageData ?? []).map((r) => ({ ...r, count: r.count })),
    [packageData]
  );
  // A staff member can hold payouts for a period with no completed visit (e.g. a
  // payout approved later), so union both sides instead of dropping either.
  const staffRows = useMemo(() => {
    const rows = new Map<number, ProfitRow>();
    for (const row of staffData ?? []) {
      if (row.staffId != null) rows.set(row.staffId, { ...row, count: row.visitCount });
    }
    for (const [staffId, total] of payoutTotals) {
      if (rows.has(staffId)) continue;
      rows.set(staffId, {
        staffId,
        staffName: total.staffName,
        revenueUsd: "0.00",
        productCostUsd: "0.00",
        profitUsd: "0.00",
        count: 0,
      });
    }
    return [...rows.values()];
  }, [staffData, payoutTotals]);

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

      <Tabs tabs={breakdownTabs} activeTab={activeTab} onChange={setActiveTab} />

      <TabPanel id="service" activeTab={activeTab}>
        {serviceLoading ? (
          <Skeleton width="100%" height="12rem" variant="rectangular" />
        ) : (
          <Card variant="outlined" padding="none">
            <Table
              columns={serviceColumns}
              data={serviceRows}
              rowKey={(r, i) => r.serviceId ?? i}
            />
          </Card>
        )}
      </TabPanel>

      <TabPanel id="package" activeTab={activeTab}>
        {packageLoading ? (
          <Skeleton width="100%" height="12rem" variant="rectangular" />
        ) : (
          <Card variant="outlined" padding="none">
            <Table
              columns={packageColumns}
              data={packageRows}
              rowKey={(r, i) => r.packageId ?? i}
            />
          </Card>
        )}
      </TabPanel>

      <TabPanel id="staff" activeTab={activeTab}>
        {staffLoading ? (
          <Skeleton width="100%" height="12rem" variant="rectangular" />
        ) : (
          <Card variant="outlined" padding="none">
            <Table columns={staffColumns} data={staffRows} rowKey={(r, i) => r.staffId ?? i} />
          </Card>
        )}
      </TabPanel>
    </div>
  );
}
