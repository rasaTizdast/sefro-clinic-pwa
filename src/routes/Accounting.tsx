import { useState } from "react";
import { BiDownload, BiPlus } from "react-icons/bi";
import { CiMoneyBill, CiReceipt } from "react-icons/ci";
import { IoCardOutline, IoCashOutline } from "react-icons/io5";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { SearchButton } from "../components/SearchButton";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardTitle } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Pagination } from "../components/ui/Pagination";
import { Select } from "../components/ui/Select";
import { type Column, Table } from "../components/ui/Table";
import type { AccountingStat, DailyRevenue, Transaction } from "../types/accounting";

const transactionStatusMap: Record<
  Transaction["status"],
  { label: string; variant: "success" | "warning" | "danger" }
> = {
  paid: { label: "پرداخت شده", variant: "success" },
  pending: { label: "در انتظار", variant: "warning" },
  cancelled: { label: "لغو شده", variant: "danger" },
};

const paymentMethodLabels: Record<string, string> = {
  cash: "نقدی",
  card: "کارت خوان",
  online: "آنلاین",
  cheque: "چک",
};

const stats: AccountingStat[] = [
  {
    title: "درآمد امروز",
    value: "۱۲,۵۰۰,۰۰۰",
    icon: <CiMoneyBill className="text-success-600 size-6" />,
    trend: "up",
    change: "+۲,۳۰۰,۰۰۰",
  },
  {
    title: "درآمد ماهانه",
    value: "۳۴۵,۰۰۰,۰۰۰",
    icon: <CiReceipt className="text-primary-600 size-6" />,
    trend: "up",
    change: "+۴۵,۰۰۰,۰۰۰",
  },
  {
    title: "صورت‌های پرداخت نشده",
    value: "۲۸,۵۰۰,۰۰۰",
    icon: <IoCashOutline className="text-warning-600 size-6" />,
    trend: "down",
    change: "-۳,۲۰۰,۰۰۰",
  },
  {
    title: "هزینه‌ها",
    value: "۱۵۶,۰۰۰,۰۰۰",
    icon: <IoCardOutline className="text-danger-600 size-6" />,
    trend: "down",
    change: "+۱۲,۰۰۰,۰۰۰",
  },
];

const dailyRevenue: DailyRevenue[] = [
  { day: "شنبه", amount: 4200000 },
  { day: "یکشنبه", amount: 5800000 },
  { day: "دوشنبه", amount: 3500000 },
  { day: "سه‌شنبه", amount: 7200000 },
  { day: "چهارشنبه", amount: 4900000 },
  { day: "پنج‌شنبه", amount: 8100000 },
  { day: "جمعه", amount: 2100000 },
];

const mockTransactions: Transaction[] = [
  {
    id: 1,
    date: "۱۴۰۵/۰۳/۰۳",
    description: "ویزیت تخصصی قلب",
    patient: "علی رضایی",
    amount: 2500000,
    paymentMethod: "cash",
    status: "paid",
  },
  {
    id: 2,
    date: "۱۴۰۵/۰۳/۰۳",
    description: "آزمایش خون کامل",
    patient: "سارا احمدی",
    amount: 1800000,
    paymentMethod: "card",
    status: "paid",
  },
  {
    id: 3,
    date: "۱۴۰۵/۰۳/۰۳",
    description: "سونوگرافی شکم",
    patient: "رضا کریمی",
    amount: 3200000,
    paymentMethod: "online",
    status: "pending",
  },
  {
    id: 4,
    date: "۱۴۰۵/۰۳/۰۲",
    description: "ویزیت عمومی",
    patient: "مریم نوروزی",
    amount: 1500000,
    paymentMethod: "cash",
    status: "paid",
  },
  {
    id: 5,
    date: "۱۴۰۵/۰۳/۰۲",
    description: "نوار قلب",
    patient: "امیر عباسی",
    amount: 2200000,
    paymentMethod: "card",
    status: "cancelled",
  },
  {
    id: 6,
    date: "۱۴۰۵/۰۳/۰۲",
    description: "ویزیت کودکان",
    patient: "نگین صادقی",
    amount: 2000000,
    paymentMethod: "cheque",
    status: "pending",
  },
  {
    id: 7,
    date: "۱۴۰۵/۰۳/۰۱",
    description: "فیزیوتراپی",
    patient: "حسین محمدی",
    amount: 4500000,
    paymentMethod: "online",
    status: "paid",
  },
  {
    id: 8,
    date: "۱۴۰۵/۰۳/۰۱",
    description: "ویزیت پوست",
    patient: "فاطمه حسینی",
    amount: 2800000,
    paymentMethod: "cash",
    status: "paid",
  },
  {
    id: 9,
    date: "۱۴۰۵/۰۲/۳۰",
    description: "آزمایش تیروئید",
    patient: "محمد رضایی",
    amount: 1950000,
    paymentMethod: "card",
    status: "paid",
  },
  {
    id: 10,
    date: "۱۴۰۵/۰۲/۳۰",
    description: "مشاوره تغذیه",
    patient: "زهرا احمدی",
    amount: 1200000,
    paymentMethod: "online",
    status: "pending",
  },
  {
    id: 11,
    date: "۱۴۰۵/۰۲/۲۹",
    description: "ویزیت ارتوپدی",
    patient: "امیرحسین کریمی",
    amount: 3500000,
    paymentMethod: "cheque",
    status: "cancelled",
  },
  {
    id: 12,
    date: "۱۴۰۵/۰۲/۲۹",
    description: "تزریق و پانسمان",
    patient: "محسن عباسی",
    amount: 850000,
    paymentMethod: "cash",
    status: "paid",
  },
];

const formatPrice = (amount: number) => amount.toLocaleString("fa-IR");

function Accounting() {
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const pageSize = 10;

  const filtered = mockTransactions.filter((t) => {
    if (dateFrom && t.date < dateFrom) return false;
    if (dateTo && t.date > dateTo) return false;
    if (typeFilter && t.status !== typeFilter) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginatedData = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const columns: Column<Transaction>[] = [
    { key: "date", header: "تاریخ", width: "110px", align: "center" },
    { key: "description", header: "توضیحات" },
    { key: "patient", header: "بیمار" },
    {
      key: "amount",
      header: "مبلغ (تومان)",
      align: "end",
      width: "140px",
      render: (item) => (
        <span className="text-surface-900 font-medium">{formatPrice(item.amount)}</span>
      ),
    },
    {
      key: "paymentMethod",
      header: "روش پرداخت",
      align: "center",
      width: "110px",
      render: (item) => (
        <span className="text-surface-600">{paymentMethodLabels[item.paymentMethod]}</span>
      ),
    },
    {
      key: "status",
      header: "وضعیت",
      align: "center",
      width: "110px",
      render: (item) => {
        const s = transactionStatusMap[item.status];
        return (
          <Badge variant={s.variant} size="sm">
            {s.label}
          </Badge>
        );
      },
    },
    {
      key: "actions",
      header: "عملیات",
      align: "center",
      width: "90px",
      render: () => (
        <Button variant="ghost" size="sm">
          جزئیات
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-surface-900 text-2xl font-bold">حسابداری</h1>
        </div>
        <div className="mt-3 flex items-center gap-3 sm:mt-0">
          <Button variant="outline" startIcon={<BiDownload className="size-5" />}>
            گزارش اکسل
          </Button>
          <Button variant="primary" startIcon={<BiPlus className="size-5" />}>
            ثبت تراکنش
          </Button>
          <SearchButton />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} variant="outlined" padding="lg">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-surface-500 text-sm">{stat.title}</span>
                <span className="text-surface-900 text-2xl font-bold">{stat.value}</span>
              </div>
              <div className="bg-surface-50 rounded-lg p-2.5">{stat.icon}</div>
            </div>
            <div className="mt-4 flex items-center gap-1">
              <span
                className={`text-sm font-semibold ${
                  stat.trend === "up" ? "text-success-600" : "text-danger-600"
                }`}
              >
                {stat.change}
              </span>
              <span className="text-surface-500 text-xs">نسبت به ماه قبل</span>
            </div>
          </Card>
        ))}
      </div>

      <Card variant="outlined" padding="lg">
        <CardTitle>درآمد روزانه (۷ روز اخیر)</CardTitle>
        <div className="mt-4" dir="ltr">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dailyRevenue} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 12, fill: "#64748b" }}
                axisLine={{ stroke: "#e2e8f0" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${(v / 1000000).toFixed(0)}م`}
              />
              <Tooltip
                formatter={(value: unknown) => [`${formatPrice(Number(value))} تومان`, "درآمد"]}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  fontSize: 13,
                }}
              />
              <Bar dataKey="amount" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card variant="outlined" padding="none">
        <div className="border-surface-200 flex flex-col gap-4 border-b px-5 py-4 sm:flex-row sm:items-end">
          <div className="flex items-center gap-2">
            <span className="text-surface-600 text-sm font-medium">فیلترها:</span>
          </div>
          <Input
            type="date"
            label="از تاریخ"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setCurrentPage(1);
            }}
            containerClassName="w-full sm:w-40"
          />
          <Input
            type="date"
            label="تا تاریخ"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setCurrentPage(1);
            }}
            containerClassName="w-full sm:w-40"
          />
          <div className="w-full sm:w-44">
            <Select
              label="نوع تراکنش"
              placeholder="همه"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              options={[
                { value: "paid", label: "پرداخت شده" },
                { value: "pending", label: "در انتظار" },
                { value: "cancelled", label: "لغو شده" },
              ]}
            />
          </div>
          {(dateFrom || dateTo || typeFilter) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDateFrom("");
                setDateTo("");
                setTypeFilter("");
                setCurrentPage(1);
              }}
            >
              پاک کردن فیلترها
            </Button>
          )}
        </div>
        <Table
          columns={columns}
          data={paginatedData}
          rowKey={(item) => item.id}
          className="rounded-none border-0"
        />
        {totalPages > 1 && (
          <div className="border-surface-200 flex items-center justify-center border-t px-5 py-4">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </Card>
    </div>
  );
}

export default Accounting;
