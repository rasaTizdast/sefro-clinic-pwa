import jalaali from "jalaali-js";
import { useMemo, useState } from "react";
import { BiDollar, BiDownload, BiHeart, BiUser } from "react-icons/bi";
import { IoDocumentTextOutline } from "react-icons/io5";
import { PiClockCounterClockwise } from "react-icons/pi";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { SearchButton } from "../components/SearchButton";
import { Button } from "../components/ui/Button";
import { Card, CardTitle } from "../components/ui/Card";
import { Select } from "../components/ui/Select";
import { Skeleton } from "../components/ui/Skeleton";
import {
  useAllReports,
  useCustomerBreakdown,
  useFilteredReports,
  useReferralRate,
  useVisitReports,
} from "../hooks/api";
import { fillChartGaps } from "../lib/report-chart";
import type {
  AppointmentStat,
  KpiStat,
  MonthlyRevenue,
  ServiceCategoryStat,
} from "../types/analytics";

const dateRangeOptions = [
  { value: "today", label: "امروز" },
  { value: "week", label: "این هفته" },
  { value: "month", label: "این ماه" },
  { value: "quarter", label: "سه ماه اخیر" },
  { value: "year", label: "امسال" },
];

function formatCurrency(value: number): string {
  return value.toLocaleString("fa-IR");
}

function toShamsiISO(date: Date): string {
  const { jy, jm, jd } = jalaali.toJalaali(date);
  return `${jy}-${String(jm).padStart(2, "0")}-${String(jd).padStart(2, "0")}`;
}

function Analytics() {
  const [dateRange, setDateRange] = useState("year");
  const { data: allReports, isLoading: allLoading } = useAllReports();

  const dateParams = useMemo(() => {
    const now = new Date();
    const to = toShamsiISO(now);
    const from = new Date();
    switch (dateRange) {
      case "today":
        return { dateFrom: to, dateTo: to };
      case "week":
        from.setDate(from.getDate() - 7);
        return { dateFrom: toShamsiISO(from), dateTo: to };
      case "month":
        from.setMonth(from.getMonth() - 1);
        return { dateFrom: toShamsiISO(from), dateTo: to };
      case "quarter":
        from.setMonth(from.getMonth() - 3);
        return { dateFrom: toShamsiISO(from), dateTo: to };
      case "year":
      default:
        return { dateFrom: "", dateTo: "" };
    }
  }, [dateRange]);

  const { data: filteredReports, isLoading: filteredLoading } = useFilteredReports(
    dateParams.dateFrom || undefined,
    dateParams.dateTo || undefined
  );
  const { data: referralData } = useReferralRate(
    dateParams.dateFrom || undefined,
    dateParams.dateTo || undefined
  );
  const { data: customerBreakdown } = useCustomerBreakdown(
    dateParams.dateFrom || undefined,
    dateParams.dateTo || undefined
  );
  const { data: visitReports } = useVisitReports(
    dateParams.dateFrom || undefined,
    dateParams.dateTo || undefined
  );
  const reports = dateRange === "year" ? allReports : filteredReports;
  const isLoading = dateRange === "year" ? allLoading : filteredLoading;

  const retentionRate = referralData?.referralRate ?? 0;
  const avgSatisfaction = reports?.avgSatisfaction ?? 0;

  const kpiStats: KpiStat[] = reports
    ? [
        {
          title: "مجموع مراجعین",
          value: reports.customerCount?.toLocaleString("fa-IR") ?? "۰",
          change: "",
          trend: "up",
          icon: <BiUser className="size-5" />,
        },
        {
          title: "درآمد کل",
          value: reports.totalRevenue?.toLocaleString("fa-IR") ?? "۰",
          change: "",
          trend: "up",
          icon: <BiDollar className="size-5" />,
        },
        {
          title: "نرخ مراجعه مجدد",
          value: `${retentionRate}٪`,
          change: "",
          trend: "up",
          icon: <PiClockCounterClockwise className="size-5" />,
        },
        {
          title: "میانگین رضایت",
          value: avgSatisfaction ? `${avgSatisfaction.toFixed(1)}` : "—",
          change: "",
          trend: "flat",
          icon: <BiHeart className="size-5" />,
        },
      ]
    : [];

  const monthlyRevenue: MonthlyRevenue[] = useMemo(() => {
    const source = reports?.monthlyRevenue ?? [];
    if (!dateParams.dateFrom || !dateParams.dateTo) return source;
    const filled = fillChartGaps(
      source.map((m) => ({ period: m.month, total: m.revenue })),
      "monthly",
      dateParams.dateFrom,
      dateParams.dateTo
    );
    return filled.map((e) => ({ month: e.period, revenue: e.total }));
  }, [reports, dateParams]);
  const appointmentStatusData: AppointmentStat[] = customerBreakdown?.byVisitStatus ?? [];
  const visitComparisonData = visitReports
    ? [
        { period: "دوره جاری", visits: visitReports.currentCount },
        { period: "دوره قبل", visits: visitReports.previousCount ?? 0 },
      ]
    : [];
  const serviceCategoryData: ServiceCategoryStat[] = reports?.serviceCategoryStats ?? [];

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <Skeleton width="200px" height="2rem" />
          <div className="flex gap-2">
            <Skeleton width="130px" height="2.5rem" variant="rectangular" />
            <Skeleton width="130px" height="2.5rem" variant="rectangular" />
          </div>
        </div>
        <Skeleton width="200px" height="2.5rem" variant="rectangular" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} variant="outlined" padding="lg">
              <Skeleton width="60%" height="1rem" />
              <Skeleton width="40%" height="2rem" className="mt-2" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-surface-900 text-2xl font-bold" data-tour="anl-header">
            گزارش‌ها و آمار
          </h1>
        </div>
        <div className="mt-3 flex items-center gap-3 sm:mt-0">
          <Button variant="outline" startIcon={<BiDownload className="size-5" />}>
            خروجی Excel
          </Button>
          <Button variant="primary" startIcon={<IoDocumentTextOutline className="size-5" />}>
            خروجی PDF
          </Button>
          <SearchButton />
        </div>
      </div>

      <div className="w-full sm:w-64" data-tour="anl-filter">
        <Select
          options={dateRangeOptions}
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" data-tour="anl-kpis">
        {kpiStats.map((stat) => (
          <Card key={stat.title} variant="outlined" padding="lg">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-surface-500 text-sm">{stat.title}</span>
                <span className="text-surface-900 text-2xl font-bold">{stat.value}</span>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-primary-600">{stat.icon}</span>
                <span
                  className={`text-sm font-semibold ${stat.trend === "up" ? "text-success-600" : "text-danger-600"}`}
                >
                  {stat.change}
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <Card variant="outlined" padding="lg" className="xl:col-span-3" data-tour="anl-revenue">
          <CardTitle>روند درآمد ماهانه</CardTitle>
          <div className="mt-4" dir="ltr">
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 12, fill: "#64748b" }} />
                <Tooltip
                  formatter={(value) => [`${formatCurrency(Number(value))} تومان`, "درآمد"]}
                  contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={{ fill: "#2563eb", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card variant="outlined" padding="lg" className="xl:col-span-2" data-tour="anl-status">
          <CardTitle>وضعیت نوبت‌ها</CardTitle>
          <div className="mt-4" dir="ltr">
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={appointmentStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  dataKey="value"
                  paddingAngle={3}
                >
                  {appointmentStatusData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [Number(value), "تعداد"]}
                  contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value: string) => (
                    <span style={{ color: "#334155", fontSize: 12 }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-4">
            {appointmentStatusData.map((item) => (
              <div key={item.name} className="text-surface-600 flex items-center gap-2 text-sm">
                <span className="size-3 rounded-sm" style={{ backgroundColor: item.color }} />
                <span>{item.name}</span>
                <span className="text-surface-900 font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2" data-tour="anl-charts">
        <Card variant="outlined" padding="lg">
          <CardTitle>مقایسه مراجعه بیماران</CardTitle>
          <div className="mt-4" dir="ltr">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={visitComparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="period" tick={{ fontSize: 12, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 12, fill: "#64748b" }} allowDecimals={false} />
                <Tooltip
                  formatter={(value) => [Number(value), "مراجعه"]}
                  contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }}
                />
                <Bar dataKey="visits" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {visitReports?.changePercent != null && (
            <p className="text-surface-600 mt-4 flex items-center justify-center gap-1 text-sm">
              <span
                className={visitReports.changePercent >= 0 ? "text-success-600" : "text-danger-600"}
              >
                {formatCurrency(Math.abs(visitReports.changePercent))}٪
              </span>
              نسبت به دوره قبل
            </p>
          )}
        </Card>

        <Card variant="outlined" padding="lg">
          <CardTitle>محبوبیت دسته‌بندی خدمات</CardTitle>
          <div className="mt-4" dir="ltr">
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={serviceCategoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 12, fill: "#64748b" }} />
                <Tooltip
                  formatter={(value) => [Number(value), "تعداد"]}
                  contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#2563eb"
                  fill="#2563eb"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default Analytics;
