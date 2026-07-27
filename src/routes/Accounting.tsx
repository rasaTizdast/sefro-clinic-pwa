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
import { type Column, Table } from "../components/ui/Table";
import { useFilteredReports, usePaymentsList, useServicesList } from "../hooks/api";
import { useQuickActions } from "../hooks/useQuickActions";
import { jalaliToShamsiApiDate } from "../lib/date";
import { exportTransactionsToExcel } from "../lib/excel";
import { exportAllPayments } from "../services/payments";
import type { AccountingStat, DailyRevenue, PeriodFilter, Transaction } from "../types/accounting";

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
  transfer: "کارت به کارت",
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

function getChartLookback(period: PeriodFilter, to: string): string {
  switch (period) {
    case "today":
      return addDays(to, -29);
    case "week":
      return addDays(to, -55);
    case "month":
      return addMonths(to, -11);
    case "threeMonths":
      return addMonths(to, -11);
    case "year":
      return addYears(to, -2);
  }
}

function formatChartData(
  chart: {
    daily: { period: string; total: number }[];
    weekly: { period: string; total: number }[];
    monthly: { period: string; total: number }[];
    quarterly: { period: string; total: number }[];
    yearly: { period: string; total: number }[];
  },
  period: PeriodFilter
): DailyRevenue[] {
  switch (period) {
    case "today": {
      return chart.daily.map((d) => ({
        day: toPersianDigits(d.period.slice(5)),
        amount: d.total,
      }));
    }
    case "week": {
      return chart.weekly.map((d) => {
        const dayLabel = toPersianDigits(d.period.replace("/", "/"));
        return { day: dayLabel, amount: d.total };
      });
    }
    case "month": {
      return chart.monthly.map((d) => {
        const latin = toLatinDigits(d.period);
        const parts = latin.split("/");
        const monthNum = parseInt(parts[1], 10);
        const yearSuffix = toPersianDigits(parts[0].slice(-2));
        return {
          day: `${jalaliMonthNames[monthNum - 1]} ${yearSuffix}`,
          amount: d.total,
        };
      });
    }
    case "threeMonths": {
      return chart.quarterly.map((d) => {
        const latin = toLatinDigits(d.period);
        const parts = latin.split("/");
        const qIdx = parseInt(parts[1], 10) - 1;
        const yearSuffix = toPersianDigits(parts[0].slice(-2));
        return {
          day: `${persianSeasons[qIdx]} ${yearSuffix}`,
          amount: d.total,
        };
      });
    }
    case "year": {
      return chart.yearly.map((d) => ({
        day: toPersianDigits(d.period),
        amount: d.total,
      }));
    }
  }
}

function Accounting() {
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [activePeriod, setActivePeriod] = useState<PeriodFilter>("month");

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [exporting, setExporting] = useState(false);

  const todayStr = getPersianToday();
  const todayISO = jalaliToShamsiApiDate(todayStr);
  const { from: periodFrom, to: periodTo } = getPeriodDateRange(activePeriod);
  const periodFromISO = jalaliToShamsiApiDate(periodFrom);
  const periodToISO = jalaliToShamsiApiDate(periodTo);
  const chartFrom = getChartLookback(activePeriod, periodTo);
  const chartFromISO = jalaliToShamsiApiDate(chartFrom);

  const { data: paginatedPayments, isLoading: paymentsLoading } = usePaymentsList({
    page: currentPage,
    perPage: 20,
    dateFrom: dateFrom ? jalaliToShamsiApiDate(dateFrom) : periodFromISO,
    dateTo: dateTo ? jalaliToShamsiApiDate(dateTo) : periodToISO,
  });
  const { data: servicesData } = useServicesList();
  const { data: periodReport } = useFilteredReports(periodFromISO, periodToISO);
  const { data: todayReport } = useFilteredReports(todayISO, todayISO);
  const { data: chartReport } = useFilteredReports(chartFromISO, periodToISO);

  const transactions = paginatedPayments?.data ?? [];
  const services = useMemo(() => servicesData?.data ?? [], [servicesData]);

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

  const stats = useMemo<AccountingStat[]>(() => {
    const todayRevenue = todayReport?.totalRevenue ?? 0;
    const periodRevenue = periodReport?.totalRevenue ?? 0;
    const periodVisits = periodReport?.totalVisits ?? 0;

    return [
      {
        title: "درآمد امروز",
        value: formatPrice(todayRevenue),
        icon: <CiMoneyBill className="text-success-600 size-6" />,
        trend: "up",
        change: "بر اساس گزارش امروز",
      },
      {
        title: `درآمد ${periodLabels[activePeriod]}`,
        value: formatPrice(periodRevenue),
        icon: <CiReceipt className="text-primary-600 size-6" />,
        trend: "up",
        change: `${periodVisits} تراکنش`,
      },
      {
        title: "تعداد تراکنش‌ها",
        value: String(periodVisits),
        icon: <IoCashOutline className="text-warning-600 size-6" />,
        trend: periodVisits >= 5 ? "up" : "down",
        change: `${periodVisits} در این دوره`,
      },
      {
        title: "میانگین هر تراکنش",
        value: periodVisits > 0 ? formatPrice(Math.round(periodRevenue / periodVisits)) : "۰",
        icon: <IoCardOutline className="text-info-600 size-6" />,
        trend: "up",
        change: "تومان",
      },
    ];
  }, [periodReport, todayReport, activePeriod]);

  const revenueData = useMemo(
    () => (chartReport ? formatChartData(chartReport.salesChart, activePeriod) : []),
    [chartReport, activePeriod]
  );

  const totalPages = paginatedPayments?.totalPages ?? 1;

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

  async function handleExcelExport() {
    setExporting(true);
    try {
      const allPayments = await exportAllPayments(
        dateFrom ? jalaliToShamsiApiDate(dateFrom) : periodFromISO,
        dateTo ? jalaliToShamsiApiDate(dateTo) : periodToISO
      );
      exportTransactionsToExcel(allPayments);
    } finally {
      setExporting(false);
    }
  }

  const columns: Column<Transaction>[] = [
    { key: "date", header: "تاریخ", width: "110px", align: "center" },
    { key: "patient", header: "بیمار" },
    { key: "description", header: "توضیحات" },
    {
      key: "amount",
      header: "مبلغ (تومان)",
      align: "end",
      width: "140px",
      render: (item: Transaction) => (
        <span className="text-surface-900 font-medium">{formatPrice(item.amount)}</span>
      ),
    },
    {
      key: "paymentMethod",
      header: "روش پرداخت",
      align: "center",
      width: "110px",
      render: (item: Transaction) => (
        <span className="text-surface-600">{paymentMethodLabels[item.paymentMethod]}</span>
      ),
    },
    {
      key: "status",
      header: "وضعیت",
      align: "center",
      width: "110px",
      render: (item: Transaction) => {
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
      render: (item: Transaction) => (
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
    setCurrentPage(1);
  }

  const hasFilters = dateFrom !== null || dateTo !== null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-surface-900 text-2xl font-bold" data-tour="acc-header">
            حسابداری
          </h1>
        </div>
        <div className="mt-3 flex items-center gap-3 sm:mt-0">
          <Button
            variant="outline"
            startIcon={<BiDownload className="size-5" />}
            onClick={handleExcelExport}
            disabled={exporting}
          >
            {exporting ? "در حال خروجی..." : "گزارش اکسل"}
          </Button>
          <div data-tour="acc-add">
            <Button
              variant="primary"
              startIcon={<BiPlus className="size-5" />}
              onClick={() => setAddModalOpen(true)}
            >
              ثبت تراکنش
            </Button>
          </div>
          <SearchButton />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2" data-tour="acc-periods">
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" data-tour="acc-stats">
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

      <Card variant="outlined" padding="lg" data-tour="acc-chart">
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

      <Card variant="outlined" padding="none" data-tour="acc-table">
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
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              پاک کردن فیلترها
            </Button>
          )}
        </div>
        {paymentsLoading && transactions.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-sm text-gray-400">
            در حال بارگذاری...
          </div>
        ) : (
          <Table
            columns={columns}
            data={transactions}
            rowKey={(item) => item.id}
            className="rounded-none border-0"
          />
        )}
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

      <AddTransactionModal open={addModalOpen} onClose={() => setAddModalOpen(false)} />

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
