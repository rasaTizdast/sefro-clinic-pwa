import { useState } from "react";
import { BiPlus, BiRefresh } from "react-icons/bi";

import { SearchButton } from "../components/SearchButton";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardTitle } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { Skeleton } from "../components/ui/Skeleton";
import type { Column } from "../components/ui/Table";
import { Table } from "../components/ui/Table";
import { useCreateExchangeRate, useCurrentRate, useExchangeRates } from "../hooks/api";
import { usePermissions } from "../hooks/usePermissions";
import { formatJalaliDateTime, formatJalaliDateTimeParts } from "../lib/date";
import { toPersianDigits } from "../lib/digits";
import { formatPrice } from "../lib/format";
import type { ExchangeRate } from "../types/finance";

export default function ExchangeRatePage() {
  const { canManageFinance } = usePermissions();
  const {
    data: currentRate,
    isLoading: rateLoading,
    isFetching: rateFetching,
    refetch: refetchRate,
  } = useCurrentRate();
  const { data: ratesData, isLoading: ratesLoading } = useExchangeRates({ page: 1 });
  const createRate = useCreateExchangeRate();

  const [modalOpen, setModalOpen] = useState(false);
  const [rateInput, setRateInput] = useState("");
  const [sourceInput, setSourceInput] = useState("");

  const rates = ratesData?.data ?? [];

  async function handleCreate() {
    if (!rateInput) return;
    try {
      await createRate.mutateAsync({
        rate: rateInput,
        source: sourceInput || undefined,
        effective_at: new Date().toISOString(),
      });
      setModalOpen(false);
      setRateInput("");
      setSourceInput("");
    } catch {
      // The mutation already toasts the extracted API error; keep the modal open.
    }
  }

  const columns: Column<ExchangeRate>[] = [
    {
      key: "rate",
      header: "نرخ",
      render: (r) => <span className="font-medium">{formatPrice(Number(r.rate))} تومان</span>,
    },
    { key: "pair", header: "جفت ارز", render: (r) => `${r.currencyFrom} → ${r.currencyTo}` },
    {
      key: "status",
      header: "وضعیت",
      align: "center",
      render: (r) => (
        <Badge variant={r.isActive ? "success" : "info"} size="sm">
          {r.isActive ? "فعال" : "غیرفعال"}
        </Badge>
      ),
    },
    { key: "source", header: "منبع", render: (r) => r.source || "—" },
    {
      key: "effectiveDate",
      header: "تاریخ اعمال",
      align: "center",
      render: (r) => formatJalaliDateTimeParts(r.effectiveAt).date,
    },
    {
      key: "effectiveTime",
      header: "زمان اعمال",
      align: "center",
      render: (r) => formatJalaliDateTimeParts(r.effectiveAt).time,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-surface-900 text-2xl font-bold">نرخ ارز</h1>
          <p className="text-surface-500 mt-1 text-sm">نرخ رسمی دلار و تاریخچه ثبت نرخ‌ها</p>
        </div>
        <SearchButton />
      </div>

      {/* Current rate */}
      <Card variant="outlined" padding="lg">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle>نرخ ارز فعلی</CardTitle>
            {rateLoading ? (
              <Skeleton width="12rem" height="2.5rem" className="mt-3" />
            ) : (
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-surface-900 text-4xl font-bold tabular-nums">
                  {currentRate ? formatPrice(Number(currentRate.rateTomanPerUsd)) : "—"}
                </span>
                <span className="text-surface-500 text-sm">تومان / دلار</span>
              </div>
            )}
            <div className="text-surface-500 mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              {currentRate?.source && <span>منبع: {currentRate.source}</span>}
              {currentRate?.effectiveAt && (
                <span>آخرین به‌روزرسانی: {formatJalaliDateTime(currentRate.effectiveAt)}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              startIcon={<BiRefresh className="size-4" />}
              onClick={() => refetchRate()}
              loading={rateFetching}
            >
              به‌روزرسانی
            </Button>
            {canManageFinance && (
              <Button
                variant="primary"
                startIcon={<BiPlus className="size-4" />}
                onClick={() => setModalOpen(true)}
              >
                ثبت نرخ جدید
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Fetch log */}
      <Card variant="outlined" padding="none">
        <div className="border-surface-200 flex items-center justify-between border-b px-5 py-3">
          <h3 className="text-surface-900 text-sm font-semibold">تاریخچه ثبت نرخ‌ها</h3>
          {!ratesLoading && rates.length > 0 && (
            <span className="text-surface-500 text-xs">
              {toPersianDigits(String(rates.length))} رکورد
            </span>
          )}
        </div>
        <Table
          columns={columns}
          data={rates}
          rowKey={(r) => r.id}
          loading={ratesLoading}
          emptyMessage="هنوز نرخی ثبت نشده است"
        />
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="ثبت نرخ ارز جدید"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              انصراف
            </Button>
            <Button
              variant="primary"
              onClick={handleCreate}
              disabled={!rateInput || createRate.isPending}
              loading={createRate.isPending}
            >
              ذخیره
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            label="نرخ (تومان به دلار)"
            type="text"
            inputMode="numeric"
            value={rateInput}
            onChange={(e) => setRateInput(e.target.value)}
            placeholder="مثال: 100000"
          />
          <Input
            label="منبع (اختیاری)"
            value={sourceInput}
            onChange={(e) => setSourceInput(e.target.value)}
            placeholder="Manual"
          />
        </div>
      </Modal>
    </div>
  );
}
