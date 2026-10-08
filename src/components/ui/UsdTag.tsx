import { formatUsd } from "../../lib/currency";

interface UsdTagProps {
  /** Toman amount to convert at the live rate. */
  toman: number;
  /** Live Toman-per-USD rate — renders nothing without one. */
  rate: number | null | undefined;
  /**
   * block (default): dollar amount on its own line under the Toman price.
   * inline: parenthesized, appended right after the Toman text.
   */
  variant?: "block" | "inline";
}

/**
 * Dollar equivalent of a Toman price at the live rate — the second line under
 * every Toman amount. Renders nothing when the rate is unknown so exact-text
 * assertions and layouts degrade to the Toman-only view.
 */
export function UsdTag({ toman, rate, variant = "block" }: UsdTagProps) {
  if (!rate || rate <= 0 || !Number.isFinite(toman) || toman <= 0) return null;
  const text = formatUsd(toman / rate);
  if (variant === "inline") {
    return (
      <span dir="ltr" className="text-surface-400 inline-block text-xs whitespace-nowrap">
        {" "}
        ({text})
      </span>
    );
  }
  return (
    <span dir="ltr" className="text-surface-400 block text-[10px] leading-none whitespace-nowrap">
      {text}
    </span>
  );
}
