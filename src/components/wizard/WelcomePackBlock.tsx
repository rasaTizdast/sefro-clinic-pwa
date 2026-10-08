import { useMemo, useState } from "react";
import { BiSolidCheckCircle } from "react-icons/bi";
import { PiGiftBold } from "react-icons/pi";

import { useAllWelcomePacks, useWelcomePack } from "../../hooks/api";
import { useRateValue } from "../../hooks/useRateValue";
import { formatUsd } from "../../lib/currency";
import { toPersianDigits } from "../../lib/digits";
import { formatPrice, parseTomanAmount } from "../../lib/format";
import { parseUsdInput } from "../../lib/payment-split";
import type { WelcomePackSelection } from "../../types/wizard";
import { Select } from "../ui/Select";
import { UsdTag } from "../ui/UsdTag";

type Mode = "with";

/**
 * Welcome-pack chooser with an invoice-style breakdown.
 *
 * Design goal: the pack price must never look like part of the main bill.
 * The block therefore renders its own bordered "factor" with a total row
 * explicitly labelled as charged separately
 */
export function WelcomePackBlock({
  welcomePack,
  onChange,
  billTotalToman,
}: {
  welcomePack: WelcomePackSelection | null;
  onChange: (pack: WelcomePackSelection | null) => void;
  /** The main bill total — shown only to make the separation explicit. */
  billTotalToman?: number;
}) {
  const rate = useRateValue();
  const [mode, setMode] = useState<Mode>("with");

  const { data: packsData } = useAllWelcomePacks({ isActive: true });
  const { data: selectedPackDetail } = useWelcomePack(welcomePack?.packId ?? 0);

  // A pack priced only in USD still has a price — derive the displayed Toman
  // amount from the live rate instead of showing ۰ تومان beside a real dollar
  // figure. The server re-derives the final amount when the pack is issued.
  const tomanOf = (toman: string | null | undefined, usd: string | null | undefined): number => {
    const direct = parseTomanAmount(toman ?? "0");
    if (direct > 0) return direct;
    const usdNum = parseUsdInput(usd ?? "0");
    return usdNum > 0 && rate !== null ? Math.round(usdNum * rate) : 0;
  };

  const packToman = welcomePack ? tomanOf(welcomePack.totalCostToman, welcomePack.totalCostUsd) : 0;

  const packItems = useMemo(
    () => (selectedPackDetail?.items ?? []).filter((i) => Number(i.quantity) > 0),
    [selectedPackDetail]
  );

  const selectMode = (next: Mode) => {
    setMode(next);
  };

  const modeButton = (value: Mode, label: string, active: boolean) => (
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
        {modeButton("with", "همراه با ولکام‌پک", mode === "with")}
      </div>

      <>
        <Select
          label="انتخاب ولکام‌پک"
          options={[
            { value: "", label: "یک ولکام‌پک انتخاب کنید" },
            ...(packsData ?? []).map((p) => ({
              value: String(p.id),
              label: `${p.name} — ${formatPrice(tomanOf(p.totalCostToman, p.totalCostUsd))} تومان`,
            })),
          ]}
          value={welcomePack ? String(welcomePack.packId) : ""}
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

        {welcomePack && (
          <div className="border-info-200 bg-info-50/40 overflow-hidden rounded-lg border">
            <div className="border-info-200/70 bg-info-50 flex items-center justify-between gap-2 border-b px-3 py-2">
              <span className="text-info-800 truncate text-xs font-semibold">
                صورتحساب ولکام‌پک
              </span>
              <span className="text-info-700 shrink-0 text-[11px]">فاکتور جداگانه</span>
            </div>

            <div className="space-y-1.5 px-3 py-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-surface-700 truncate text-sm font-medium">
                  {welcomePack.packName}
                </span>
                <span className="text-surface-900 shrink-0 text-sm font-semibold">
                  {formatPrice(packToman)} تومان
                </span>
              </div>
              <div className="flex justify-end">
                <span dir="ltr" className="text-info-700 text-xs font-medium">
                  {formatUsd(welcomePack.totalCostUsd ?? "0")}
                </span>
              </div>

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

              <div className="border-info-200/70 mt-1 flex items-center justify-between gap-2 border-t pt-2">
                <span className="text-surface-700 text-xs font-semibold">
                  جمع ولکام‌پک (پرداختی جدا)
                </span>
                <span className="flex flex-col items-end">
                  <span className="text-info-700 text-sm font-bold">
                    {formatPrice(packToman)} تومان
                  </span>
                  <UsdTag toman={packToman} rate={rate} />
                </span>
              </div>
            </div>

            <p className="bg-info-100/60 text-info-800 px-3 py-2 text-[11px] leading-relaxed">
              این مبلغ در جمع کل فاکتور اصلی
              {typeof billTotalToman === "number" && billTotalToman > 0 ? (
                <> ({formatPrice(billTotalToman)} تومان)</>
              ) : null}
              لحاظ نشده و جداگانه ثبت می‌شود.
            </p>
          </div>
        )}
      </>
    </div>
  );
}
