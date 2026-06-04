import { type ReactNode } from "react";

export interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
  badge?: string | number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className = "" }: TabsProps) {
  return (
    <div
      className={`border-surface-200 flex flex-nowrap gap-0 overflow-x-auto border-b ${className}`}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`focus-visible:ring-primary-600/40 relative inline-flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors duration-150 ease-in-out focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset ${
              isActive ? "text-primary-700" : "text-surface-500 hover:text-surface-700"
            }`}
          >
            {tab.icon && <span className="size-4 shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-medium ${
                  isActive ? "bg-primary-100 text-primary-700" : "bg-surface-100 text-surface-600"
                }`}
              >
                {tab.badge}
              </span>
            )}
            {isActive && (
              <span className="bg-primary-600 absolute inset-x-0 bottom-0 h-0.5 rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}

interface TabPanelProps {
  id: string;
  activeTab: string;
  children: ReactNode;
  className?: string;
}

export function TabPanel({ id, activeTab, children, className = "" }: TabPanelProps) {
  if (id !== activeTab) return null;

  return (
    <div role="tabpanel" aria-labelledby={id} className={className}>
      {children}
    </div>
  );
}
