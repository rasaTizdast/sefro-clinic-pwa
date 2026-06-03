import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  containerClassName?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, className = '', containerClassName = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.replace(/\s+/g, '-').toLowerCase() : undefined)
    const errorId = inputId ? `${inputId}-error` : undefined
    const helperId = inputId ? `${inputId}-helper` : undefined

    return (
      <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-surface-700"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <span className="absolute inset-s-0 top-0 flex items-center ps-3 text-surface-400 pointer-events-none">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            className={`w-full rounded-lg border text-sm transition-all duration-150 ease-in-out outline-none focus-visible:ring-2 focus-visible:ring-offset-0 placeholder:text-surface-400 disabled:cursor-not-allowed disabled:bg-surface-50 disabled:text-surface-400 ${
              error
                ? 'border-danger-400 focus-visible:border-danger-500 focus-visible:ring-danger-500/30'
                : 'border-surface-300 focus-visible:border-primary-500 focus-visible:ring-primary-500/30'
            } ${leftIcon ? 'ps-9' : 'ps-3'} ${rightIcon ? 'pe-9' : 'pe-3'} py-2 ${className}`}
            {...props}
          />
          {rightIcon && (
            <span className="absolute inset-e-0 top-0 flex items-center pe-3 text-surface-400">
              {rightIcon}
            </span>
          )}
        </div>
        {error && (
          <p id={errorId} className="text-xs text-danger-600" role="alert">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={helperId} className="text-xs text-surface-500">
            {helperText}
          </p>
        )}
      </div>
    )
  },
)

Input.displayName = 'Input'
