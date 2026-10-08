import { formatUsd } from "../../lib/currency";
import { formatPrice } from "../../lib/format";
import { anchoredToman, parseAnchor, parseOriginalToman } from "../../lib/priceAnchor";

interface PriceCellProps {
  /** Amount in Toman — rendered as the primary line with Persian digits. */
  toman?: number | string | null;
  /**
   * Amount in USD. When provided it is the authoritative dollar figure (and can
   * drive the live drift line); when omitted the dollar line is derived from
   * `toman ÷ rate` so floating selling prices always show their USD value.
   */
  usd?: number | string | null;
  /**
   * Current Toman-per-USD rate. Combined with an explicit `usd`, shows the live
   * toman figure (usd × rate) with a ▲ / ▼ drift indicator; used on its own to
   * derive the dollar line from the Toman price.
   */
  rate?: number | null;
  /** Product description containing the USD anchor marker (usd:X|orig:Y). */
  description?: string | null;
}

function toFiniteNumber(value: number | string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Two-line price display:
 * 1. Current Toman price with a drift marker when it has moved:
 *    - green ▲ = price went up with the dollar
 *    - red ▼ = price went down with the dollar
 *    - no marker = price unchanged (original price kept as a hover tooltip)
 * 2. Small muted USD anchor.
 * The marker bounces briefly when it appears, then settles.
 */
export function PriceCell({ toman, usd, rate, description }: PriceCellProps) {
  const explicitUsd = toFiniteNumber(usd);
  const tomanValue = toFiniteNumber(toman);
  const hasRate = rate != null && rate > 0;
  const descAnchor = description ? parseAnchor(description) : null;
  const descOriginal = description ? parseOriginalToman(description) : null;

  // Float sources: a description anchor (warehouse products) or an explicit USD
  // figure shown alongside its original Toman price (services: price_usd × live rate).
  // A bare USD figure with no original price (purchase rows) does not float.
  const anchor =
    descAnchor ??
    (hasRate && explicitUsd != null && explicitUsd > 0 && tomanValue != null ? explicitUsd : null);
  const originalToman = descAnchor != null ? descOriginal : anchor != null ? tomanValue : null;

  // Derive USD from toman/rate when no explicit USD and no anchor
  const derivedUsd =
    explicitUsd ??
    (anchor != null
      ? anchor
      : tomanValue != null && rate != null && rate > 0
        ? tomanValue / rate
        : null);

  // Current live toman price from anchor × rate (always rounded UP)
  const liveToman = anchor != null && hasRate ? anchoredToman(anchor, rate as number) : null;

  // Trend: compare live toman with original toman
  const trend =
    liveToman != null && originalToman != null && liveToman !== originalToman
      ? liveToman > originalToman
        ? ("up" as const)
        : ("down" as const)
      : null;

  const primaryToman = liveToman ?? tomanValue;
  const usdLine = anchor ?? explicitUsd ?? derivedUsd;

  // Bounce for ~1s whenever the arrow (re)mounts — a CSS animation with a finite
  // iteration count (see @keyframes price-bounce), so no effect/state/timer is
  // involved and StrictMode's double-invoked effects cannot break it.
  const tone =
    trend === "up" ? "text-success-600" : trend === "down" ? "text-danger-600" : "text-surface-900";

  if (primaryToman == null && usdLine == null) {
    return <span className="text-surface-400">—</span>;
  }

  // Original price lives in a tooltip so the cell stays to two lines
  const tooltip =
    trend != null && originalToman != null
      ? `قیمت ثبت‌شده: ${formatPrice(originalToman)} تومان`
      : undefined;

  return (
    <span className="flex min-w-[100px] flex-col gap-0.5 leading-tight" title={tooltip}>
      {/* Line 1: current Toman price (live, with persistent drift arrow) */}
      {primaryToman != null && (
        <span
          className={`inline-flex items-center gap-1 text-sm font-medium whitespace-nowrap transition-all duration-500 ${tone}`}
        >
          {formatPrice(primaryToman)}
          <span className="text-surface-400 text-xs font-normal">تومان</span>
          {trend === "up" && (
            <span
              className="text-success-600 inline-block leading-none"
              style={{ animation: "price-bounce 0.35s ease-in-out 3" }}
              title="قیمت بالا رفته"
              aria-label="قیمت بالا رفته"
            >
              ▲
            </span>
          )}
          {trend === "down" && (
            <span
              className="text-danger-600 inline-block leading-none"
              style={{ animation: "price-bounce 0.35s ease-in-out 3" }}
              title="قیمت پایین آمده"
              aria-label="قیمت پایین آمده"
            >
              ▼
            </span>
          )}
        </span>
      )}

      {/* Line 2: USD anchor (fixed dollar price) */}
      {usdLine != null && (
        <span dir="ltr" className="text-surface-400 inline-block text-xs whitespace-nowrap">
          {formatUsd(usdLine)}
        </span>
      )}
    </span>
  );
}
