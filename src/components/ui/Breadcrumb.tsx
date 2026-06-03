import { type ReactNode } from 'react'

export interface BreadcrumbItem {
  label: string
  href?: string
  icon?: ReactNode
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex items-center gap-1.5 text-sm text-surface-500 flex-wrap">
        {items.map((item, index) => {
          const isLast = index === items.length - 1

          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {index > 0 && (
                <svg
                  className="size-4 shrink-0 text-surface-400 rtl:rotate-180"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              )}
              {item.href && !isLast ? (
                <a
                  href={item.href}
                  className="inline-flex items-center gap-1 hover:text-surface-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600/40 focus-visible:ring-offset-1 rounded"
                >
                  {item.icon && <span className="size-4">{item.icon}</span>}
                  <span>{item.label}</span>
                </a>
              ) : (
                <span
                  className={`inline-flex items-center gap-1 ${
                    isLast ? 'text-surface-800 font-medium' : ''
                  }`}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.icon && <span className="size-4">{item.icon}</span>}
                  <span>{item.label}</span>
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
