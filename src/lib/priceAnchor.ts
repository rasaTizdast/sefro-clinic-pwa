import { ceilUp, parseTomanAmount } from "./format";

/**
 * Marker stored in Product.description that pins a product's selling price to a
 * USD value: `usd:11.5|orig:1150000` means "this product is worth $11.50" with
 * original toman price 1,150,000. Its Toman price floats as anchor × current rate.
 * (Backend has no anchor column — description is the only field the frontend can
 * persist without touching backend code).
 */
const ANCHOR_RE = /usd:(\d+(?:\.\d+)?)(?:\|orig:(\d+))?/;

/** Read the USD anchor from a description. Null when absent or invalid. */
export function parseAnchor(description: string | null | undefined): number | null {
  if (!description) return null;
  const match = ANCHOR_RE.exec(description);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** Read the original toman price from a description. Null when absent. */
export function parseOriginalToman(description: string | null | undefined): number | null {
  if (!description) return null;
  const match = ANCHOR_RE.exec(description);
  if (!match || !match[2]) return null;
  const value = Number(match[2]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function formatAnchor(anchor: number, originalToman?: number): string {
  // 6 decimal places keeps rounding drift under 0.05 Toman at any realistic rate.
  const base = `usd:${Number(anchor.toFixed(6))}`;
  if (originalToman != null && originalToman > 0) {
    return `${base}|orig:${originalToman}`;
  }
  return base;
}

/**
 * 6dp anchor whose floating price equals `toman` exactly: ceilUp(anchor × rate)
 * === toman. Plain toFixed(6) rounds *up* past toman/rate about half the time
 * (ceilUp then yields toman+1) — the price-sync PATCH would silently bump a
 * freshly saved price by 1 Toman. Step toward the nearest anchor that round-trips.
 */
function findAnchor(toman: number, rate: number): number {
  const live = (a: number) => ceilUp(a * rate);
  let anchor = Number((toman / rate).toFixed(6));
  for (let i = 0; i < 25; i += 1) {
    const value = live(anchor);
    if (value === toman) return anchor;
    anchor = Math.round((anchor + (value > toman ? -1e-6 : 1e-6)) * 1e6) / 1e6;
  }
  return Number((toman / rate).toFixed(6));
}

/** Insert or refresh the USD anchor marker, preserving any human description text. */
export function withAnchor(
  description: string | null | undefined,
  toman: number,
  rate: number | null | undefined,
  originalToman?: number
): string {
  const base = (description ?? "").trim();
  if (rate == null || rate <= 0 || toman <= 0) return base;
  // Baseline = the live value at the moment of entry, computed from the exact
  // 6dp anchor that gets stored — so a freshly entered price is never drifted
  // (no phantom ▲/▼); arrows then only reflect the NEXT rate moves.
  const anchor = findAnchor(toman, rate);
  const existingOrig = parseOriginalToman(base);
  const orig = originalToman ?? existingOrig ?? ceilUp(anchor * rate);
  const marker = formatAnchor(anchor, orig);
  if (ANCHOR_RE.test(base)) return base.replace(ANCHOR_RE, marker);
  return base ? `${base}\n${marker}` : marker;
}

/** Floating Toman price for an anchor at the current rate (integer, always rounded UP). */
export function anchoredToman(anchor: number, rate: number): number {
  return ceilUp(anchor * rate);
}

export interface PricePatch {
  id: number;
  unitPrice: number;
  description: string;
}

/**
 * Products that need a sync PATCH at `rate`:
 * - stored unit_price drifted from anchor × rate → recompute from the anchor;
 * - no anchor yet → write one derived from the stored price (pins today's price
 *   to today's rate; the toman value itself does not change).
 */
export function pricePatches(
  items: { id: number; unitPrice: string | number; description?: string | null }[],
  rate: number
): PricePatch[] {
  if (!Number.isFinite(rate) || rate <= 0) return [];
  const patches: PricePatch[] = [];
  for (const item of items) {
    const stored = parseTomanAmount(item.unitPrice);
    if (stored <= 0) continue;
    const anchor = parseAnchor(item.description);
    if (anchor == null) {
      // First time anchoring - store the entered toman rounded up to 100k as original
      patches.push({
        id: item.id,
        unitPrice: stored,
        description: withAnchor(item.description, stored, rate),
      });
      continue;
    }
    const target = anchoredToman(anchor, rate);
    if (target !== stored) {
      patches.push({ id: item.id, unitPrice: target, description: item.description ?? "" });
    }
  }
  return patches;
}
