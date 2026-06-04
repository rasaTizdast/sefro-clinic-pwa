import { type ReactNode } from 'react'

type CardVariant = 'default' | 'outlined' | 'elevated'
type CardPadding = 'none' | 'sm' | 'md' | 'lg'

interface CardProps {
  children: ReactNode
  variant?: CardVariant
  padding?: CardPadding
  className?: string
  header?: ReactNode
  footer?: ReactNode
  title?: string
}

const variantStyles: Record<CardVariant, string> = {
  default: 'bg-white',
  outlined: 'bg-white border-2 border-surface-200',
  elevated: 'bg-white shadow-md hover:shadow-lg transition-shadow duration-200',
}

const paddingStyles: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
}

export function Card({
  children,
  variant = 'default',
  padding = 'md',
  className = '',
  header,
  footer,
  title,
}: CardProps) {
  const sectionPadding = padding === 'none' ? 'px-4 py-3' : ''

  return (
    <div
      className={`rounded-xl ${variantStyles[variant]} ${className}`}
    >
      {header && (
        <div className={`border-b border-surface-200 ${paddingStyles[padding]} ${sectionPadding}`}>
          {header}
        </div>
      )}
      <div className={paddingStyles[padding]}>
        {title && <h3 className="text-lg font-semibold text-surface-900 mb-2">{title}</h3>}
        {children}
      </div>
      {footer && (
        <div className={`border-t border-surface-200 ${paddingStyles[padding]} ${sectionPadding}`}>
          {footer}
        </div>
      )}
    </div>
  )
}

export function CardHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex items-center justify-between gap-4 ${className}`}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <h3 className={`text-lg font-semibold text-surface-900 ${className}`}>
      {children}
    </h3>
  )
}

export function CardDescription({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <p className={`text-sm text-surface-500 ${className}`}>
      {children}
    </p>
  )
}
