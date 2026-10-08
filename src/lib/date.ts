import jalaali from "jalaali-js";

import { toPersianDigits } from "./digits";

function isAlreadyJalali(dateStr: string): boolean {
  if (/[TZ]/.test(dateStr) || /[+-]\d{2}:\d{2}$/.test(dateStr)) return false;
  const yearMatch = dateStr.match(/^(\d{4})/);
  return !!yearMatch && parseInt(yearMatch[1]) >= 1300 && parseInt(yearMatch[1]) <= 1500;
}

function formatJalaliParts(jy: number, jm: number, jd: number): string {
  return `${jy}/${String(jm).padStart(2, "0")}/${String(jd).padStart(2, "0")}`;
}

export function formatJalaliDate(isoString: string): string {
  if (!isoString) return "—";
  if (isAlreadyJalali(isoString)) {
    return isoString.slice(0, 10).replace(/-/g, "/");
  }
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "—";
  const { jy, jm, jd } = jalaali.toJalaali(date);
  return formatJalaliParts(jy, jm, jd);
}

/**
 * Persian (Jalali) date + 24h time, fully in Persian digits:
 * "2026-09-28T14:25:18+03:30" → "۱۴۰۵/۰۷/۰۶ ۱۴:۲۵" (local timezone).
 * Already-Jalali inputs keep their date part (any time part is dropped).
 */
export function formatJalaliDateTime(isoString: string): string {
  if (!isoString) return "—";
  if (isAlreadyJalali(isoString)) {
    return toPersianDigits(isoString.split(/[ T]/)[0].replace(/-/g, "/"));
  }
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "—";
  const { jy, jm, jd } = jalaali.toJalaali(date);
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return toPersianDigits(`${formatJalaliParts(jy, jm, jd)} ${hh}:${mm}`);
}

/**
 * Persian (Jalali) date and 24h time as separate strings.
 * Handles both Gregorian ISO ("2026-09-28T18:03:08+03:30") and
 * Shamsi ("1405-07-06 17:02") inputs.
 */
export function formatJalaliDateTimeParts(isoString: string): { date: string; time: string } {
  if (!isoString) return { date: "—", time: "—" };
  if (isAlreadyJalali(isoString)) {
    const [d, t] = isoString.split(" ");
    return {
      date: toPersianDigits(d.replace(/-/g, "/")),
      time: t ? toPersianDigits(t) : "—",
    };
  }
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return { date: "—", time: "—" };
  const { jy, jm, jd } = jalaali.toJalaali(date);
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return {
    date: toPersianDigits(`${formatJalaliParts(jy, jm, jd)}`),
    time: toPersianDigits(`${hh}:${mm}`),
  };
}

export function formatJalaliDateShort(isoString: string): string {
  if (!isoString) return "—";
  if (isAlreadyJalali(isoString)) {
    const parts = isoString.slice(0, 10).split(/[/-]/);
    return `${+parts[0]}/${+parts[1]}/${+parts[2]}`;
  }
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "—";
  const { jy, jm, jd } = jalaali.toJalaali(date);
  return `${jy}/${jm}/${jd}`;
}

/**
 * Formats a "HH:MM" (24h) time as a Persian clock string:
 * "09:05" → "۹:۰۵ صبح", "15:30" → "۳:۳۰ بعد از ظهر", "12:00" → "۱۲:۰۰ بعد از ظهر".
 * Accepts Persian/Arabic digits. Returns the input untouched when unparseable.
 */
export function formatTimeFa(time: string | null | undefined): string {
  if (!time) return "—";
  const match = /^(\d{1,2}):(\d{2})/.exec(toLatinDigits(time.trim()));
  if (!match) return time;
  const h = Number(match[1]);
  if (!Number.isFinite(h) || h < 0 || h > 23) return time;
  const period = h < 12 ? "صبح" : "بعد از ظهر";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${toPersianDigits(String(h12))}:${toPersianDigits(match[2])} ${period}`;
}

/** @deprecated use {@link jalaliToGregorianISO} — same output, tolerant input parsing. */
export function jalaliToGregorian(jalaliStr: string): string {
  return jalaliToGregorianISO(jalaliStr);
}

export function jalaliToGregorianISO(jalaliStr: string): string {
  // Pickers may hand back "۱۴۰۵/۰۷/۰۸", "1405-7-8" or a datetime-picker string that
  // still carries a time ("۱۴۰۵/۰۷/۰۸ ۱۴:۳۰") — take the date part and normalise
  // both separators before parsing, otherwise the time makes the day NaN.
  const latin = toLatinDigits(jalaliStr).trim();
  const datePart = latin.split(/[ T]/)[0] ?? "";
  const parts = datePart.split(/[/\-.]/).map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return jalaliStr;
  const { gy, gm, gd } = jalaali.toGregorian(parts[0], parts[1], parts[2]);
  if (!Number.isFinite(gy) || !Number.isFinite(gm) || !Number.isFinite(gd)) return jalaliStr;
  return `${gy}-${String(gm).padStart(2, "0")}-${String(gd).padStart(2, "0")}`;
}

export function jalaliToShamsiApiDate(jalaliStr: string): string {
  const latin = toLatinDigits(jalaliStr);
  return latin.replace(/\//g, "-");
}

/** A Date as a Shamsi `YYYY-MM-DD` string for APIs that expect Shamsi dates. */
export function toShamsiDateInput(date: Date): string {
  const { jy, jm, jd } = jalaali.toJalaali(date);
  return `${jy}-${String(jm).padStart(2, "0")}-${String(jd).padStart(2, "0")}`;
}

function toLatinDigits(str: string): string {
  const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
  return str.replace(/[۰-۹]/g, (d) => String(persianDigits.indexOf(d)));
}
