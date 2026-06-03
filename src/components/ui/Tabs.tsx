import { type ReactNode } from 'react'

export interface Tab {
  id: string
  label: string
  icon?: ReactNode
  badge?: string | number
}

interface TabsProps {
  tabs: Tab[]
  activeTab: string
  onChange: (id: string) => void
  className?: string
}

export function Tabs({ tabs, activeTab, onChange, className = '' }: TabsProps) {
  return (
    <div className={`flex border-b border-surface-200 gap-0 ${className}`} role="tablist">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-150 ease-in-out border-b-2 cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600/40 focus-visible:ring-inset ${
              isActive
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-surface-500 hover:text-surface-700 hover:border-surface-300'
            }`}
          >
            {tab.icon && <span className="shrink-0 size-4">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`inline-flex items-center justify-center min-w-[20px] px-1.5 py-0.5 text-xs font-medium rounded-full ${
                  isActive
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-surface-100 text-surface-600'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

interface TabPanelProps {
  id: string
  activeTab: string
  children: ReactNode
  className?: string
}

export function TabPanel({ id, activeTab, children, className = '' }: TabPanelProps) {
  if (id !== activeTab) return null

  return (
    <div role="tabpanel" aria-labelledby={id} className={className}>
      {children}
    </div>
  )
}
