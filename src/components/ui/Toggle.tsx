import { type InputHTMLAttributes } from 'react'

interface ToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'children'> {
  label?: string
}

export function Toggle({ label, disabled, className = '', id, ...props }: ToggleProps) {
  const toggleId = id || (label ? label.replace(/\s+/g, '-').toLowerCase() : 'toggle')

  return (
    <label
      htmlFor={toggleId}
      className={`inline-flex items-center gap-3 cursor-pointer ${disabled ? 'cursor-not-allowed opacity-50' : ''} ${className}`}
    >
      <div className="relative">
        <input
          type="checkbox"
          id={toggleId}
          disabled={disabled}
          className="peer sr-only"
          {...props}
        />
        <div className="w-10 h-6 rounded-full bg-surface-300 transition-colors duration-200 ease-in-out peer-checked:bg-primary-600" />
        <div className="absolute top-0.5 start-0.5 size-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out peer-checked:translate-x-[calc(100%+0.125rem)]" />
      </div>
      {label && (
        <span className="text-sm font-medium text-surface-700 select-none">{label}</span>
      )}
    </label>
  )
}
