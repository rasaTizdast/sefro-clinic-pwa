import { useMemo, useState } from "react";
import { BiCalendar, BiMinus, BiPlus, BiTrendingDown, BiTrendingUp } from "react-icons/bi";
import { CiMoneyBill } from "react-icons/ci";
import { FaWarehouse } from "react-icons/fa";
import { IoAnalytics } from "react-icons/io5";
import {
  MdEventAvailable,
  MdMedicalServices,
  MdPeople,
  MdPersonAdd,
  MdStar,
  MdStore,
} from "react-icons/md";
import { PiChartPieSliceDuotone } from "react-icons/pi";
import { useNavigate } from "react-router";

import { ExchangeRateCard } from "../components/dashboard/ExchangeRateCard";
import { FinanceKpiCards } from "../components/dashboard/FinanceKpiCards";
import { PatientFormModal } from "../components/patients/PatientFormModal";
import { SearchButton } from "../components/SearchButton";
import { Alert } from "../components/ui/Alert";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardTitle } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import { type Column, Table } from "../components/ui/Table";
import { useCreateCustomer, useCustomersList, useVisitsList } from "../hooks/api";
import { useDashboardStats } from "../hooks/api/useDashboardQuery";
import { toPersianDigits } from "../lib/digits";
import type { Appointment } from "../types/appointment";
import type { PageState, Trend } from "../types/common";
import type { DashboardStat } from "../types/dashboard";
import type { PatientFormData } from "../types/patient";

const appointmentStatusMap: Record<
  Appointment["status"],
  { label: string; variant: "success" | "warning" | "danger" | "info" }
> = {
  confirmed: { label: "تأیید شده", variant: "success" },
  pending: { label: "در انتظار", variant: "warning" },
  canceled: { label: "لغو شده", variant: "danger" },
  completed: { label: "انجام شده", variant: "info" },
};

type QuickAction = {
  label: string;
  icon: React.ReactNode;
  variant: "primary" | "secondary" | "outline" | "ghost";
  onClick?: () => void;
};

const appointmentColumns: Column<Appointment>[] = [
  { key: "time", header: "ساعت", width: "80px" },
  { key: "customerName", header: "بیمار" },
  {
    key: "status",
    header: "وضعیت",
    align: "center",
    render: (item) => {
      const s = appointmentStatusMap[item.status];
      return (
        <Badge variant={s.variant} size="sm">
          {s.label}
        </Badge>
      );
    },
  },
];

function trendIcon(trend: Trend) {
  if (trend === "up") return <BiTrendingUp className="text-success-600 size-4" />;
  if (trend === "down") return <BiTrendingDown className="text-danger-600 size-4" />;
  return <BiMinus className="text-surface-400 size-4" />;
}

function trendColor(trend: Trend) {
  if (trend === "up") return "text-success-600";
  if (trend === "down") return "text-danger-600";
  return "text-surface-400";
}

function getPersianDate(): string {
  try {
    return new Date().toLocaleDateString("fa-IR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

function Dashboard() {
  const navigate = useNavigate();
  const [pageState] = useState<PageState>("ready");
  const [today] = useState(getPersianDate);
  const [patientModalOpen, setPatientModalOpen] = useState(false);
  const createMutation = useCreateCustomer();

  const todayStr = new Date().toISOString().split("T")[0];
  const {
    data: dashboardStats,
    isLoading: statsLoading,
    isError: statsError,
  } = useDashboardStats();
  const { data: todayVisits, isLoading: visitsLoading } = useVisitsList({
    dateFrom: todayStr,
    dateTo: todayStr,
    perPage: 50,
  });
  const { data: customersData } = useCustomersList({ perPage: 200 });

  const customerNameMap = useMemo(() => {
    const map = new Map<number, string>();
    if (customersData?.data) {
      for (const c of customersData.data) {
        map.set(c.id, `${c.firstName} ${c.lastName}`.trim());
      }
    }
    return map;
  }, [customersData]);

  const appointments = useMemo(
    () =>
      (todayVisits?.data ?? []).map((a) => ({
        ...a,
        customerName: a.customerName || (customerNameMap.get(a.customer) ?? ""),
      })),
    [todayVisits, customerNameMap]
  );

  const isLoading = statsLoading || visitsLoading;
  const hasError = statsError;

  const stats: DashboardStat[] = dashboardStats
    ? [
        {
          title: "مراجعین امروز",
          value: toPersianDigits(String(dashboardStats.todayVisits)),
          change: "",
          trend: "flat",
          icon: <MdPeople className="size-5" />,
          variant: "default",
        },
        {
          title: "کل مشتریان",
          value: toPersianDigits(String(dashboardStats.customerCount)),
          change: "",
          trend: "flat",
          icon: <MdStore className="size-5" />,
          variant: "info",
        },
        {
          title: "درآمد امروز",
          value: toPersianDigits(dashboardStats.todaySales.toLocaleString("fa-IR")),
          change: "",
          trend: "flat",
          icon: <CiMoneyBill className="size-5" />,
          variant: "success",
        },
        {
          title: "بیماران جدید",
          value: toPersianDigits(String(dashboardStats.newCustomers)),
          change: "",
          trend: "flat",
          icon: <MdPersonAdd className="size-5" />,
          variant: "warning",
        },
        {
          title: "مشتریان وفادار",
          value: toPersianDigits(String(dashboardStats.loyalCustomerCount)),
          change: "",
          trend: "flat",
          icon: <MdStar className="size-5" />,
          variant: "warning",
        },
      ]
    : [];

  const handleSavePatient = async (data: PatientFormData) => {
    await createMutation.mutateAsync(data);
  };

  const quickActions: QuickAction[] = [
    {
      label: "پذیرش",
      icon: <MdPersonAdd className="size-5" />,
      variant: "primary" as const,
      onClick: () => navigate("/wizard"),
    },
    {
      label: "بیمار جدید",
      icon: <BiPlus className="size-5" />,
      variant: "secondary" as const,
      onClick: () => setPatientModalOpen(true),
    },
    {
      label: "لیست بیماران",
      icon: <PiChartPieSliceDuotone className="size-5" />,
      variant: "outline" as const,
      onClick: () => navigate("/patients"),
    },
    {
      label: "حسابداری",
      icon: <CiMoneyBill className="size-5" />,
      variant: "outline" as const,
      onClick: () => navigate("/accounting"),
    },
    {
      label: "خدمات",
      icon: <MdMedicalServices className="size-5" />,
      variant: "outline" as const,
      onClick: () => navigate("/services"),
    },
    {
      label: "گزارش‌ها",
      icon: <IoAnalytics className="size-5" />,
      variant: "outline" as const,
      onClick: () => navigate("/analytics"),
    },
    {
      label: "مدیریت انبار",
      icon: <FaWarehouse className="size-5" />,
      variant: "outline" as const,
      onClick: () => navigate("/warehouse"),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <Skeleton width="160px" height="2rem" />
            <Skeleton width="200px" height="1rem" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} variant="outlined" padding="lg">
              <Skeleton width="60%" height="3.5rem" />
            </Card>
          ))}
        </div>
        <Skeleton width="100%" height="16rem" variant="rectangular" />
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="flex flex-col gap-6">
        <Alert variant="error" title="خطا در بارگذاری داشبورد">
          متأسفانه در دریافت اطلاعات داشبورد مشکلی پیش آمده است. لطفاً صفحه را مجدداً بارگذاری کنید.
        </Alert>
        <Button variant="primary" onClick={() => window.location.reload()}>
          بارگذاری مجدد
        </Button>
      </div>
    );
  }

  if (pageState === "empty") {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-surface-900 text-2xl font-bold">داشبورد</h1>
        </div>
        <EmptyState
          icon={<MdEventAvailable className="size-12" />}
          title="داشبورد خالی است"
          description="هنوز هیچ داده‌ای برای نمایش وجود ندارد. با ثبت اولین مراجعه، داشبورد شما فعال می‌شود."
          action={
            <Button
              variant="primary"
              startIcon={<BiPlus className="size-5" />}
              data-tour="dash-empty-action"
            >
              ثبت اولین مراجعه
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-surface-900 text-2xl font-bold" data-tour="dash-title">
            داشبورد
          </h1>
          <p className="text-surface-500 mt-1 text-sm">امروز: {today}</p>
        </div>
        <SearchButton />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5" data-tour="dash-stats">
        {stats.map((stat) => (
          <Card key={stat.title} variant="outlined" padding="lg">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-surface-500 flex items-center gap-1.5 text-sm">
                  <span className="text-primary-600">{stat.icon}</span>
                  {stat.title}
                </span>
                <span className="text-surface-900 text-2xl font-bold">{stat.value}</span>
              </div>
              <div
                className={`flex items-center gap-1 text-sm font-medium ${trendColor(stat.trend)}`}
              >
                {trendIcon(stat.trend)}
                {stat.change}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <FinanceKpiCards />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <ExchangeRateCard />
      </div>

      <Card variant="outlined" padding="lg" data-tour="dash-quick-actions">
        <CardTitle>اقدامات سریع</CardTitle>
        <div className="mt-4 flex flex-wrap gap-3">
          {quickActions.map((action) => (
            <Button
              key={action.label}
              variant={action.variant}
              startIcon={action.icon}
              size="md"
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          ))}
        </div>
      </Card>

      <Card variant="outlined" padding="none" data-tour="dash-appointments">
        <div className="border-surface-200 flex items-center justify-between border-b px-5 py-4">
          <CardTitle>نوبت‌های امروز</CardTitle>
          <Badge variant="info" size="sm" dot>
            {appointments.length} نوبت
          </Badge>
        </div>
        {appointments.length > 0 ? (
          <Table
            columns={appointmentColumns}
            data={appointments}
            rowKey={(item) => item.id}
            className="rounded-none border-0"
          />
        ) : (
          <div className="px-5 py-8">
            <EmptyState title="نوبتی ثبت نشده" description="برای امروز هیچ نوبتی ثبت نشده است." />
          </div>
        )}
      </Card>

      {appointments.length === 0 && (
        <EmptyState
          title="داده‌ای وجود ندارد"
          description="از بخش تقویم یک نوبت جدید ثبت کنید."
          action={
            <Button
              variant="primary"
              startIcon={<BiCalendar />}
              data-tour="dash-empty-appointment"
              onClick={() => navigate("/calendar")}
            >
              ثبت نوبت جدید
            </Button>
          }
        />
      )}

      {patientModalOpen && (
        <PatientFormModal
          onClose={() => setPatientModalOpen(false)}
          onSave={handleSavePatient}
          isPending={createMutation.isPending}
        />
      )}
    </div>
  );
}

export default Dashboard;
