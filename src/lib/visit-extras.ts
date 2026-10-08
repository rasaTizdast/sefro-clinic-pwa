import type { ConsumableSelection, WelcomePackSelection } from "../types/wizard";

/**
 * Booking-time extras the `/visits/reserve/` endpoint cannot accept (it only
 * takes customer/services/date/time/notes). They are stored client-side keyed
 * by visit id and replayed at checkout, where `/record-consumption/` and
 * `/finance/welcome-packs/:id/issue/` actually accept them.
 */
export interface VisitExtras {
  extraProducts: ConsumableSelection[];
  welcomePack: WelcomePackSelection | null;
  savedAt: number;
}

const STORAGE_KEY = "calendar_visit_extras";
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;

function readAll(): Record<string, VisitExtras> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, VisitExtras>;
    if (!parsed || typeof parsed !== "object") return {};
    const cutoff = Date.now() - MAX_AGE_MS;
    const kept: Record<string, VisitExtras> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (value && typeof value.savedAt === "number" && value.savedAt > cutoff) {
        kept[key] = value;
      }
    }
    return kept;
  } catch {
    return {};
  }
}

function writeAll(all: Record<string, VisitExtras>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (err) {
    console.error("[visit-extras] save failed:", err);
  }
}

/** True when the extras carry anything worth replaying at checkout. */
export function hasExtras(extras: VisitExtras | null | undefined): boolean {
  if (!extras) return false;
  return (extras.extraProducts?.length ?? 0) > 0 || extras.welcomePack != null;
}

export function saveVisitExtras(visitId: number, extras: VisitExtras): void {
  if (!hasExtras(extras)) return;
  const all = readAll();
  all[String(visitId)] = extras;
  writeAll(all);
}

export function loadVisitExtras(visitId: number): VisitExtras | null {
  const found = readAll()[String(visitId)] ?? null;
  return hasExtras(found) ? found : null;
}

export function clearVisitExtras(visitId: number): void {
  const all = readAll();
  if (!(String(visitId) in all)) return;
  delete all[String(visitId)];
  writeAll(all);
}
