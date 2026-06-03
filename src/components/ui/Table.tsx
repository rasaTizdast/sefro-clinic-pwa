import { type ReactNode } from 'react'

export type SortDirection = 'asc' | 'desc'

export interface Column<T> {
  key: string
  header: string
  sortable?: boolean
  render?: (item: T) => ReactNode
  align?: 'start' | 'center' | 'end'
  width?: string
}

interface TableProps<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  sortKey?: string
  sortDirection?: SortDirection
  onSort?: (key: string) => void
  emptyMessage?: string
  rowKey: (item: T, index: number) => string | number
  onRowClick?: (item: T) => void
  className?: string
}

export function Table<T>({
  columns,
  data,
  loading = false,
  sortKey,
  sortDirection,
  onSort,
  emptyMessage = 'داده‌ای یافت نشد',
  rowKey,
  onRowClick,
  className = '',
}: TableProps<T>) {
  const renderSortIcon = (column: Column<T>) => {
    if (!column.sortable) return null

    const isActive = sortKey === column.key
    return (
      <span className="inline-flex flex-col size-3.5 shrink-0 ms-1">
        <svg
          className={`size-1.5 ${isActive && sortDirection === 'asc' ? 'text-primary-600' : 'text-surface-400'}`}
          viewBox="0 0 10 6"
          fill="currentColor"
        >
          <path d="M5 0L10 6H0z" />
        </svg>
        <svg
          className={`size-1.5 ${isActive && sortDirection === 'desc' ? 'text-primary-600' : 'text-surface-400'}`}
          viewBox="0 0 10 6"
          fill="currentColor"
        >
          <path d="M5 6L0 0h10z" />
        </svg>
      </span>
    )
  }

  if (loading) {
    return (
      <div className={`overflow-x-auto rounded-lg border border-surface-200 ${className}`}>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-surface-50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-xs font-semibold text-surface-600 uppercase tracking-wider whitespace-nowrap text-${col.align || 'start'}`}
                  style={{ width: col.width }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, rowIdx) => (
              <tr key={`skeleton-${rowIdx}`} className="border-t border-surface-100">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    <div className="h-4 bg-surface-200 rounded animate-pulse" style={{ width: `${60 + Math.random() * 30}%` }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className={`overflow-x-auto rounded-lg border border-surface-200 ${className}`}>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-surface-50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-xs font-semibold text-surface-600 uppercase tracking-wider whitespace-nowrap`}
                  style={{ width: col.width, textAlign: col.align || 'start' }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
        </table>
        <div className="flex items-center justify-center py-12 text-surface-500 text-sm">
          {emptyMessage}
        </div>
      </div>
    )
  }

  return (
    <div className={`overflow-x-auto rounded-lg border border-surface-200 ${className}`}>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-surface-50">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-xs font-semibold text-surface-600 uppercase tracking-wider whitespace-nowrap select-none ${
                  col.sortable ? 'cursor-pointer hover:text-surface-800' : ''
                }`}
                style={{ width: col.width, textAlign: col.align || 'start' }}
                onClick={() => col.sortable && onSort?.(col.key)}
                aria-sort={
                  sortKey === col.key
                    ? sortDirection === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : undefined
                }
              >
                <span className="inline-flex items-center">
                  {col.header}
                  {renderSortIcon(col)}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-100">
          {data.map((item, index) => (
            <tr
              key={rowKey(item, index)}
              onClick={() => onRowClick?.(item)}
              className={`${onRowClick ? 'cursor-pointer hover:bg-surface-50' : ''} transition-colors duration-150`}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className="px-4 py-3 text-sm text-surface-700 whitespace-nowrap"
                  style={{ textAlign: col.align || 'start' }}
                >
                  {col.render ? col.render(item) : (item as Record<string, ReactNode>)[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
