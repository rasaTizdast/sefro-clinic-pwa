type SkeletonVariant = 'text' | 'circular' | 'rectangular'

interface SkeletonProps {
  variant?: SkeletonVariant
  width?: string
  height?: string
  className?: string
}

const variantStyles: Record<SkeletonVariant, string> = {
  text: 'h-4 rounded',
  circular: 'rounded-full',
  rectangular: 'rounded-lg',
}

export function Skeleton({
  variant = 'text',
  width,
  height,
  className = '',
}: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-surface-200 ${variantStyles[variant]} ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  )
}

interface SkeletonTextProps {
  lines?: number
  className?: string
}

export function SkeletonText({ lines = 3, className = '' }: SkeletonTextProps) {
  return (
    <div className={`flex flex-col gap-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          width={i === lines - 1 ? '60%' : '100%'}
        />
      ))}
    </div>
  )
}

interface SkeletonTableProps {
  rows?: number
  columns?: number
  className?: string
}

export function SkeletonTable({ rows = 5, columns = 4, className = '' }: SkeletonTableProps) {
  return (
    <div className={`flex flex-col gap-1 ${className}`} aria-hidden="true">
      <div className="flex gap-4 p-3 bg-surface-100 rounded-t-lg">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`header-${i}`} width={`${100 / columns}%`} height="1rem" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={`row-${rowIdx}`} className="flex gap-4 p-3">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Skeleton
              key={`cell-${rowIdx}-${colIdx}`}
              width={`${100 / columns}%`}
              height="0.875rem"
            />
          ))}
        </div>
      ))}
    </div>
  )
}
