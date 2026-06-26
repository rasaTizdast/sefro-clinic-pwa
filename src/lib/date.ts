import jalaali from "jalaali-js";

function isAlreadyJalali(dateStr: string): boolean {
  const yearMatch = dateStr.match(/^(\d{4})/);
  return !!yearMatch && parseInt(yearMatch[1]) > 1300;
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

export function jalaliToGregorian(jalaliStr: string): string {
  const parts = jalaliStr.split("/").map(Number);
  if (parts.length !== 3) return jalaliStr;
  const { gy, gm, gd } = jalaali.toGregorian(parts[0], parts[1], parts[2]);
  return `${gy}-${String(gm).padStart(2, "0")}-${String(gd).padStart(2, "0")}`;
}
