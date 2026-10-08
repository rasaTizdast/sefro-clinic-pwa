import "react-calendar-datetime-picker/style.css";

import jalaali from "jalaali-js";
import { useId, useMemo } from "react";
import { DtPicker } from "react-calendar-datetime-picker";
import { BiCalendar } from "react-icons/bi";

import { toShamsiDateInput } from "../../lib/date";
import { toPersianDigits } from "../../lib/digits";
import { CalendarOverlay } from "./CalendarOverlay";

interface JalaliDatePickerProps {
  value: string | null;
  onChange: (jalaliDate: string | null) => void;
  label?: string;
  containerClassName?: string;
}

function toLatinDigits(str: string): string {
  const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
  return str.replace(/[۰-۹]/g, (d) => String(persianDigits.indexOf(d)));
}

/** Today as the `۱۴۰۵/۰۷/۳۰` shape the rest of the app passes around. */
function todayJalali(): string {
  return toPersianDigits(toShamsiDateInput(new Date()).replace(/-/g, "/"));
}

/**
 * Canonical `۱۴۰۵/۰۷/۳۰` from whatever the picker hands back (Persian digits, dashes
 * or a trailing time), or null when it is not a date. Keeps `value` in one shape
 * so `initValue` and every consumer stay predictable.
 */
function normalizeJalali(raw: string | null): string | null {
  if (!raw) return null;
  const datePart = toLatinDigits(raw).trim().split(/[ T]/)[0] ?? "";
  const parts = datePart.split(/[/\-.]/).map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n) || n <= 0)) return null;
  return toPersianDigits(
    `${parts[0]}/${String(parts[1]).padStart(2, "0")}/${String(parts[2]).padStart(2, "0")}`
  );
}

export function JalaliDatePicker({
  value,
  onChange,
  label,
  containerClassName = "",
}: JalaliDatePickerProps) {
  const uid = useId();

  const initValue = useMemo(() => {
    if (!value) return undefined;
    const latin = toLatinDigits(value);
    const parts = latin.split("/");
    if (parts.length !== 3) return undefined;
    const [jy, jm, jd] = parts.map(Number);
    if (!jy || !jm || !jd) return undefined;
    try {
      const g = jalaali.toGregorian(jy, jm, jd);
      return new Date(g.gy, g.gm - 1, g.gd);
    } catch {
      return undefined;
    }
  }, [value]);

  function handleChange(
    _normalizedValue: unknown,
    _jsDateValue: Date | null,
    formattedString: string | null
  ) {
    onChange(normalizeJalali(formattedString));
  }

  const inputId = `jalali-input-${uid}`;

  const triggerElement = (
    <div className="relative flex w-full items-center">
      <input
        id={inputId}
        type="text"
        readOnly
        value={value ?? ""}
        placeholder="۱۴۰۵/۰۳/۱۵"
        className="border-surface-300 text-surface-900 placeholder:text-surface-400 hover:border-surface-400 focus:border-primary-500 focus:ring-primary-500/30 w-full cursor-pointer rounded-lg border bg-white py-2 ps-3 pe-9 text-sm transition-all duration-150 ease-in-out outline-none focus:ring-2"
      />
      <BiCalendar className="text-surface-400 pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2" />
    </div>
  );

  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={inputId} className="text-surface-700 text-sm font-medium">
            {label}
          </label>
          {/* The library's own "today" control does not commit a value, so the
              shortcut lives here where it is guaranteed to fire onChange. */}
          <button
            type="button"
            onClick={() => onChange(todayJalali())}
            className="text-primary-600 hover:text-primary-700 text-xs underline-offset-4 hover:underline"
          >
            امروز
          </button>
        </div>
      )}
      <CalendarOverlay />
      <DtPicker
        initValue={initValue}
        onChange={handleChange}
        triggerElement={triggerElement}
        triggerClass="w-full"
        calenderModalClass="calendar-blue-theme"
        calendarSystem="jalali"
        locale="fa"
        dateFormat="YYYY/MM/DD"
        placeholder="۱۴۰۵/۰۳/۱۵"
        autoClose
        todayBtn={false}
      />
    </div>
  );
}
