import {
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { Link, useLocation } from 'react-router';

type SidebarItemGroup = 'primary' | 'secondary';

export interface SidebarItem {
  label: string;
  icon: ReactNode;
  path: string;
  group?: SidebarItemGroup;
}

interface SidebarProps {
  items: SidebarItem[];
  className?: string;
}

interface SidebarSection {
  group: SidebarItemGroup;
  label: string;
  items: SidebarItem[];
}

const groupLabels: Record<SidebarItemGroup, string> = {
  primary: 'صفحه‌های اصلی',
  secondary: 'مدیریت',
};

const ChevronIcon = ({ direction }: { direction: 'left' | 'right' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className="size-5 transition-transform rtl:rotate-180"
    aria-hidden="true"
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

const MoreIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className="size-5"
    aria-hidden="true"
  >
    <path d="M3 10a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM8.5 10a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM14 10a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" />
  </svg>
);

const CloseIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className="size-5"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M4.22 4.22a.75.75 0 011.06 0L10 8.94l4.72-4.72a.75.75 0 111.06 1.06L11.06 10l4.72 4.72a.75.75 0 11-1.06 1.06L10 11.06l-4.72 4.72a.75.75 0 01-1.06-1.06L8.94 10 4.22 5.28a.75.75 0 010-1.06z"
      clipRule="evenodd"
    />
  </svg>
);

const getGroupedItems = (items: SidebarItem[]): SidebarSection[] => {
  const sectionItems: Record<SidebarItemGroup, SidebarItem[]> = {
    primary: [],
    secondary: [],
  };

  for (const item of items) {
    sectionItems[item.group || 'primary'].push(item);
  }

  const sections: SidebarSection[] = [];

  for (const group of Object.keys(groupLabels) as SidebarItemGroup[]) {
    if (sectionItems[group].length > 0) {
      sections.push({
        group,
        label: groupLabels[group],
        items: sectionItems[group],
      });
    }
  }

  return sections;
};

const DesktopNavItem = ({
  item,
  isActive,
  isCollapsed,
}: {
  item: SidebarItem;
  isActive: boolean;
  isCollapsed: boolean;
}) => (
  <Link
    to={item.path}
    className={`group relative flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm outline-none transition-all focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 ${
      isActive
        ? 'bg-primary/10 text-primary shadow-sm'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-950'
    } ${isCollapsed ? 'justify-center' : ''}`}
    aria-current={isActive ? 'page' : undefined}
    aria-label={isCollapsed ? item.label : undefined}
  >
    <span className="grid size-6 shrink-0 place-items-center text-xl">
      {item.icon}
    </span>

    {!isCollapsed && (
      <span className="min-w-0 flex-1 truncate font-medium">{item.label}</span>
    )}

    {isActive && isCollapsed && (
      <span className="absolute inset-s-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-e-full bg-primary" />
    )}

    {isCollapsed && (
      <span className="pointer-events-none absolute inset-s-[calc(100%+0.75rem)] top-1/2 z-30 -translate-y-1/2 whitespace-nowrap rounded-lg bg-gray-950 px-3 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        {item.label}
      </span>
    )}
  </Link>
);

const SheetNavItem = ({
  item,
  isActive,
  onNavigate,
}: {
  item: SidebarItem;
  isActive: boolean;
  onNavigate: () => void;
}) => (
  <Link
    to={item.path}
    onClick={onNavigate}
    className={`flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 ${
      isActive
        ? 'bg-primary/10 text-primary'
        : 'text-gray-700 hover:bg-gray-100'
    }`}
    aria-current={isActive ? 'page' : undefined}
  >
    <span className="grid size-7 shrink-0 place-items-center text-xl">
      {item.icon}
    </span>
    <span>{item.label}</span>
  </Link>
);

const DesktopSidebar = ({
  sections,
  className,
}: {
  sections: SidebarSection[];
  className?: string;
}) => {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={`sticky top-3 hidden h-[calc(100vh-1.5rem)] flex-col overflow-visible rounded-2xl border border-gray-200 bg-white/95 p-4 shadow-sm backdrop-blur transition-all duration-300 md:flex ${
        isCollapsed ? 'w-20' : 'w-64'
      } ${className || ''}`}
    >
      <div className="mb-6 flex items-center justify-between gap-3">
        {!isCollapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-950">
              Clinic Manager
            </p>
            <p className="truncate text-xs text-gray-500">Workspace</p>
          </div>
        )}
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="grid size-10 shrink-0 place-items-center rounded-xl text-gray-600 outline-none transition-colors hover:bg-gray-100 hover:text-gray-950 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronIcon direction="right" />
          ) : (
            <ChevronIcon direction="left" />
          )}
        </button>
      </div>

      <nav
        className="flex flex-1 flex-col gap-4 overflow-visible"
        aria-label="Main navigation"
      >
        {sections.map((section, index) => (
          <div
            key={section.group}
            className={`flex flex-col gap-1.5 ${
              index > 0 ? 'border-t border-gray-100 pt-4' : ''
            }`}
          >
            {!isCollapsed && (
              <p className="px-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                {section.label}
              </p>
            )}
            {section.items.map((item) => (
              <DesktopNavItem
                key={item.path}
                item={item}
                isActive={location.pathname === item.path}
                isCollapsed={isCollapsed}
              />
            ))}
          </div>
        ))}
      </nav>

      <div className="mt-4 border-t border-gray-100 pt-4">
        <div
          className={`flex min-h-12 items-center gap-3 rounded-xl px-3 ${
            isCollapsed ? 'justify-center px-0' : ''
          }`}
        >
          <div className="size-9 shrink-0 rounded-full bg-gray-200 ring-1 ring-gray-300" />
          {!isCollapsed && (
            <div className="min-w-0 text-sm">
              <p className="truncate font-medium text-gray-900">User</p>
              <p className="truncate text-xs text-gray-500">
                user@example.com
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

const MobileBottomItem = ({
  item,
  isActive,
}: {
  item: SidebarItem;
  isActive: boolean;
}) => (
  <Link
    to={item.path}
    className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 ${
      isActive
        ? 'bg-primary/10 text-primary'
        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
    }`}
    aria-current={isActive ? 'page' : undefined}
    aria-label={item.label}
  >
    <span className="grid size-6 place-items-center text-xl">{item.icon}</span>
    <span className="max-w-full truncate">{item.label}</span>
  </Link>
);

const MobileMoreSheet = ({
  sections,
  dragOffset,
  isDragging,
  dialogRef,
  onClose,
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  sections: SidebarSection[];
  dragOffset: number;
  isDragging: boolean;
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  onClose: () => void;
  onDragStart: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onDragMove: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onDragEnd: (event: ReactPointerEvent<HTMLButtonElement>) => void;
}) => {
  const location = useLocation();

  return (
    <dialog
      ref={dialogRef}
      className="m-0 h-dvh max-h-none w-dvw max-w-none border-0 bg-transparent p-0 backdrop:bg-gray-950/35 md:hidden"
      aria-labelledby="mobile-sidebar-title"
      onClose={onClose}
    >
      <div className="fixed inset-0 z-50">
        <button
          type="button"
          className="absolute inset-0 h-full w-full cursor-default bg-gray-950/35"
          onClick={onClose}
          aria-label="Close navigation menu"
        />

        <div
          id="mobile-sidebar-more"
          className={`absolute inset-x-0 bottom-0 rounded-t-3xl bg-white px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 shadow-2xl ${
            isDragging ? '' : 'transition-transform duration-200 ease-out'
          }`}
          style={{ transform: `translateY(${dragOffset}px)` }}
        >
          <button
            type="button"
            className="mx-auto mb-3 flex h-7 w-24 touch-none items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            onPointerDown={onDragStart}
            onPointerMove={onDragMove}
            onPointerUp={onDragEnd}
            onPointerCancel={onDragEnd}
            aria-label="Drag down to close navigation menu"
          >
            <span className="h-1.5 w-12 rounded-full bg-gray-200" />
          </button>

          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2
                id="mobile-sidebar-title"
                className="text-base font-semibold text-gray-950"
              >
                Navigation
              </h2>
              <p className="text-xs text-gray-500">All clinic sections</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid size-10 place-items-center rounded-xl text-gray-600 outline-none transition-colors hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-primary/40"
              aria-label="Close navigation menu"
            >
              <CloseIcon />
            </button>
          </div>

          <div className="flex max-h-[65vh] flex-col gap-4 overflow-y-auto pb-2">
            {sections.map((section, index) => (
              <div
                key={section.group}
                className={`flex flex-col gap-1.5 ${
                  index > 0 ? 'border-t border-gray-100 pt-4' : ''
                }`}
              >
                <p className="px-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  {section.label}
                </p>
                {section.items.map((item) => (
                  <SheetNavItem
                    key={item.path}
                    item={item}
                    isActive={location.pathname === item.path}
                    onNavigate={onClose}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </dialog>
  );
};

const MobileNavigation = ({ sections }: { sections: SidebarSection[] }) => {
  const location = useLocation();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [sheetDragOffset, setSheetDragOffset] = useState(0);
  const [isDraggingSheet, setIsDraggingSheet] = useState(false);
  const moreDialogRef = useRef<HTMLDialogElement>(null);
  const dragStartYRef = useRef<number | null>(null);
  const dragOffsetRef = useRef(0);
  const primaryItems =
    sections.find((section) => section.group === 'primary')?.items ?? [];
  const bottomItems = primaryItems.slice(0, 4);
  const bottomItemPaths = new Set(bottomItems.map((item) => item.path));
  const isMoreActive = sections.some((section) =>
    section.items.some(
      (item) =>
        !bottomItemPaths.has(item.path) && location.pathname === item.path,
    ),
  );

  const openMoreMenu = () => {
    setIsMoreOpen(true);
    setSheetDragOffset(0);
    setIsDraggingSheet(false);
    dragOffsetRef.current = 0;
    const dialog = moreDialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  };

  const closeMoreMenu = () => {
    setIsMoreOpen(false);
    setSheetDragOffset(0);
    setIsDraggingSheet(false);
    dragStartYRef.current = null;
    dragOffsetRef.current = 0;
    const dialog = moreDialogRef.current;
    if (dialog?.open) {
      dialog.close();
    }
  };

  const handleSheetDragStart = (
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    dragStartYRef.current = event.clientY;
    dragOffsetRef.current = 0;
    setSheetDragOffset(0);
    setIsDraggingSheet(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleSheetDragMove = (
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    if (dragStartYRef.current == null) return;

    const nextOffset = Math.max(0, event.clientY - dragStartYRef.current);
    dragOffsetRef.current = nextOffset;
    setSheetDragOffset(nextOffset);
  };

  const handleSheetDragEnd = (
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    if (dragStartYRef.current == null) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const shouldClose = dragOffsetRef.current > 80;
    dragStartYRef.current = null;
    dragOffsetRef.current = 0;
    setIsDraggingSheet(false);

    if (shouldClose) {
      closeMoreMenu();
      return;
    }

    setSheetDragOffset(0);
  };

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur md:hidden"
        aria-label="Mobile navigation"
      >
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {bottomItems.map((item) => (
            <MobileBottomItem
              key={item.path}
              item={item}
              isActive={location.pathname === item.path}
            />
          ))}

          <button
            type="button"
            onClick={openMoreMenu}
            className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 ${
              isMoreActive || isMoreOpen
                ? 'bg-primary/10 text-primary'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
            }`}
            aria-label="Open more navigation items"
            aria-expanded={isMoreOpen}
            aria-controls="mobile-sidebar-more"
          >
            <span className="grid size-6 place-items-center">
              <MoreIcon />
            </span>
            <span>More</span>
          </button>
        </div>
      </nav>

      <MobileMoreSheet
        sections={sections}
        dragOffset={sheetDragOffset}
        isDragging={isDraggingSheet}
        dialogRef={moreDialogRef}
        onClose={closeMoreMenu}
        onDragStart={handleSheetDragStart}
        onDragMove={handleSheetDragMove}
        onDragEnd={handleSheetDragEnd}
      />
    </>
  );
};

const Sidebar = ({ items, className }: SidebarProps) => {
  const sections = getGroupedItems(items);

  return (
    <>
      <DesktopSidebar sections={sections} className={className} />
      <MobileNavigation sections={sections} />
    </>
  );
};

export default Sidebar;
