import { useMemo, useState } from "react";

import { useProfitByPackage, useProfitByService, useProfitByStaff } from "../../hooks/api";
import { formatPrice } from "../../lib/format";
import type { ProfitRow, ReportPeriod } from "../../types/finance";
import { Card } from "../ui/Card";
import { Select } from "../ui/Select";
import { Skeleton } from "../ui/Skeleton";
import { type Column, Table } from "../ui/Table";
import { TabPanel, Tabs } from "../ui/Tabs";

const periodOptions = [
  { value: "today", label: "امروز" },
  { value: "this_week", label: "این هفته" },
  { value: "this_month", label: "این ماه" },
  { value: "prev_month", label: "ماه قبل" },
  { value: "this_year", label: "امسال" },
];

const breakdownTabs = [
  { id: "service", label: "خدمت" },
  { id: "package", label: "پکیج" },
  { id: "staff", label: "پرسنل" },
];

function profitColumns(nameKey: keyof ProfitRow, nameHeader: string): Column<ProfitRow>[] {
  return [
    { key: nameKey, header: nameHeader },
    {
      key: "revenueUsd",
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
      header: "سود",
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
    {
      key: "count",
      header: "تعداد",
      align: "center",
      width: "60px",
    },
  ];
}

export function ProfitBreakdownTab() {
  const [activeTab, setActiveTab] = useState("service");
  const [period, setPeriod] = useState<ReportPeriod>("today");

  const { data: serviceData, isLoading: serviceLoading } = useProfitByService({ period });
  const { data: packageData, isLoading: packageLoading } = useProfitByPackage({ period });
  const { data: staffData, isLoading: staffLoading } = useProfitByStaff({ period });

  const serviceColumns = useMemo(() => profitColumns("serviceName", "خدمت"), []);
  const packageColumns = useMemo(() => profitColumns("packageName", "پکیج"), []);
  const staffColumns = useMemo(() => profitColumns("staffName", "پرسنل"), []);

  const serviceRows = useMemo(
    () => (serviceData ?? []).map((r) => ({ ...r, count: r.count })),
    [serviceData]
  );
  const packageRows = useMemo(
    () => (packageData ?? []).map((r) => ({ ...r, count: r.count })),
    [packageData]
  );
  const staffRows = useMemo(
    () => (staffData ?? []).map((r) => ({ ...r, count: r.visitCount })),
    [staffData]
  );

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
