import { useState } from 'react';
import { Link, useLocation } from 'react-router';

// ---------- Types ----------
export interface SidebarItem {
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: number | string;
}

interface SidebarProps {
  items: SidebarItem[];
  logo?: React.ReactNode;
  className?: string;
}

const ChevronIcon = ({ direction }: { direction: 'left' | 'right' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className="w-5 h-5 rtl:rotate-180 transition-transform"
  >
    {direction === 'left' ? (
      <path
        fillRule="evenodd"
        d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
        clipRule="evenodd"
      />
    ) : (
      <path
        fillRule="evenodd"
        d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
        clipRule="evenodd"
      />
    )}
  </svg>
);

// ---------- Sidebar ----------
const Sidebar = ({ items, logo, className }: SidebarProps) => {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <>
      {/* ========== DESKTOP SIDEBAR ========== */}
      <aside
        className={`hidden md:flex flex-col max-h-full bg-white dark:bg-gray-900 border-e border-gray-200 dark:border-gray-800 p-5 rounded-xl transition-all duration-300 ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${className || ''}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          {logo && <div className={`${isCollapsed ? 'hidden' : 'block'}`}>{logo}</div>}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {/* Show opposite direction of current state */}
            {isCollapsed ? <ChevronIcon direction="right" /> : <ChevronIcon direction="left" />}
          </button>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 flex flex-col gap-1">
          {items.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`group flex items-center gap-3 p-3 rounded-xl transition-colors relative ${
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                } ${isCollapsed ? 'justify-center' : ''}`}
                title={isCollapsed ? item.label : undefined}
                aria-current={isActive ? 'page' : undefined}
              >
                {/* Icon */}
                <span className="text-xl shrink-0">{item.icon}</span>

                {/* Label */}
                {!isCollapsed && (
                  <span className="text-sm whitespace-nowrap">{item.label}</span>
                )}

                {/* Badge */}
                {item.badge != null && (
                  <>
                    {!isCollapsed ? (
                      <span className="ms-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    ) : (
                      <span className="absolute -top-1 -inset-e-1 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}

                {/* Active indicator (collapsed mode) – RTL aware */}
                {isActive && isCollapsed && (
                  <span className="absolute inset-s-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-e-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User section (placeholder) */}
        <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3 p-3">
            <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-700" />
            {!isCollapsed && (
              <div className="text-sm">
                <p className="font-medium text-gray-900 dark:text-white">User</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">user@example.com</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ========== MOBILE BOTTOM NAVIGATION ========== */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-2 py-2 flex justify-around items-end safe-bottom">
        {items.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-0.5 relative min-w-16 transition-all ${
                isActive ? 'text-primary' : 'text-gray-500 dark:text-gray-400'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              {/* Dynamic Island Pill */}
              <div
                className={`relative flex items-center justify-center w-12 h-8 rounded-full transition-all duration-300 ${
                  isActive
                    ? '-mt-6 bg-primary shadow-lg shadow-primary/30 scale-110'
                    : ''
                }`}
              >
                <span className="text-lg z-10">{item.icon}</span>
                {item.badge != null && (
                  <span className="absolute -top-1 -inset-e-1 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full z-20">
                    {item.badge}
                  </span>
                )}
              </div>

              <span
                className={`text-[10px] font-medium leading-tight ${
                  isActive ? 'text-primary' : ''
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
};

export default Sidebar;