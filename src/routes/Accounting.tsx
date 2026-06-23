import jalaali from "jalaali-js";
import { useEffect, useMemo, useState } from "react";
import { BiDownload, BiPlus } from "react-icons/bi";
import { CiMoneyBill, CiReceipt } from "react-icons/ci";
import { FaRegEye } from "react-icons/fa";
import { IoCardOutline, IoCashOutline } from "react-icons/io5";
import { MdAttachMoney } from "react-icons/md";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { AddTransactionModal } from "../components/accounting/AddTransactionModal";
import { TransactionDetailModal } from "../components/accounting/TransactionDetailModal";
import { SearchButton } from "../components/SearchButton";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardTitle } from "../components/ui/Card";
import { JalaliDatePicker } from "../components/ui/JalaliDatePicker";
import { Pagination } from "../components/ui/Pagination";
import { Select } from "../components/ui/Select";
import { type Column, Table } from "../components/ui/Table";
import { useCreatePayment, usePaymentsList, useServicesList } from "../hooks/api";
import { useQuickActions } from "../hooks/useQuickActions";
import { exportTransactionsToExcel } from "../lib/excel";
import type {
  AccountingStat,
  DailyRevenue,
  PeriodFilter,
  Transaction,
  TransactionFormData,
} from "../types/accounting";

const transactionStatusMap: Record<
  Transaction["status"],
  { label: string; variant: "success" | "danger" }
> = {
  paid: { label: "پرداخت شده", variant: "success" },
  cancelled: { label: "لغو شده", variant: "danger" },
};

const paymentMethodLabels: Record<string, string> = {
  cash: "نقدی",
  card: "کارت خوان",
  online: "آنلاین",
  cheque: "چک",
};

const periodLabels: Record<PeriodFilter, string> = {
  today: "روزانه",
  week: "هفتگی",
  month: "ماهانه",
  threeMonths: "۳ ماهه",
  year: "سالانه",
};

const periodKeys: PeriodFilter[] = ["today", "week", "month", "threeMonths", "year"];
const chartTitleMap: Record<PeriodFilter, string> = {
  today: "روند درآمد روزانه",
  week: "روند درآمد هفتگی",
  month: "روند درآمد ماهانه",
  threeMonths: "روند درآمد ۳ ماهه",
  year: "روند درآمد سالانه",
};

const formatPrice = (amount: number) => amount.toLocaleString("fa-IR");

const jalaliMonthNames = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

const persianSeasons = ["بهار", "تابستان", "پاییز", "زمستان"];

function toLatinDigits(str: string): string {
  const persian = "۰۱۲۳۴۵۶۷۸۹";
  return str.replace(/[۰-۹]/g, (d) => String(persian.indexOf(d)));
}

function toPersianDigits(str: string): string {
  const persian = "۰۱۲۳۴۵۶۷۸۹";
  return str.replace(/\d/g, (d) => persian[Number(d)]);
}

function getPersianToday(): string {
  const now = new Date();
  const { jy, jm, jd } = jalaali.toJalaali(now);
  return toPersianDigits(`${jy}/${String(jm).padStart(2, "0")}/${String(jd).padStart(2, "0")}`);
}

function addDays(jalaliStr: string, days: number): string {
  const latin = toLatinDigits(jalaliStr);
  const parts = latin.split("/").map(Number);
  if (parts.length !== 3) return jalaliStr;
  const [jy, jm, jd] = parts;
  const date = jalaali.jalaaliToDateObject(jy, jm, jd);
  date.setDate(date.getDate() + days);
  const { jy: ny, jm: nm, jd: nd } = jalaali.toJalaali(date);
  return toPersianDigits(`${ny}/${String(nm).padStart(2, "0")}/${String(nd).padStart(2, "0")}`);
}

function addMonths(jalaliStr: string, months: number): string {
  const latin = toLatinDigits(jalaliStr);
  const parts = latin.split("/").map(Number);
  if (parts.length !== 3) return jalaliStr;
  const [jy, jm, jd] = parts;
  const date = jalaali.jalaaliToDateObject(jy, jm, jd);
  date.setMonth(date.getMonth() + months);
  const { jy: ny, jm: nm, jd: nd } = jalaali.toJalaali(date);
  return toPersianDigits(`${ny}/${String(nm).padStart(2, "0")}/${String(nd).padStart(2, "0")}`);
}

function addYears(jalaliStr: string, years: number): string {
  const latin = toLatinDigits(jalaliStr);
  const parts = latin.split("/").map(Number);
  if (parts.length !== 3) return jalaliStr;
  const [jy, jm, jd] = parts;
  const date = jalaali.jalaaliToDateObject(jy, jm, jd);
  date.setFullYear(date.getFullYear() + years);
  const { jy: ny, jm: nm, jd: nd } = jalaali.toJalaali(date);
  return toPersianDigits(`${ny}/${String(nm).padStart(2, "0")}/${String(nd).padStart(2, "0")}`);
}

function getPeriodDateRange(period: PeriodFilter): { from: string; to: string } {
  const today = getPersianToday();

  switch (period) {
    case "today":
      return { from: today, to: today };
    case "week":
      return { from: addDays(today, -6), to: today };
    case "month":
      return { from: addMonths(today, -1), to: today };
    case "threeMonths":
      return { from: addMonths(today, -3), to: today };
    case "year":
      return { from: addYears(today, -1), to: today };
  }
}

function computeStats(transactions: Transaction[], period: PeriodFilter): AccountingStat[] {
  const { from, to } = getPeriodDateRange(period);
  const todayStr = getPersianToday();

  const todayTransactions = transactions.filter((t) => t.date === todayStr && t.status === "paid");
  const todaySum = todayTransactions.reduce((s, t) => s + t.amount, 0);

  const periodTransactions = transactions.filter(
    (t) => t.date >= from && t.date <= to && t.status === "paid"
  );
  const periodSum = periodTransactions.reduce((s, t) => s + t.amount, 0);

  return [
    {
      title: "درآمد امروز",
      value: formatPrice(todaySum),
      icon: <CiMoneyBill className="text-success-600 size-6" />,
      trend: "up",
      change: "بر اساس تراکنش‌های امروز",
    },
    {
      title: `درآمد ${periodLabels[period]}`,
      value: formatPrice(periodSum),
      icon: <CiReceipt className="text-primary-600 size-6" />,
      trend: "up",
      change: `${periodTransactions.length} تراکنش`,
    },
    {
      title: "تعداد تراکنش‌ها",
      value: String(periodTransactions.length),
      icon: <IoCashOutline className="text-warning-600 size-6" />,
      trend: periodTransactions.length >= 5 ? "up" : "down",
      change: `${periodTransactions.filter((t) => t.status === "paid").length} موفق`,
    },
    {
      title: "میانگین هر تراکنش",
      value:
        periodTransactions.length > 0
          ? formatPrice(Math.round(periodSum / periodTransactions.length))
          : "۰",
      icon: <IoCardOutline className="text-info-600 size-6" />,
      trend: "up",
      change: "تومان",
    },
  ];
}

function getRevenueData(transactions: Transaction[], period: PeriodFilter): DailyRevenue[] {
  const { to: periodTo } = getPeriodDateRange(period);

  switch (period) {
    case "today": {
      const from = addDays(periodTo, -29);
      const paid = transactions.filter(
        (t) => t.date >= from && t.date <= periodTo && t.status === "paid"
      );
      const grouped = new Map<string, number>();
      paid.forEach((t) => {
        grouped.set(t.date, (grouped.get(t.date) || 0) + t.amount);
      });
      const days: DailyRevenue[] = [];
      let current = from;
      while (current <= periodTo) {
        days.push({ day: current.slice(5), amount: grouped.get(current) || 0 });
        current = addDays(current, 1);
      }
      return days;
    }
    case "week": {
      const from = addDays(periodTo, -55);
      const paid = transactions.filter(
        (t) => t.date >= from && t.date <= periodTo && t.status === "paid"
      );
      const weeks: DailyRevenue[] = [];
      let weekStart = from;
      while (weekStart <= periodTo) {
        const weekEnd = addDays(weekStart, 6);
        const amount = paid
          .filter((t) => t.date >= weekStart && t.date <= weekEnd)
          .reduce((s, t) => s + t.amount, 0);
        weeks.push({
          day: `${weekStart.slice(5)}-${weekEnd.slice(5)}`,
          amount,
        });
        weekStart = addDays(weekStart, 7);
      }
      return weeks;
    }
    case "month": {
      const from = addMonths(periodTo, -11);
      const paid = transactions.filter(
        (t) => t.date >= from && t.date <= periodTo && t.status === "paid"
      );
      const grouped = new Map<string, number>();
      paid.forEach((t) => {
        const monthKey = t.date.slice(0, 7);
        grouped.set(monthKey, (grouped.get(monthKey) || 0) + t.amount);
      });
      const months: DailyRevenue[] = [];
      let current = from;
      while (current <= periodTo) {
        const monthKey = current.slice(0, 7);
        const latinKey = toLatinDigits(monthKey);
        const parts = latinKey.split("/");
        const yearSuffix = toPersianDigits(parts[0].slice(-2));
        const monthNum = parseInt(parts[1], 10);
        months.push({
          day: `${jalaliMonthNames[monthNum - 1]} ${yearSuffix}`,
          amount: grouped.get(monthKey) || 0,
        });
        current = addMonths(current, 1);
      }
      return months;
    }
    case "threeMonths": {
      const from = addMonths(periodTo, -11);
      const paid = transactions.filter(
        (t) => t.date >= from && t.date <= periodTo && t.status === "paid"
      );
      const grouped = new Map<string, number>();
      paid.forEach((t) => {
        const latinKey = toLatinDigits(t.date.slice(0, 7));
        const [y, m] = latinKey.split("/").map(Number);
        const qIdx = Math.floor((m - 1) / 3);
        const seasonKey = `${y}-${qIdx}`;
        grouped.set(seasonKey, (grouped.get(seasonKey) || 0) + t.amount);
      });
      const quarters: DailyRevenue[] = [];
      let current = from;
      while (current <= periodTo) {
        const monthKey = current.slice(0, 7);
        const latinKey = toLatinDigits(monthKey);
        const parts = latinKey.split("/");
        const yearNum = parts[0];
        const monthNum = parseInt(parts[1], 10);
        const qIdx = Math.floor((monthNum - 1) / 3);
        const seasonKey = `${yearNum}-${qIdx}`;
        const yearSuffix = toPersianDigits(yearNum.slice(-2));
        quarters.push({
          day: `${persianSeasons[qIdx]} ${yearSuffix}`,
          amount: grouped.get(seasonKey) || 0,
        });
        current = addMonths(current, 3);
      }
      return quarters;
    }
    case "year": {
      const from = addYears(periodTo, -2);
      const paid = transactions.filter(
        (t) => t.date >= from && t.date <= periodTo && t.status === "paid"
      );
      const grouped = new Map<string, number>();
      paid.forEach((t) => {
        const yearKey = t.date.slice(0, 4);
        grouped.set(yearKey, (grouped.get(yearKey) || 0) + t.amount);
      });
      const years: DailyRevenue[] = [];
      let current = from;
      while (current <= periodTo) {
        const yearKey = current.slice(0, 4);
        years.push({
          day: yearKey,
          amount: grouped.get(yearKey) || 0,
        });
        current = addYears(current, 1);
      }
      return years;
    }
  }
}

function Accounting() {
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState("");
  const [activePeriod, setActivePeriod] = useState<PeriodFilter>("month");

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const { data: paginatedPayments } = usePaymentsList({ page: currentPage, perPage: 20 });
  const { data: servicesData } = useServicesList();
  const { mutateAsync: createPayment } = useCreatePayment();
  const transactions = paginatedPayments?.data ?? [];
  const services = servicesData?.data ?? [];

  const { registerAction } = useQuickActions();

  useEffect(() => {
    const unregister = registerAction({
      id: "newTransaction",
      label: "ثبت تراکنش جدید",
      icon: <MdAttachMoney />,
      perform: () => setAddModalOpen(true),
    });
    return unregister;
  }, [registerAction]);

  const stats = useMemo(
    () => computeStats(transactions as Transaction[], activePeriod),
    [transactions, activePeriod]
  );
  const revenueData = useMemo(
    () => getRevenueData(transactions, activePeriod),
    [transactions, activePeriod]
  );

  const filtered = useMemo(() => {
    const { from, to } = getPeriodDateRange(activePeriod);
    return transactions.filter((t) => {
      const dateFromMatch = dateFrom ? t.date >= dateFrom : true;
      const dateToMatch = dateTo ? t.date <= dateTo : true;
      const periodMatch =
        activePeriod === "today" ? t.date === from : t.date >= from && t.date <= to;
      const typeMatch = typeFilter ? t.status === typeFilter : true;
      return dateFromMatch && dateToMatch && periodMatch && typeMatch;
    });
  }, [transactions, dateFrom, dateTo, typeFilter, activePeriod]);

  const pageSize = 10;
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginatedData = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  async function handleAddTransaction(data: TransactionFormData) {
    await createPayment({
      patientId: data.patientId,
      date: data.date,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      description: data.description,
    });
    setAddModalOpen(false);
  }

  function openDetailModal(transaction: Transaction) {
    setSelectedTransaction(transaction);
    setDetailModalOpen(true);
  }

  const selectedService = useMemo(
    () =>
      selectedTransaction
        ? services.find((s) => s.id === selectedTransaction.serviceId)
        : undefined,
    [selectedTransaction, services]
  );

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
      render: (item) => (
        <Button
          variant="ghost"
          size="sm"
          startIcon={<FaRegEye className="size-4" />}
          onClick={() => openDetailModal(item)}
        >
          جزئیات
        </Button>
      ),
    },
  ];

  function clearFilters() {
    setDateFrom(null);
    setDateTo(null);
    setTypeFilter("");
    setCurrentPage(1);
  }

  const hasFilters = dateFrom !== null || dateTo !== null || typeFilter !== "";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-surface-900 text-2xl font-bold">حسابداری</h1>
        </div>
        <div className="mt-3 flex items-center gap-3 sm:mt-0">
          <Button
            variant="outline"
            startIcon={<BiDownload className="size-5" />}
            onClick={() => exportTransactionsToExcel(transactions)}
          >
            گزارش اکسل
          </Button>
          <Button
            variant="primary"
            startIcon={<BiPlus className="size-5" />}
            onClick={() => setAddModalOpen(true)}
          >
            ثبت تراکنش
          </Button>
          <SearchButton />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {periodKeys.map((key) => (
          <button
            key={key}
            onClick={() => {
              setActivePeriod(key);
              setCurrentPage(1);
            }}
            className={`focus-visible:ring-primary-600/40 cursor-pointer rounded-lg px-3.5 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none ${
              activePeriod === key
                ? "bg-primary-600 text-white shadow-sm"
                : "text-surface-600 hover:bg-surface-100 active:bg-surface-200 border-surface-200 border"
            }`}
            aria-pressed={activePeriod === key}
          >
            {periodLabels[key]}
          </button>
        ))}
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
            </div>
          </Card>
        ))}
      </div>

      <Card variant="outlined" padding="lg">
        <CardTitle>{chartTitleMap[activePeriod]}</CardTitle>
        <div className="mt-4" dir="ltr">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={revenueData} margin={{ top: 8, right: 8, left: -16, bottom: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 12, fill: "#64748b" }}
                axisLine={{ stroke: "#e2e8f0" }}
                tickLine={false}
                angle={-30}
                textAnchor="end"
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
              <Bar dataKey="amount" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card variant="outlined" padding="none">
        <div className="border-surface-200 flex flex-col gap-4 border-b px-5 py-4 sm:flex-row sm:items-end">
          <div className="flex items-center gap-2">
            <span className="text-surface-600 text-sm font-medium">فیلترها:</span>
          </div>
          <JalaliDatePicker
            label="از تاریخ"
            value={dateFrom}
            onChange={(d) => {
              setDateFrom(d);
              setCurrentPage(1);
            }}
            containerClassName="w-full sm:w-40"
          />
          <JalaliDatePicker
            label="تا تاریخ"
            value={dateTo}
            onChange={(d) => {
              setDateTo(d);
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
                { value: "cancelled", label: "لغو شده" },
              ]}
            />
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
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

      <AddTransactionModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSave={handleAddTransaction}
        services={services}
      />

      <TransactionDetailModal
        open={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedTransaction(null);
        }}
        transaction={selectedTransaction}
        service={selectedService}
      />
    </div>
  );
}

export default Accounting;
