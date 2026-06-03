import { forwardRef, type SelectHTMLAttributes } from 'react'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: SelectOption[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className = '', id, ...props }, ref) => {
    const selectId = id || (label ? label.replace(/\s+/g, '-').toLowerCase() : undefined)
    const errorId = selectId ? `${selectId}-error` : undefined

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="text-sm font-medium text-surface-700"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
            className={`w-full appearance-none rounded-lg border text-sm transition-all duration-150 ease-in-out outline-none focus-visible:ring-2 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:bg-surface-50 disabled:text-surface-400 ps-3 pe-9 py-2 ${
              error
                ? 'border-danger-400 focus-visible:border-danger-500 focus-visible:ring-danger-500/30'
                : 'border-surface-300 focus-visible:border-primary-500 focus-visible:ring-primary-500/30'
            } ${props.value ? 'text-surface-900' : 'text-surface-400'} ${className}`}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} className="text-surface-900">
                {opt.label}
              </option>
            ))}
          </select>
          <span className="absolute inset-e-0 top-0 flex items-center pe-3 pointer-events-none text-surface-400">
            <svg
              className="size-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </div>
        {error && (
          <p id={errorId} className="text-xs text-danger-600" role="alert">
            {error}
          </p>
        )}
      </div>
    )
  },
)

Select.displayName = 'Select'
