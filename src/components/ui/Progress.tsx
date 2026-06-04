import { useEffect, useState } from 'react'

type ProgressVariant = 'default' | 'success' | 'warning' | 'danger' | 'info'
type ProgressSize = 'sm' | 'md'

interface ProgressProps {
  value: number
  max?: number
  variant?: ProgressVariant
  size?: ProgressSize
  showLabel?: boolean
  className?: string
}

const variantStyles: Record<ProgressVariant, string> = {
  default: 'bg-primary-600',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  danger: 'bg-danger-500',
  info: 'bg-info-500',
}

const sizeStyles: Record<ProgressSize, string> = {
  sm: 'h-1.5',
  md: 'h-2.5',
}

export function Progress({
  value,
  max = 100,
  variant = 'default',
  size = 'md',
  showLabel = false,
  className = '',
}: ProgressProps) {
  const clampedValue = Math.min(Math.max(value, 0), max)
  const percentage = max > 0 ? (clampedValue / max) * 100 : 0
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        className={`grow rounded-full bg-surface-200 overflow-hidden ${sizeStyles[size]}`}
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={`${Math.round(percentage)}%`}
      >
        <div
          className={`h-full rounded-full transition-transform duration-500 ease-out ${variantStyles[variant]}`}
          style={{
            transform: `scaleX(${visible ? percentage / 100 : 0})`,
            transformOrigin: 'right',
          }}
        />
      </div>
      {showLabel && (
        <span className="text-sm font-medium text-surface-600 shrink-0 tabular-nums">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  )
}
