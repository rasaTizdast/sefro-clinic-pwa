interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

function getPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const pages: (number | 'ellipsis')[] = [1]

  if (current > 3) {
    pages.push('ellipsis')
  }

  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)

  for (let i = start; i <= end; i++) {
    pages.push(i)
  }

  if (current < total - 2) {
    pages.push('ellipsis')
  }

  pages.push(total)

  return pages
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className = '',
}: PaginationProps) {
  if (totalPages <= 1) return null

  const pages = getPageNumbers(currentPage, totalPages)

  const baseBtn =
    'inline-flex items-center justify-center size-9 text-sm font-medium rounded-lg transition-all duration-150 ease-in-out cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600/40 focus-visible:ring-offset-1'
  const activeBtn = 'bg-primary-600 text-white'
  const inactiveBtn = 'text-surface-600 hover:bg-surface-100 active:bg-surface-200'
  const disabledBtn = 'text-surface-300 cursor-not-allowed'

  return (
    <nav aria-label="Pagination" className={`flex items-center justify-center gap-1 ${className}`}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className={`${baseBtn} ${currentPage <= 1 ? disabledBtn : inactiveBtn}`}
        aria-label="Previous page"
      >
        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {pages.map((page, idx) =>
        page === 'ellipsis' ? (
          <span key={`ellipsis-${idx}`} className="inline-flex items-center justify-center size-9 text-sm text-surface-400">
            ...
          </span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`${baseBtn} ${page === currentPage ? activeBtn : inactiveBtn}`}
            aria-current={page === currentPage ? 'page' : undefined}
            aria-label={`Page ${page}`}
          >
            {page}
          </button>
        ),
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className={`${baseBtn} ${currentPage >= totalPages ? disabledBtn : inactiveBtn}`}
        aria-label="Next page"
      >
        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
    </nav>
  )
}
