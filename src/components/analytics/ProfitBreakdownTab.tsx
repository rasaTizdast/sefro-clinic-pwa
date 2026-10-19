import { useCallback, useEffect, useMemo, useState } from "react";

import {
  useAllPayouts,
  useProfitByPackage,
  useProfitByService,
  useProfitByStaff,
} from "../../hooks/api";
import type { ExportSheet } from "../../lib/analytics-export";
import { shamsiDayOf } from "../../lib/date";
import { formatPrice } from "../../lib/format";
import { REPORT_PERIOD_OPTIONS, reportPeriodRange } from "../../lib/report-period";
import type { ProfitRow, ReportPeriod, StaffPayout } from "../../types/finance";
import { Alert } from "../ui/Alert";
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
      // The backend tags every row with `revenue_basis`: `sale_ledger` rows are
      // collected money, everything else is list-price potential revenue that
      // ignores discounts, packages and partial payments. The row tag keeps the
      // distinction visible even inside a mixed table.
      header: "درآمد",
      align: "center",
      render: (row) => (
        <span className="text-surface-700 text-sm">
          ${Number(row.revenueUsd).toFixed(2)}
          {row.revenueToman && (
            <span className="text-surface-400 mr-1 text-xs">
              ({formatPrice(Number(row.revenueToman))})
            </span>
          )}
          <span
            className={
              row.revenueBasis === "sale_ledger"
                ? "text-info-600 mr-1 text-xs"
                : "text-surface-400 mr-1 text-xs"
            }
          >
            {row.revenueBasis === "sale_ledger" ? "دفتر فروش" : "قیمت لیست"}
          </span>
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
      // API dates are Jalali — a native Date parse would be NaN.
      const day = shamsiDayOf(payout.createdAt);
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

const EMPTY_SERVICE =
  "خدمت تکمیل‌شده‌ای در این بازه وجود ندارد — جدول پس از تکمیل نوبت‌ها پر می‌شود.";
const EMPTY_PACKAGE = "پکیج فروخته‌شده‌ای در این بازه وجود ندارد.";
const EMPTY_STAFF = "پرسنلی در این بازه خدمات/تسویه ثبت‌نشده ندارد.";

export function ProfitBreakdownTab({
  registerExport,
}: {
  /** Hands the Analytics page a sheet provider; returns the unregister fn. */
  registerExport?: (provider: () => ExportSheet[]) => () => void;
}) {
  const [activeTab, setActiveTab] = useState("service");
  const [period, setPeriod] = useState<ReportPeriod>("this_month");

  const {
    data: serviceData,
    isLoading: serviceLoading,
    isError: serviceError,
  } = useProfitByService({ period });
  const {
    data: packageData,
    isLoading: packageLoading,
    isError: packageError,
  } = useProfitByPackage({ period });
  const {
    data: staffData,
    isLoading: staffLoading,
    isError: staffError,
  } = useProfitByStaff({ period });
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

  /** Sheets handed to the Analytics Excel export — only the breakdown tables. */
  const buildExportSheets = useCallback((): ExportSheet[] => {
    const money = (usd: string | number) => `$${Number(usd).toFixed(2)}`;
    const moneyCols = (r: ProfitRow) => ({
      درآمد: money(r.revenueUsd),
      "هزینه محصول": money(r.productCostUsd),
      "سود بالقوه": money(r.profitUsd),
    });
    return [
      {
        name: "سود خدمات",
        rows: serviceRows.map((r) => ({
          خدمت: r.serviceName ?? "",
          ...moneyCols(r),
          "تعداد ویزیت": r.count ?? 0,
        })),
      },
      {
        name: "سود پکیج",
        rows: packageRows.map((r) => ({
          پکیج: r.packageName ?? "",
          ...moneyCols(r),
          "تعداد فروش": r.count ?? 0,
        })),
      },
      {
        name: "سود پرسنل",
        rows: staffRows.map((r) => {
          const total = r.staffId != null ? payoutTotals.get(r.staffId) : undefined;
          return {
            پرسنل: r.staffName ?? "",
            ...moneyCols(r),
            "تعداد خدمات": r.count ?? 0,
            "حقوق/پرداختی": total ? money(total.payoutUsd) : "—",
          };
        }),
      },
    ];
  }, [serviceRows, packageRows, staffRows, payoutTotals]);

  useEffect(() => registerExport?.(buildExportSheets), [registerExport, buildExportSheets]);

  return (
    <div className="flex flex-col gap-6">
      <div className="w-full sm:w-64">
        <Select
          label="بازه زمانی"
          options={REPORT_PERIOD_OPTIONS}
          value={period}
          onChange={(e) => setPeriod(e.target.value as ReportPeriod)}
        />
        {serviceError && (
          <Alert variant="error">دریافت گزارش سود ممکن نشد — دوباره تلاش کنید.</Alert>
        )}
        {packageError && (
          <Alert variant="error">دریافت گزارش سود پکیج‌ها ممکن نشد — دوباره تلاش کنید.</Alert>
        )}
        {staffError && (
          <Alert variant="error">دریافت گزارش سود پرسنل ممکن نشد — دوباره تلاش کنید.</Alert>
        )}
        <p className="text-surface-400 text-xs">
          این جدول فقط نوبت‌های «تکمیل‌شده» را محاسبه می‌کند.
        </p>
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
              emptyMessage={serviceRows.length === 0 ? EMPTY_SERVICE : undefined}
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
              emptyMessage={packageRows.length === 0 ? EMPTY_PACKAGE : undefined}
            />
          </Card>
        )}
      </TabPanel>

      <TabPanel id="staff" activeTab={activeTab}>
        {staffLoading ? (
          <Skeleton width="100%" height="12rem" variant="rectangular" />
        ) : (
          <Card variant="outlined" padding="none">
            <Table
              columns={staffColumns}
              data={staffRows}
              rowKey={(r, i) => r.staffId ?? i}
              emptyMessage={staffRows.length === 0 ? EMPTY_STAFF : undefined}
            />
          </Card>
        )}
      </TabPanel>
    </div>
  );
}
