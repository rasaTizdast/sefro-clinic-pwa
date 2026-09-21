import { CiMoneyBill } from "react-icons/ci";
import { MdAttachMoney, MdPeople, MdShoppingCart } from "react-icons/md";

import { useFinanceDashboard } from "../../hooks/api";
import { formatPrice } from "../../lib/format";
import { Card } from "../ui/Card";
import { Skeleton } from "../ui/Skeleton";

export function FinanceKpiCards() {
  const { data: dashboard, isLoading } = useFinanceDashboard({ period: "today" });

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

  if (!dashboard) return null;

  const { salesSummary, operational } = dashboard;

  const kpis = [
    {
      title: "درآمد امروز",
      value: `${formatPrice(Number(salesSummary.revenueToman))} تومان`,
      sub: `$${Number(salesSummary.revenueUsd).toFixed(2)}`,
      icon: <CiMoneyBill className="size-5" />,
      variant: "success" as const,
    },
    {
      title: "سود خالص",
      value: `${formatPrice(Number(salesSummary.netProfitToman))} تومان`,
      sub: `$${Number(salesSummary.netProfitUsd).toFixed(2)}`,
      icon: <MdAttachMoney className="size-5" />,
      variant: "info" as const,
    },
    {
      title: "تعداد فروش",
      value: String(salesSummary.saleCount),
      sub: `میانگین: $${Number(salesSummary.avgTicketUsd).toFixed(2)}`,
      icon: <MdShoppingCart className="size-5" />,
      variant: "warning" as const,
    },
    {
      title: "مراجعین امروز",
      value: String(operational.visitsCompleted),
      sub: `${operational.newCustomers} بیمار جدید`,
      icon: <MdPeople className="size-5" />,
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
