import "react-calendar-datetime-picker/style.css";

import jalaali from "jalaali-js";
import { useId, useMemo } from "react";
import { DtPicker } from "react-calendar-datetime-picker";
import { BiCalendar } from "react-icons/bi";

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
    onChange(formattedString);
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
        <label htmlFor={inputId} className="text-surface-700 text-sm font-medium">
          {label}
        </label>
      )}
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
        todayBtn
      />
    </div>
  );
}
