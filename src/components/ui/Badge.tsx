import { type ReactNode } from 'react'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info'
type BadgeSize = 'sm' | 'md'

interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  size?: BadgeSize
  dot?: boolean
  className?: string
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-surface-100 text-surface-700',
  success: 'bg-success-100 text-success-700',
  warning: 'bg-warning-100 text-warning-700',
  danger: 'bg-danger-100 text-danger-700',
  info: 'bg-info-100 text-info-700',
}

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-surface-500',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  danger: 'bg-danger-500',
  info: 'bg-info-500',
}

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-1.5 py-0.5 text-xs gap-1',
  md: 'px-2.5 py-1 text-xs gap-1.5',
}

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  className = '',
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center font-medium rounded-full whitespace-nowrap ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {dot && (
        <span
          className={`size-1.5 rounded-full ${dotColors[variant]}`}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  )
}
