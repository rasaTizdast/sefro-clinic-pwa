import { type ReactNode } from "react";

export type SortDirection = "asc" | "desc";

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (item: T) => ReactNode;
  align?: "start" | "center" | "end";
  width?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  sortKey?: string;
  sortDirection?: SortDirection;
  onSort?: (key: string) => void;
  emptyMessage?: string;
  rowKey: (item: T, index: number) => string | number;
  onRowClick?: (item: T) => void;
  className?: string;
  caption?: string;
}

function DesktopTable<T>({
  columns,
  data,
  loading,
  sortKey,
  sortDirection,
  onSort,
  emptyMessage,
  rowKey,
  onRowClick,
  className,
  caption,
}: {
  columns: Column<T>[];
  data: T[];
  loading: boolean;
  sortKey?: string;
  sortDirection?: SortDirection;
  onSort?: (key: string) => void;
  emptyMessage?: string;
  rowKey: (item: T, index: number) => string | number;
  onRowClick?: (item: T) => void;
  className: string;
  caption?: string;
}) {
  const renderSortIcon = (column: Column<T>) => {
    if (!column.sortable) return null;
    const isActive = sortKey === column.key;
    return (
      <span className="ms-1 inline-flex size-3.5 shrink-0 flex-col">
        <svg
          className={`size-1.5 ${isActive && sortDirection === "asc" ? "text-primary-600" : "text-surface-400"}`}
          viewBox="0 0 10 6"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M5 0L10 6H0z" />
        </svg>
        <svg
          className={`size-1.5 ${isActive && sortDirection === "desc" ? "text-primary-600" : "text-surface-400"}`}
          viewBox="0 0 10 6"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M5 6L0 0h10z" />
        </svg>
      </span>
    );
  };

  return (
    <div className={`border-surface-200 overflow-x-auto rounded-lg border ${className}`}>
      <table className="w-full border-collapse">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="bg-surface-50">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`text-surface-600 bg-surface-50 sticky top-0 px-4 py-3 text-xs font-semibold tracking-wider whitespace-nowrap uppercase select-none ${
                  col.sortable ? "hover:text-surface-800 cursor-pointer" : ""
                }`}
                style={{ width: col.width, textAlign: col.align || "start" }}
                onClick={() => col.sortable && onSort?.(col.key)}
                onKeyDown={(e) => {
                  if ((e.key === "Enter" || e.key === " ") && col.sortable) {
                    e.preventDefault();
                    onSort?.(col.key);
                  }
                }}
                tabIndex={col.sortable ? 0 : undefined}
                aria-sort={
                  sortKey === col.key
                    ? sortDirection === "asc"
                      ? "ascending"
                      : "descending"
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
        <tbody className="divide-surface-100 divide-y">
          {loading
            ? Array.from({ length: 5 }).map((_, rowIdx) => (
                <tr key={`skeleton-${rowIdx}`} className="border-surface-100 border-t">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      <div
                        className="bg-surface-200 h-4 animate-pulse rounded"
                        style={{ width: `${60 + Math.random() * 30}%` }}
                        aria-hidden="true"
                      />
                    </td>
                  ))}
                </tr>
              ))
            : data.map((item, index) => (
                <tr
                  key={rowKey(item, index)}
                  onClick={() => onRowClick?.(item)}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === " ") && onRowClick) {
                      e.preventDefault();
                      onRowClick(item);
                    }
                  }}
                  tabIndex={onRowClick ? 0 : undefined}
                  role={onRowClick ? "button" : undefined}
                  className={`${onRowClick ? "hover:bg-surface-50 cursor-pointer" : ""} transition-colors duration-150`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className="text-surface-700 px-4 py-3 text-sm whitespace-nowrap"
                      style={{ textAlign: col.align || "start" }}
                    >
                      {col.render ? col.render(item) : (item as Record<string, ReactNode>)[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>
      {!loading && data.length === 0 && (
        <div className="text-surface-500 flex items-center justify-center py-12 text-sm">
          {emptyMessage}
        </div>
      )}
    </div>
  );
}

function MobileCards<T>({
  columns,
  data,
  loading,
  emptyMessage,
  rowKey,
  onRowClick,
}: {
  columns: Column<T>[];
  data: T[];
  loading: boolean;
  emptyMessage?: string;
  rowKey: (item: T, index: number) => string | number;
  onRowClick?: (item: T) => void;
}) {
  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={`skeleton-${i}`} className="border-surface-200 rounded-lg border bg-white p-4">
            <div className="flex flex-col gap-3">
              {columns.slice(0, 4).map((col) => (
                <div key={col.key} className="flex items-center justify-between">
                  <div
                    className="bg-surface-200 h-3 w-16 animate-pulse rounded"
                    aria-hidden="true"
                  />
                  <div
                    className="bg-surface-200 h-4 w-24 animate-pulse rounded"
                    aria-hidden="true"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-surface-500 border-surface-200 flex items-center justify-center rounded-lg border bg-white py-12 text-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {data.map((item, index) => (
        <div
          key={rowKey(item, index)}
          onClick={() => onRowClick?.(item)}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && onRowClick) {
              e.preventDefault();
              onRowClick(item);
            }
          }}
          tabIndex={onRowClick ? 0 : undefined}
          role={onRowClick ? "button" : undefined}
          className={`border-surface-200 rounded-lg border bg-white p-4 ${onRowClick ? "hover:border-surface-300 cursor-pointer" : ""} transition-colors duration-150`}
        >
          <div className="flex flex-col gap-2.5">
            {columns.map((col) => (
              <div key={col.key} className="flex items-center justify-between gap-2">
                <span className="text-surface-500 shrink-0 text-xs font-medium">{col.header}</span>
                <span
                  className="text-surface-700 text-end text-sm"
                  style={{
                    textAlign:
                      col.align === "center" ? "end" : col.align === "start" ? "start" : "end",
                  }}
                >
                  {col.render ? col.render(item) : (item as Record<string, ReactNode>)[col.key]}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Table<T>(props: TableProps<T>) {
  const {
    columns,
    data,
    loading = false,
    sortKey,
    sortDirection,
    onSort,
    emptyMessage = "داده‌ای یافت نشد",
    rowKey,
    onRowClick,
    className = "",
    caption,
  } = props;

  return (
    <>
      <div className="tablet:block z-1 hidden">
        <DesktopTable
          columns={columns}
          data={data}
          loading={loading}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSort={onSort}
          emptyMessage={emptyMessage}
          rowKey={rowKey}
          onRowClick={onRowClick}
          className={className}
          caption={caption}
        />
      </div>
      <div className="tablet:hidden block">
        <MobileCards
          columns={columns}
          data={data}
          loading={loading}
          emptyMessage={emptyMessage}
          rowKey={rowKey}
          onRowClick={onRowClick}
        />
      </div>
    </>
  );
}
