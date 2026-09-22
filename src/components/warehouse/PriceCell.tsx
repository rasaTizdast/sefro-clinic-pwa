import { formatPrice } from "../../lib/format";

interface PriceCellProps {
  /** Amount in Toman — rendered as the primary line with Persian digits. */
  toman?: number | string | null;
  /** Amount in USD — rendered as the secondary line. */
  usd?: number | string | null;
}

function toFiniteNumber(value: number | string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Stacked dual-currency price: Toman (primary) over USD (secondary). */
export function PriceCell({ toman, usd }: PriceCellProps) {
  const tomanValue = toFiniteNumber(toman);
  const usdValue = toFiniteNumber(usd);

  if (tomanValue == null && usdValue == null) {
    return <span className="text-surface-400">—</span>;
  }

  return (
    <span className="flex flex-col gap-0.5 leading-tight">
      {tomanValue != null && (
        <span className="text-surface-900 text-sm font-medium whitespace-nowrap">
          {formatPrice(tomanValue)}
          <span className="text-surface-500 ms-1 text-xs font-normal">تومان</span>
        </span>
      )}
      {usdValue != null && (
        <span dir="ltr" className="text-surface-400 inline-block text-xs whitespace-nowrap">
          $
          {usdValue.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      )}
    </span>
  );
}
