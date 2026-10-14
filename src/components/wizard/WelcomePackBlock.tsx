import { useMemo } from "react";
import { BiSolidCheckCircle } from "react-icons/bi";
import { PiGiftBold } from "react-icons/pi";

import { useAllWelcomePacks, useWelcomePack } from "../../hooks/api";
import { toPersianDigits } from "../../lib/digits";
import type { WelcomePackSelection } from "../../types/wizard";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { Select } from "../ui/Select";

export type WelcomePackMode = "with" | "without";

interface WelcomePackBlockProps {
  mode: WelcomePackMode;
  onModeChange: (mode: WelcomePackMode) => void;
  welcomePack: WelcomePackSelection | null;
  onChange: (pack: WelcomePackSelection | null) => void;
  /** Shows the "یک ولکام‌پک انتخاب کنید" error when the parent attempted submit. */
  invalid?: boolean;
}

/**
 * Welcome-pack chooser: explicit with/without choice (same rules as the /wizard
 * payment step). When "with" is chosen a pack must be picked before the parent
 * submits; when "without" the selection is cleared.
 *
 * The pack price is deliberately NOT displayed here — the receptionist only
 * picks which pack the customer takes; the amount is resolved server-side at
 * issue time and billed as its own separate transaction.
 */
export function WelcomePackBlock({
  mode,
  onModeChange,
  welcomePack,
  onChange,
  invalid = false,
}: WelcomePackBlockProps) {
  const {
    data: packsData,
    isPending: packsLoading,
    isError: packsError,
    isFetching: packsFetching,
    refetch: refetchPacks,
  } = useAllWelcomePacks({ isActive: true });
  const { data: selectedPackDetail } = useWelcomePack(welcomePack?.packId ?? 0);

  const packItems = useMemo(
    () => (selectedPackDetail?.items ?? []).filter((i) => Number(i.quantity) > 0),
    [selectedPackDetail]
  );

  const selectMode = (next: WelcomePackMode) => {
    if (next === "without") onChange(null);
    onModeChange(next);
  };

  const modeButton = (value: WelcomePackMode, label: string, active: boolean) => (
    <button
      type="button"
      onClick={() => selectMode(value)}
      aria-pressed={active}
      className={`focus-visible:ring-primary-500/40 flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm transition-all outline-none focus-visible:ring-2 ${
        active
          ? "border-primary-500 bg-primary-50 text-primary-700 font-semibold shadow-sm"
          : "border-surface-200 text-surface-600 hover:border-surface-300 hover:bg-surface-50"
      }`}
    >
      {active && <BiSolidCheckCircle className="size-4 shrink-0" />}
      {label}
    </button>
  );

  const showSelectError = invalid && mode === "with" && !welcomePack;

  return (
    <div className="border-surface-200 space-y-3 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-surface-700 flex items-center gap-1.5 text-sm font-medium">
          <PiGiftBold className="text-info-600 size-4" />
          ولکام‌پک
        </h3>
        <span className="text-surface-400 text-[11px]">مجزا از فاکتور اصلی</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {modeButton("without", "بدون ولکام‌پک", mode === "without")}
        {modeButton("with", "همراه با ولکام‌پک", mode === "with")}
      </div>

      {mode === "with" && (
        <>
          {packsError ? (
            <Alert variant="error" title="ولکام‌پک‌ها بارگذاری نشدند">
              <div className="flex items-center justify-between gap-3">
                <span>ارتباط با سرور برقرار نشد؛ لطفاً دوباره تلاش کنید.</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={packsFetching}
                  onClick={() => void refetchPacks()}
                >
                  {packsFetching ? "در حال تلاش..." : "تلاش مجدد"}
                </Button>
              </div>
            </Alert>
          ) : packsLoading ? (
            <div className="space-y-1.5">
              <span className="text-surface-500 block text-xs font-medium">انتخاب ولکام‌پک</span>
              <div
                role="status"
                aria-label="در حال بارگذاری ولکام‌پک‌ها"
                className="border-surface-200 bg-surface-100 h-10 animate-pulse rounded-lg border"
              />
            </div>
          ) : (packsData ?? []).length === 0 ? (
            <Alert variant="info">ولکام‌پک فعالی ثبت نشده است.</Alert>
          ) : (
            <Select
              label="انتخاب ولکام‌پک"
              options={[
                { value: "", label: "یک ولکام‌پک انتخاب کنید" },
                ...(packsData ?? []).map((p) => ({
                  value: String(p.id),
                  label: p.name,
                })),
              ]}
              value={welcomePack ? String(welcomePack.packId) : ""}
              error={showSelectError ? "یک ولکام‌پک انتخاب کنید" : undefined}
              onChange={(e) => {
                const id = e.target.value ? Number(e.target.value) : null;
                const pack = (packsData ?? []).find((p) => p.id === id) ?? null;
                onChange(
                  pack
                    ? {
                        packId: pack.id,
                        packName: pack.name,
                        totalCostToman: pack.totalCostToman,
                        totalCostUsd: pack.totalCostUsd,
                      }
                    : null
                );
              }}
            />
          )}

          {welcomePack && (
            <div className="border-info-200 bg-info-50/40 overflow-hidden rounded-lg border">
              <div className="border-info-200/70 bg-info-50 flex items-center justify-between gap-2 border-b px-3 py-2">
                <span className="text-info-800 truncate text-xs font-semibold">
                  ولکام‌پک انتخاب‌شده
                </span>
                <span className="text-info-700 shrink-0 text-[11px]">فاکتور جداگانه</span>
              </div>

              <div className="space-y-1.5 px-3 py-2.5">
                <span className="text-surface-700 block text-sm font-medium">
                  {welcomePack.packName}
                </span>

                {packItems.length > 0 && (
                  <ul className="border-info-200/70 mt-2 space-y-1 border-t pt-2">
                    {packItems.map((item) => (
                      <li
                        key={item.id}
                        className="text-surface-600 flex items-center justify-between gap-2 text-xs"
                      >
                        <span className="truncate">{item.productName}</span>
                        <span className="text-surface-400 shrink-0">
                          × {toPersianDigits(item.quantity)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <p className="bg-info-100/60 text-info-800 px-3 py-2 text-[11px] leading-relaxed">
                هزینه این ولکام‌پک در جمع کل فاکتور اصلی لحاظ نشده و هنگام صدور جداگانه ثبت می‌شود.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
