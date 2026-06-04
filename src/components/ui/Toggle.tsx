import { type InputHTMLAttributes } from "react";

interface ToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "children"> {
  label?: string;
}

export function Toggle({ label, disabled, className = "", id, ...props }: ToggleProps) {
  const toggleId = id || (label ? label.replace(/\s+/g, "-").toLowerCase() : "toggle");

  return (
    <label
      htmlFor={toggleId}
      className={`inline-flex cursor-pointer items-center gap-3 ${disabled ? "cursor-not-allowed opacity-50" : ""} ${className}`}
    >
      <div className="relative">
        <input
          type="checkbox"
          id={toggleId}
          disabled={disabled}
          className="peer sr-only"
          {...props}
        />
        <div className="bg-surface-300 peer-checked:bg-primary-600 h-6 w-10 rounded-full transition-colors duration-200 ease-in-out" />
        <div className="absolute inset-e-0.5 top-0.5 size-5 rounded-full bg-white shadow-sm transition-all duration-200 ease-in-out peer-checked:inset-e-[calc(100%-1.375rem)]" />
      </div>
      {label && <span className="text-surface-700 text-sm font-medium select-none">{label}</span>}
    </label>
  );
}
