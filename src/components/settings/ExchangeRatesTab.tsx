import { useState } from "react";
import { BiPlus } from "react-icons/bi";

import { useCreateExchangeRate, useCurrentRate, useExchangeRates } from "../../hooks/api";
import { formatPrice } from "../../lib/format";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card, CardTitle } from "../ui/Card";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { Skeleton } from "../ui/Skeleton";

export function ExchangeRatesTab() {
  const { data: currentRate, isLoading: rateLoading } = useCurrentRate();
  const { data: ratesData, isLoading: ratesLoading } = useExchangeRates({ page: 1 });
  const createRate = useCreateExchangeRate();

  const [modalOpen, setModalOpen] = useState(false);
  const [rateInput, setRateInput] = useState("");
  const [sourceInput, setSourceInput] = useState("");

  const rates = ratesData?.data ?? [];

  async function handleCreate() {
    if (!rateInput) return;
    await createRate.mutateAsync({
      rate: rateInput,
      source: sourceInput || undefined,
    });
    setModalOpen(false);
    setRateInput("");
    setSourceInput("");
  }

  if (rateLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton width="100%" height="6rem" variant="rectangular" />
        <Skeleton width="100%" height="12rem" variant="rectangular" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card variant="outlined" padding="lg">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>نرخ ارز فعلی</CardTitle>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-surface-900 text-3xl font-bold">
                {currentRate ? formatPrice(Number(currentRate.rateTomanPerUsd)) : "—"}
              </span>
              <span className="text-surface-500 text-sm">تومان / دلار</span>
            </div>
            {currentRate?.source && (
              <p className="text-surface-500 mt-1 text-xs">منبع: {currentRate.source}</p>
            )}
          </div>
          <Button
            variant="primary"
            startIcon={<BiPlus className="size-4" />}
            onClick={() => setModalOpen(true)}
          >
            ثبت نرخ جدید
          </Button>
        </div>
      </Card>

      {!ratesLoading && rates.length > 0 && (
        <Card variant="outlined" padding="none">
          <div className="border-surface-200 border-b px-5 py-3">
            <h3 className="text-surface-900 text-sm font-semibold">تاریخچه نرخ ارز</h3>
          </div>
          <div className="divide-surface-100 divide-y">
            {rates.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-surface-900 text-sm font-medium">
                    {formatPrice(Number(r.rate))} تومان
                  </span>
                  <span className="text-surface-500 text-xs">
                    {r.currencyFrom} → {r.currencyTo}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <Badge variant={r.isActive ? "success" : "info"} size="sm">
                    {r.isActive ? "فعال" : "غیرفعال"}
                  </Badge>
                  <span className="text-surface-400 text-xs">{r.source}</span>
                </div>
                <div className="flex flex-col items-end gap-0.5 text-xs">
                  <span className="text-surface-500">
                    {r.effectiveAt ? new Date(r.effectiveAt).toLocaleDateString("fa-IR") : "—"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {ratesLoading && (
        <div className="flex flex-col gap-2">
          <Skeleton width="100%" height="3rem" variant="rectangular" />
          <Skeleton width="100%" height="3rem" variant="rectangular" />
        </div>
      )}

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
