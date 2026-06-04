import { useCallback, useState } from "react";
import {
  BiCalendar,
  BiMinus,
  BiPlus,
  BiSearch,
  BiTrendingDown,
  BiTrendingUp,
} from "react-icons/bi";
import { IoDocumentTextOutline } from "react-icons/io5";
import { MdEventAvailable, MdPayments, MdPeople, MdPersonAdd } from "react-icons/md";

import PatientFormModal from "../components/patients/PatientFormModal";
import { SearchButton } from "../components/SearchButton";
import { useToast } from "../components/ui";
import { Alert } from "../components/ui/Alert";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardTitle } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Progress } from "../components/ui/Progress";
import { Skeleton, SkeletonTable } from "../components/ui/Skeleton";
import { type Column, Table } from "../components/ui/Table";
import { toPersianDigits } from "../lib/digits";
import type { Appointment } from "../types/appointment";
import type { PageState, Trend } from "../types/common";
import type { DashboardStat } from "../types/dashboard";
import type { Patient } from "../types/patient";

const appointmentStatusMap: Record<
  Appointment["status"],
  { label: string; variant: "success" | "warning" | "danger" | "info" }
> = {
  confirmed: { label: "تأیید شده", variant: "success" },
  waiting: { label: "در انتظار", variant: "warning" },
  cancelled: { label: "لغو شده", variant: "danger" },
  completed: { label: "انجام شده", variant: "info" },
};

const patientStatusMap: Record<
  "active" | "inactive" | "new",
  { label: string; variant: "success" | "warning" | "info" }
> = {
  active: { label: "فعال", variant: "success" },
  inactive: { label: "غیرفعال", variant: "warning" },
  new: { label: "جدید", variant: "info" },
};

type QuickAction = {
  label: string;
  icon: React.ReactNode;
  variant: "primary" | "secondary" | "outline" | "ghost";
  onClick?: () => void;
};

const appointmentColumns: Column<Appointment>[] = [
  { key: "time", header: "ساعت", width: "80px" },
  { key: "patient", header: "بیمار" },
  { key: "doctor", header: "پزشک" },
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

const patientColumns: Column<
  Pick<Patient, "id" | "firstName" | "lastName" | "phone" | "lastVisit" | "status">
>[] = [
  {
    key: "name",
    header: "نام بیمار",
    render: (item) => `${item.firstName} ${item.lastName}`,
  },
  {
    key: "phone",
    header: "تلفن",
    render: (item) => toPersianDigits(item.phone),
  },
  { key: "lastVisit", header: "آخرین مراجعه", align: "center" },
  {
    key: "status",
    header: "وضعیت",
    align: "center",
    render: (item) => {
      const s = patientStatusMap[item.status];
      return (
        <Badge variant={s.variant} size="sm">
          {s.label}
        </Badge>
      );
    },
  },
];

function toLatinDigits(str: string): string {
  const persian = "۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩";
  return str.replace(/[۰-۹٠-٩]/g, (d) => String(persian.indexOf(d) % 10));
}

const mockAppointments: Appointment[] = [
  {
    id: 1,
    time: "۰۹:۰۰",
    patient: "علی رضایی",
    doctor: "دکتر محمدی",
    service: "",
    date: "",
    status: "completed",
  },
  {
    id: 2,
    time: "۰۹:۳۰",
    patient: "سارا احمدی",
    doctor: "دکتر محمدی",
    service: "",
    date: "",
    status: "confirmed",
  },
  {
    id: 3,
    time: "۱۰:۱۵",
    patient: "رضا کریمی",
    doctor: "دکتر حسینی",
    service: "",
    date: "",
    status: "waiting",
  },
  {
    id: 4,
    time: "۱۰:۴۵",
    patient: "مریم نوروزی",
    doctor: "دکتر حسینی",
    service: "",
    date: "",
    status: "confirmed",
  },
  {
    id: 5,
    time: "۱۱:۳۰",
    patient: "امیر عباسی",
    doctor: "دکتر محمدی",
    service: "",
    date: "",
    status: "cancelled",
  },
  {
    id: 6,
    time: "۱۲:۰۰",
    patient: "نگین صادقی",
    doctor: "دکتر احمدی",
    service: "",
    date: "",
    status: "waiting",
  },
];

const mockPatients: Pick<
  Patient,
  "id" | "firstName" | "lastName" | "phone" | "lastVisit" | "status"
>[] = [
  {
    id: 1,
    firstName: "علی",
    lastName: "رضایی",
    phone: "09123456789",
    lastVisit: "۱۴۰۵/۰۳/۰۳",
    status: "active",
  },
  {
    id: 2,
    firstName: "سارا",
    lastName: "احمدی",
    phone: "09198765432",
    lastVisit: "۱۴۰۵/۰۳/۰۳",
    status: "new",
  },
  {
    id: 3,
    firstName: "رضا",
    lastName: "کریمی",
    phone: "0933557788",
    lastVisit: "۱۴۰۵/۰۲/۲۸",
    status: "active",
  },
  {
    id: 4,
    firstName: "مریم",
    lastName: "نوروزی",
    phone: "0912223344",
    lastVisit: "۱۴۰۵/۰۲/۱۵",
    status: "inactive",
  },
  {
    id: 5,
    firstName: "امیر",
    lastName: "عباسی",
    phone: "0901887766",
    lastVisit: "۱۴۰۵/۰۳/۰۱",
    status: "active",
  },
  {
    id: 6,
    firstName: "زهرا",
    lastName: "محمدی",
    phone: "0930445566",
    lastVisit: "۱۴۰۵/۰۲/۲۵",
    status: "new",
  },
];

const stats: DashboardStat[] = [
  {
    title: "مراجعین امروز",
    value: "۱۲",
    change: "+۳",
    trend: "up",
    icon: <MdPeople className="size-5" />,
    variant: "default",
  },
  {
    title: "نوبت‌های امروز",
    value: "۸",
    change: "+۲",
    trend: "up",
    icon: <MdEventAvailable className="size-5" />,
    variant: "info",
  },
  {
    title: "درآمد امروز",
    value: "۵,۸۰۰,۰۰۰",
    change: "+۱,۲۰۰,۰۰۰",
    trend: "up",
    icon: <MdPayments className="size-5" />,
    variant: "success",
  },
  {
    title: "بیماران جدید",
    value: "۴",
    change: "بدون تغییر",
    trend: "flat",
    icon: <MdPersonAdd className="size-5" />,
    variant: "warning",
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
  const toast = useToast();
  const [pageState] = useState<PageState>("ready");
  const [today] = useState(getPersianDate);
  const [patientModalOpen, setPatientModalOpen] = useState(false);
  const [recentPatients] = useState(mockPatients);
  const completedCount = mockAppointments.filter((a) => a.status === "completed").length;
  const capacityPercent = Math.round((completedCount / mockAppointments.length) * 100);

  const handleAddPatient = useCallback(
    (patient: Patient) => {
      setPatientModalOpen(false);
      toast.success(
        "بیمار جدید ثبت شد",
        `${patient.firstName} ${patient.lastName} با موفقیت اضافه شد.`
      );
    },
    [toast]
  );

  const quickActions: QuickAction[] = [
    { label: "نوبت جدید", icon: <BiCalendar className="size-5" />, variant: "primary" as const },
    {
      label: "بیمار جدید",
      icon: <BiPlus className="size-5" />,
      variant: "secondary" as const,
      onClick: () => setPatientModalOpen(true),
    },
    { label: "جستجوی بیمار", icon: <BiSearch className="size-5" />, variant: "outline" as const },
    {
      label: "گزارش سریع",
      icon: <IoDocumentTextOutline className="size-5" />,
      variant: "ghost" as const,
    },
  ];

  if (pageState === "loading") {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <Skeleton width="160px" height="2rem" />
            <Skeleton width="200px" height="1rem" />
          </div>
          <Skeleton width="130px" height="2.5rem" variant="rectangular" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} variant="outlined" padding="lg">
              <div className="flex flex-col gap-3">
                <Skeleton width="60%" height="0.875rem" />
                <Skeleton width="40%" height="1.75rem" />
                <Skeleton width="100%" height="0.5rem" variant="rectangular" />
              </div>
            </Card>
          ))}
        </div>
        <Skeleton width="100%" height="6rem" variant="rectangular" />
        <div className="grid gap-6 xl:grid-cols-2">
          <SkeletonTable rows={4} columns={4} />
          <div className="flex flex-col gap-4">
            <Skeleton width="100%" height="4rem" variant="rectangular" />
            <SkeletonTable rows={3} columns={3} />
          </div>
        </div>
      </div>
    );
  }

  if (pageState === "error") {
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
            <Button variant="primary" startIcon={<BiPlus className="size-5" />}>
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
          <h1 className="text-surface-900 text-2xl font-bold">داشبورد</h1>
          <p className="text-surface-500 mt-1 text-sm">امروز: {today}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" startIcon={<BiPlus className="size-5" />}>
            نوبت جدید
          </Button>
          <SearchButton />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
            <Progress
              value={Number(toLatinDigits(stat.value).replace(/[^\d]/g, "")) * 7}
              variant={stat.variant}
              size="sm"
              className="mt-4"
            />
          </Card>
        ))}
      </div>

      <Card variant="outlined" padding="lg">
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

      <div className="grid gap-6 xl:grid-cols-2">
        <Card variant="outlined" padding="none">
          <div className="border-surface-200 flex items-center justify-between border-b px-5 py-4">
            <CardTitle>نوبت‌های امروز</CardTitle>
            <Badge variant="info" size="sm" dot>
              {mockAppointments.length} نوبت
            </Badge>
          </div>
          {mockAppointments.length > 0 ? (
            <Table
              columns={appointmentColumns}
              data={mockAppointments}
              rowKey={(item) => item.id}
              className="rounded-none border-0"
            />
          ) : (
            <div className="px-5 py-8">
              <EmptyState title="نوبتی ثبت نشده" description="برای امروز هیچ نوبتی ثبت نشده است." />
            </div>
          )}
        </Card>

        <div className="flex flex-col gap-6">
          <Card variant="outlined" padding="none">
            <div className="border-surface-200 flex items-center justify-between border-b px-5 py-4">
              <CardTitle>ظرفیت امروز</CardTitle>
              <span className="text-surface-500 text-sm font-medium">{capacityPercent}%</span>
            </div>
            <div className="px-5 pt-4">
              <Progress value={capacityPercent} variant="info" size="md" showLabel />
            </div>
            <div className="mt-2 px-5 pb-2">
              <div className="text-surface-500 flex items-center justify-between py-2 text-sm">
                <span>انجام شده: {completedCount}</span>
                <span>کل: {mockAppointments.length}</span>
              </div>
            </div>
          </Card>

          <Card variant="outlined" padding="none">
            <div className="border-surface-200 flex items-center justify-between border-b px-5 py-4">
              <CardTitle>مراجعین اخیر</CardTitle>
              <Badge variant="default" size="sm">
                {recentPatients.length} بیمار
              </Badge>
            </div>
            {recentPatients.length > 0 ? (
              <Table
                columns={patientColumns}
                data={recentPatients}
                rowKey={(item) => item.id}
                className="rounded-none border-0"
              />
            ) : (
              <div className="px-5 py-8">
                <EmptyState
                  title="بیماری ثبت نشده"
                  description="هنوز هیچ بیماری در سیستم ثبت نشده است."
                />
              </div>
            )}
          </Card>
        </div>
      </div>

      {mockAppointments.length === 0 && recentPatients.length === 0 && (
        <EmptyState
          title="داده‌ای وجود ندارد"
          description="با استفاده از دکمه بالای صفحه، اولین نوبت امروز را ثبت کنید."
          action={
            <Button variant="primary" startIcon={<BiPlus />}>
              ثبت نوبت جدید
            </Button>
          }
        />
      )}

      {patientModalOpen && (
        <PatientFormModal onClose={() => setPatientModalOpen(false)} onSuccess={handleAddPatient} />
      )}
    </div>
  );
}

export default Dashboard;
