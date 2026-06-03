import { type ButtonHTMLAttributes, type ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: ReactNode
  iconRight?: ReactNode
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 disabled:bg-primary-300',
  secondary:
    'bg-surface-100 text-surface-700 hover:bg-surface-200 active:bg-surface-300 disabled:bg-surface-50 disabled:text-surface-400',
  outline:
    'border-2 border-primary-600 text-primary-600 hover:bg-primary-50 active:bg-primary-100 disabled:border-surface-300 disabled:text-surface-400',
  ghost:
    'text-surface-700 hover:bg-surface-100 active:bg-surface-200 disabled:text-surface-400',
  danger:
    'bg-danger-600 text-white hover:bg-danger-700 active:bg-danger-800 disabled:bg-danger-300',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm gap-1.5 rounded-md',
  md: 'px-4 py-2 text-sm gap-2 rounded-lg',
  lg: 'px-6 py-3 text-base gap-2 rounded-lg',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconRight,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-medium transition-all duration-150 ease-in-out cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <svg
          className="animate-spin size-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children && <span className="truncate">{children}</span>}
      {!loading && iconRight && (
        <span className="shrink-0">{iconRight}</span>
      )}
    </button>
  )
}
