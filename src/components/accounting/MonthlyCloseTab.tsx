import jalaali from "jalaali-js";
import { useMemo, useState } from "react";
import { BiChevronLeft, BiChevronRight } from "react-icons/bi";

import { useMonthlyCloseMonths } from "../../hooks/api";
import { toPersianDigits } from "../../lib/digits";
import { formatPrice } from "../../lib/format";
import type { MonthlyCloseMonth } from "../../types/finance";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { type Column, Table } from "../ui/Table";

const currentShamsiYear = () => jalaali.toJalaali(new Date()).jy;

/** Fallback labels while a month's own response has not landed yet. */
const MONTH_NAMES_FA = [
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

type MonthRow = {
  month: number;
  report?: MonthlyCloseMonth;
  isError: boolean;
};

/** Toman first and emphasized; the USD twin sits beside it, quieter. */
function moneyPair(usd: string | undefined, toman: string | undefined) {
  return (
    <span>
      <span className="text-surface-900 font-medium">{formatPrice(Number(toman || 0))} تومان</span>{" "}
      <span className="text-surface-400 text-xs" dir="ltr">
        ${Number(usd || 0).toFixed(2)}
      </span>
    </span>
  );
}

const isZero = (money: { usd: string; toman: string }) =>
  Number(money.usd || 0) === 0 && Number(money.toman || 0) === 0;

/** A month the table has nothing to say about: no revenue, profit or payout. */
function isEmptyMonth(report: MonthlyCloseMonth | undefined) {
  if (!report) return false;
  return (
    isZero(report.revenue) &&
    isZero(report.netProfit) &&
    isZero(report.payoutTotal) &&
    report.payoutTotal.payoutCount === 0
  );
}

/**
 * The "where did the year go" table: every Shamsi month with its P&L and
 * operator pay, one request per month so no single call is the year-heavy one.
 *
 * Numbers for a closed month come from the frozen snapshot, so what this table
 * shows for a closed row is exactly what closing stored — edits after the fact
 * land in later months, never in that one. Months with nothing in them are
 * striped; closing/reopening is the backend's own automation, not a button here.
 */
export function MonthlyCloseTab() {
  const [year, setYear] = useState<number>(currentShamsiYear);

  const { rows, isLoading, isError, refetchAll } = useMonthlyCloseMonths(year);

  const summary = useMemo(() => {
    const loaded = rows.map((row) => row.report).filter((report) => report != null);
    const sumUsdToman = (pick: (report: MonthlyCloseMonth) => { usd: string; toman: string }) =>
      loaded.reduce(
        (acc, report) => {
          const value = pick(report);
          return {
            usd: acc.usd + Number(value.usd || 0),
            toman: acc.toman + Number(value.toman || 0),
          };
        },
        { usd: 0, toman: 0 }
      );

    const revenue = sumUsdToman((report) => report.revenue);
    const netProfit = sumUsdToman((report) => report.netProfit);
    const payout = sumUsdToman((report) => report.payoutTotal);
    const payoutCount = loaded.reduce((acc, report) => acc + report.payoutTotal.payoutCount, 0);
    const closedCount = loaded.filter((report) => report.isClosed).length;

    return [
      { label: "درآمد سال", value: moneyPair(revenue.usd.toFixed(2), revenue.toman.toFixed(0)) },
      {
        label: "سود خالص",
        value: moneyPair(netProfit.usd.toFixed(2), netProfit.toman.toFixed(0)),
      },
      {
        label: "تسویه پرسنل",
        value: (
          <span>
            {moneyPair(payout.usd.toFixed(2), payout.toman.toFixed(0))}{" "}
            <span className="text-surface-400 text-xs">
              {toPersianDigits(String(payoutCount))} فیش
            </span>
          </span>
        ),
      },
      {
        label: "ماه‌های بسته",
        value: (
          <span className="text-surface-700 text-sm">
            {toPersianDigits(String(closedCount))} از {toPersianDigits(String(rows.length))}
          </span>
        ),
      },
    ];
  }, [rows]);

  const columns: Column<MonthRow>[] = [
    {
      key: "month",
      header: "ماه",
      render: (row) => (
        <div className="flex flex-col gap-1">
          <span className="text-surface-800 text-sm font-medium">
            {row.report?.monthName ?? MONTH_NAMES_FA[row.month - 1]}
          </span>
          <div className="flex flex-wrap gap-1">
            {row.report?.isCurrent && <Badge variant="info">ماه جاری</Badge>}
            {row.report?.isClosed && <Badge variant="danger">بسته</Badge>}
            {row.report && !row.report.isClosed && row.report.wasReopened && (
              <Badge variant="warning">بازشده</Badge>
            )}
            {row.isError && <Badge variant="danger">خطا</Badge>}
          </div>
        </div>
      ),
    },
    {
      key: "revenue",
      header: "درآمد",
      align: "center",
      render: (row) =>
        row.report ? moneyPair(row.report.revenue.usd, row.report.revenue.toman) : "—",
    },
    {
      key: "netProfit",
      header: "سود خالص",
      align: "center",
      render: (row) =>
        row.report ? moneyPair(row.report.netProfit.usd, row.report.netProfit.toman) : "—",
    },
    {
      key: "payout",
      header: "تسویه پرسنل",
      align: "center",
      render: (row) =>
        row.report ? (
          <span>{moneyPair(row.report.payoutTotal.usd, row.report.payoutTotal.toman)}</span>
        ) : (
          "—"
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            aria-label="سال قبل"
            onClick={() => setYear((y) => y - 1)}
          >
            <BiChevronRight className="size-4" />
          </Button>
          <h2 className="text-surface-800 text-base font-semibold">
            سال {toPersianDigits(String(year))}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            aria-label="سال بعد"
            disabled={year >= currentShamsiYear()}
            onClick={() => setYear((y) => y + 1)}
          >
            <BiChevronLeft className="size-4" />
          </Button>
        </div>
        <p className="text-surface-500 text-xs">
          ماه‌های بدون هیچ ثبتی راه‌راه نمایش داده می‌شوند؛ ماه بسته ارقام خواندنیِ ذخیره‌شده دارد.
        </p>
      </div>

      <div className="tablet:grid-cols-4 grid grid-cols-2 gap-3">
        {summary.map((item) => (
          <Card key={item.label} variant="outlined" padding="sm">
            <p className="text-surface-500 mb-1 text-xs font-medium">{item.label}</p>
            {item.value}
          </Card>
        ))}
      </div>

      <Table
        columns={columns}
        data={rows}
        loading={isLoading}
        rowKey={(row) => row.month}
        rowClassName={(row) => (isEmptyMonth(row.report) ? "monthly-close-empty" : undefined)}
        emptyMessage={isError ? "خطا در دریافت گزارش ماه‌ها" : "داده‌ای برای این سال موجود نیست"}
      />

      {isError && (
        <div className="flex items-center justify-between">
          <p className="text-danger-600 text-sm">دریافت برخی ماه‌ها ناموفق بود.</p>
          <Button variant="outline" size="sm" onClick={() => refetchAll()}>
            تلاش دوباره
          </Button>
        </div>
      )}
    </div>
  );
}
