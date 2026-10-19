import jalaali from "jalaali-js";

export type ChartPeriod = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";

export interface ChartEntry {
  period: string;
  total: number;
}

function toLatinDigits(str: string): string {
  return str.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
}

function parseShamsiDate(dateStr: string): { jy: number; jm: number; jd: number } {
  const parts = toLatinDigits(dateStr).split(/[/-]/).map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
    throw new Error(`Invalid Shamsi date: ${dateStr}`);
  }
  return { jy: parts[0], jm: parts[1], jd: parts[2] };
}

/** Days elapsed since the Persian week's Saturday (Saturday = 0 … Friday = 6). */
function daysSinceSaturday(jy: number, jm: number, jd: number): number {
  const { gy, gm, gd } = jalaali.toGregorian(jy, jm, jd);
  return (new Date(gy, gm - 1, gd).getDay() + 1) % 7;
}

export function shamsiPeriodKey(jy: number, jm: number, jd: number, period: ChartPeriod): string {
  switch (period) {
    case "daily":
      return `${jy}-${String(jm).padStart(2, "0")}-${String(jd).padStart(2, "0")}`;
    case "weekly": {
      // Saturday-start weeks whose W01 is the week containing 1 Farvardin —
      // exactly what `Sefro_Clinic.periods.shamsi_period_key` emits, so chart
      // gap-fill keys line up with the keys the API returns.
      const yearStart = jalaali.j2d(jy, 1, 1) - daysSinceSaturday(jy, 1, 1);
      const weekStart = jalaali.j2d(jy, jm, jd) - daysSinceSaturday(jy, jm, jd);
      const wn = Math.floor((weekStart - yearStart) / 7) + 1;
      return `${jy}-W${String(wn).padStart(2, "0")}`;
    }
    case "monthly":
      return `${jy}-${String(jm).padStart(2, "0")}`;
    case "quarterly": {
      const q = Math.floor((jm - 1) / 3) + 1;
      return `${jy}-Q${q}`;
    }
    case "yearly":
      return `${jy}`;
  }
}

export function fillChartGaps(
  entries: ChartEntry[],
  period: ChartPeriod,
  dateFrom: string,
  dateTo: string
): ChartEntry[] {
  const byKey = new Map(entries.map((e) => [e.period, e.total]));
  const from = parseShamsiDate(dateFrom);
  const to = parseShamsiDate(dateTo);
  const start = jalaali.j2d(from.jy, from.jm, from.jd);
  const end = jalaali.j2d(to.jy, to.jm, to.jd);

  const result: ChartEntry[] = [];
  let lastKey = "";
  for (let d = start; d <= end; d += 1) {
    const { jy, jm, jd } = jalaali.d2j(d);
    const key = shamsiPeriodKey(jy, jm, jd, period);
    if (key === lastKey) continue;
    lastKey = key;
    result.push({ period: key, total: byKey.get(key) ?? 0 });
  }
  return result;
}
