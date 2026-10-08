import { type KeyboardEvent, type ReactNode, useRef } from "react";

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
  /** Accessible name for the tablist — needed when a page hosts more than one. */
  ariaLabel?: string;
}

export function Tabs({ tabs, activeTab, onChange, className = "", ariaLabel }: TabsProps) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const activate = (index: number) => {
    const tab = tabs[index];
    if (!tab) return;
    onChange(tab.id);
    tabRefs.current[index]?.focus();
  };

  /**
   * WAI-ARIA tabs pattern: arrows move focus AND selection, Home/End jump to
   * the first/last tab. Arrow direction flips in RTL so "next" follows reading order.
   */
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const isRtl = document.documentElement.dir === "rtl";
    switch (event.key) {
      case "ArrowRight":
        event.preventDefault();
        activate(isRtl ? index - 1 : index + 1);
        break;
      case "ArrowLeft":
        event.preventDefault();
        activate(isRtl ? index + 1 : index - 1);
        break;
      case "Home":
        event.preventDefault();
        activate(0);
        break;
      case "End":
        event.preventDefault();
        activate(tabs.length - 1);
        break;
      default:
        break;
    }
  };

  return (
    <div
      className={`flex flex-nowrap gap-0 overflow-x-auto shadow-[inset_0_-1px_0_0_var(--color-surface-200)] ${className}`}
      role="tablist"
      aria-label={ariaLabel}
      aria-orientation="horizontal"
    >
      {tabs.map((tab, index) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            id={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={`${tab.id}-panel`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={`focus-visible:ring-primary-600/40 relative inline-flex cursor-pointer items-center gap-2 rounded-t-md px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors duration-150 ease-in-out focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset ${
              isActive
                ? "text-primary-700"
                : "text-surface-500 hover:bg-surface-50 hover:text-surface-700"
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
    <div role="tabpanel" id={`${id}-panel`} aria-labelledby={id} className={className}>
      {children}
    </div>
  );
}
