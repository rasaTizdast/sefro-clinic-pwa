import { forwardRef, type TextareaHTMLAttributes } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, className = '', id, ...props }, ref) => {
    const textareaId = id || (label ? label.replace(/\s+/g, '-').toLowerCase() : undefined)
    const errorId = textareaId ? `${textareaId}-error` : undefined
    const helperId = textareaId ? `${textareaId}-helper` : undefined

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={textareaId}
            className="text-sm font-medium text-surface-700"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={`w-full rounded-lg border text-sm transition-all duration-150 ease-in-out outline-none focus-visible:ring-2 focus-visible:ring-offset-0 placeholder:text-surface-400 disabled:cursor-not-allowed disabled:bg-surface-50 disabled:text-surface-400 resize-y min-h-[80px] px-3 py-2 ${
            error
              ? 'border-danger-400 focus-visible:border-danger-500 focus-visible:ring-danger-500/30'
              : 'border-surface-300 focus-visible:border-primary-500 focus-visible:ring-primary-500/30'
          } ${className}`}
          {...props}
        />
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

Textarea.displayName = 'Textarea'
