import { type ReactNode } from 'react'

type AlertVariant = 'success' | 'warning' | 'error' | 'info'

interface AlertProps {
  variant?: AlertVariant
  title?: string
  children: ReactNode
  dismissible?: boolean
  onDismiss?: () => void
  className?: string
}

const variantStyles: Record<AlertVariant, string> = {
  success: 'bg-success-50 border-success-300 text-success-800',
  warning: 'bg-warning-50 border-warning-300 text-warning-800',
  error: 'bg-danger-50 border-danger-300 text-danger-800',
  info: 'bg-info-50 border-info-300 text-info-800',
}

const iconColors: Record<AlertVariant, string> = {
  success: 'text-success-500',
  warning: 'text-warning-500',
  error: 'text-danger-500',
  info: 'text-info-500',
}

const icons: Record<AlertVariant, ReactNode> = {
  success: (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  warning: (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  error: (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  info: (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
}

export function Alert({
  variant = 'info',
  title,
  children,
  dismissible = false,
  onDismiss,
  className = '',
}: AlertProps) {
  return (
    <div
      className={`flex items-start gap-3 rounded-lg border p-4 text-sm ${variantStyles[variant]} ${className}`}
      role="alert"
    >
      <span className={`shrink-0 mt-0.5 ${iconColors[variant]}`}>
        {icons[variant]}
      </span>
      <div className="grow min-w-0">
        {title && (
          <p className="font-semibold mb-1">{title}</p>
        )}
        <div>{children}</div>
      </div>
      {dismissible && onDismiss && (
        <button
          onClick={onDismiss}
          className="shrink-0 p-0.5 rounded opacity-70 hover:opacity-100 transition-opacity cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
          aria-label="Dismiss"
        >
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}
