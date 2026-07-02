import { AnimatePresence, motion } from "motion/react";
import { type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";
import { BiExit } from "react-icons/bi";
import { Link, useLocation } from "react-router";

import { useAuth } from "../contexts/AuthContext";
import { useLogout } from "../hooks/api/useAuthQuery";
import { useWalkthrough } from "../hooks/useWalkthrough";
import type { SidebarItem, SidebarItemGroup, SidebarSection } from "../types/sidebar";
import { Avatar } from "./ui/Avatar";

interface SidebarProps {
  items: SidebarItem[];
  className?: string;
}

const groupLabels: Record<SidebarItemGroup, string> = {
  primary: "صفحه‌های اصلی",
  secondary: "مدیریت",
};

const ChevronIcon = ({ direction }: { direction: "left" | "right" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className="size-5 transition-transform rtl:rotate-180"
    aria-hidden="true"
  >
    {direction === "left" ? (
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
    sectionItems[item.group!].push(item);
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
  onWalkthrough,
}: {
  item: SidebarItem;
  isActive: boolean;
  isCollapsed: boolean;
  onWalkthrough?: () => void;
}) => {
  const content = (
    <>
      <span className="grid size-6 shrink-0 place-items-center text-xl">{item.icon}</span>

      <AnimatePresence mode="wait">
        {!isCollapsed && (
          <motion.span
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10, scale: 0.95 }}
            transition={{ duration: 0.08 }}
            className="min-w-0 flex-1 truncate font-medium"
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>

      {isCollapsed && (
        <span className="bg-surface-900 pointer-events-none absolute inset-s-[calc(100%+0.75rem)] top-1/2 z-30 -translate-y-1/2 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          {item.label}
        </span>
      )}
    </>
  );

  if (item.isWalkthrough) {
    return (
      <motion.div
        layout
        whileHover={isCollapsed ? undefined : { scale: 1.03 }}
        whileTap={isCollapsed ? undefined : { scale: 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
      >
        <button
          type="button"
          onClick={onWalkthrough}
          className={`group focus-visible:ring-primary-600/80 relative flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
            isActive
              ? "bg-primary-200 text-primary-900 hover:bg-primary-300 shadow-sm"
              : "text-surface-500 hover:bg-primary-100 hover:text-primary-800"
          } ${isCollapsed ? "justify-center" : ""}`}
          aria-label={isCollapsed ? item.label : undefined}
        >
          {content}
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      whileHover={isCollapsed ? undefined : { scale: 1.03 }}
      whileTap={isCollapsed ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
    >
      <Link
        to={item.path}
        className={`group focus-visible:ring-primary-600/80 relative flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
          isActive
            ? "bg-primary-200 text-primary-900 hover:bg-primary-300 shadow-sm"
            : "text-surface-500 hover:bg-primary-100 hover:text-primary-800"
        } ${isCollapsed ? "justify-center" : ""}`}
        aria-current={isActive ? "page" : undefined}
        aria-label={isCollapsed ? item.label : undefined}
      >
        {content}
      </Link>
    </motion.div>
  );
};

const SheetNavItem = ({
  item,
  isActive,
  onNavigate,
  onWalkthrough,
}: {
  item: SidebarItem;
  isActive: boolean;
  onNavigate: () => void;
  onWalkthrough?: () => void;
}) => {
  const handleClick = item.isWalkthrough ? onWalkthrough : onNavigate;

  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
    >
      {item.isWalkthrough ? (
        <button
          type="button"
          onClick={handleClick}
          className={`focus-visible:ring-primary-600/40 flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-2 ${
            isActive ? "bg-primary-600/10 text-primary-700" : "text-surface-600 hover:bg-primary-50"
          }`}
        >
          <span className="grid size-7 shrink-0 place-items-center text-xl">{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ) : (
        <Link
          to={item.path}
          onClick={onNavigate}
          className={`focus-visible:ring-primary-600/40 flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-2 ${
            isActive ? "bg-primary-600/10 text-primary-700" : "text-surface-600 hover:bg-primary-50"
          }`}
          aria-current={isActive ? "page" : undefined}
        >
          <span className="grid size-7 shrink-0 place-items-center text-xl">{item.icon}</span>
          <span>{item.label}</span>
        </Link>
      )}
    </motion.div>
  );
};

const DesktopSidebar = ({
  sections,
  className,
}: {
  sections: SidebarSection[];
  className?: string;
}) => {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem("sidebar-collapsed") === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("sidebar-collapsed", String(isCollapsed));
    } catch {
      /* empty */
    }
  }, [isCollapsed]);

  const { user } = useAuth();
  const logoutMutation = useLogout();
  const { startWalkthrough } = useWalkthrough();

  const displayName = user?.username ?? "کاربر";
  const subtitle =
    user?.role === "admin" ? "مدیر سیستم" : user?.role === "employee" ? "کارمند" : "";

  return (
    <motion.aside
      animate={{ width: isCollapsed ? 80 : 256 }}
      transition={{ type: "spring", stiffness: 250, damping: 25, mass: 0.8 }}
      className={`border-primary-200 bg-primary-50/80 sticky top-3 hidden h-[calc(100vh-1.5rem)] flex-col overflow-visible rounded-2xl border p-4 shadow-sm backdrop-blur md:flex ${className || ""}`}
    >
      <div
        className={`mb-6 flex items-center ${isCollapsed ? "justify-center" : "justify-between gap-3"}`}
      >
        <div className="flex items-center gap-2.5">
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -8, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -8, scale: 0.9 }}
                transition={{ duration: 0.08 }}
                className="bg-primary-600 grid size-9 shrink-0 place-items-center rounded-xl text-sm font-bold text-white shadow-sm"
              >
                S
              </motion.span>
            )}
          </AnimatePresence>
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.p
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8, scale: 0.95 }}
                transition={{ duration: 0.08 }}
                className="text-surface-800 truncate text-sm font-semibold"
              >
                کلینیک سفرو
              </motion.p>
            )}
          </AnimatePresence>
        </div>
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-surface-500 hover:bg-surface-100 hover:text-surface-800 focus-visible:ring-primary-600/40 grid size-9 shrink-0 cursor-pointer place-items-center rounded-xl transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          aria-label={isCollapsed ? "باز کردن منو" : "بستن منو"}
        >
          <ChevronIcon direction={isCollapsed ? "right" : "left"} />
        </button>
      </div>

      <nav
        className="flex flex-1 flex-col gap-4 overflow-visible"
        aria-label="منوی اصلی"
        data-tour="sidebar-nav"
      >
        {sections.map((section, index) => (
          <div
            key={section.group}
            className={`flex flex-col gap-1.5 ${
              index > 0 ? "border-surface-200/60 border-t pt-4" : ""
            }`}
          >
            <AnimatePresence mode="wait">
              {!isCollapsed && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6, scale: 0.95 }}
                  transition={{ duration: 0.06 }}
                  className="text-surface-400 px-3 text-[11px] font-semibold tracking-wide uppercase"
                >
                  {section.label}
                </motion.p>
              )}
            </AnimatePresence>
            {section.items.map((item) => (
              <DesktopNavItem
                key={item.path}
                item={item}
                isActive={!item.isWalkthrough && location.pathname === item.path}
                isCollapsed={isCollapsed}
                onWalkthrough={startWalkthrough}
              />
            ))}
          </div>
        ))}
      </nav>

      <div className="border-surface-200/60 mt-4 border-t pt-4">
        <div
          className={`flex items-center gap-3 rounded-xl px-3 py-2 ${
            isCollapsed ? "flex-col justify-center px-0" : ""
          }`}
        >
          <Avatar size={isCollapsed ? "sm" : "md"} name={displayName} />
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.08 }}
                className="min-w-0 flex-1 text-sm"
              >
                <p className="text-surface-800 truncate font-medium">{displayName}</p>
                {subtitle && <p className="text-surface-500 truncate text-xs">{subtitle}</p>}
              </motion.div>
            )}
          </AnimatePresence>
          <button
            type="button"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            className="text-surface-400 hover:bg-danger-50 hover:text-danger-600 focus-visible:ring-danger-600/40 grid size-9 shrink-0 cursor-pointer place-items-center rounded-xl transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="خروج از سیستم"
            title="خروج از سیستم"
          >
            {logoutMutation.isPending ? (
              <svg
                className="size-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            ) : (
              <BiExit className="size-5" />
            )}
          </button>
        </div>
      </div>
    </motion.aside>
  );
};

const MobileBottomItem = ({ item, isActive }: { item: SidebarItem; isActive: boolean }) => (
  <motion.div
    whileTap={{ scale: 0.93 }}
    transition={{ type: "spring", stiffness: 400, damping: 20 }}
  >
    <Link
      to={item.path}
      className={`focus-visible:ring-primary-600/40 flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-medium transition-colors outline-none focus-visible:ring-2 ${
        isActive
          ? "bg-primary-600/10 text-primary-700"
          : "text-surface-400 hover:bg-primary-100 hover:text-primary-700"
      }`}
      aria-current={isActive ? "page" : undefined}
      aria-label={item.label}
    >
      <span className="grid size-6 place-items-center text-xl">{item.icon}</span>
      <span className="max-w-full truncate">{item.label}</span>
    </Link>
  </motion.div>
);

const MobileMoreSheet = ({
  sections,
  isOpen,
  dialogRef,
  onClose,
}: {
  sections: SidebarSection[];
  isOpen: boolean;
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  onClose: () => void;
}) => {
  const location = useLocation();
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartYRef = useRef<number | null>(null);
  const dragOffsetRef = useRef(0);
  const logoutMutation = useLogout();
  const { startWalkthrough: startMobileWalkthrough } = useWalkthrough();

  const handleLogout = () => {
    logoutMutation.mutate();
    onClose();
  };

  const handleSheetDragStart = (event: ReactPointerEvent<HTMLButtonElement>) => {
    dragStartYRef.current = event.clientY;
    dragOffsetRef.current = 0;
    setDragOffset(0);
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleSheetDragMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (dragStartYRef.current == null) return;
    const nextOffset = Math.max(0, event.clientY - dragStartYRef.current);
    dragOffsetRef.current = nextOffset;
    setDragOffset(nextOffset);
  };

  const handleSheetDragEnd = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (dragStartYRef.current == null) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const shouldClose = dragOffsetRef.current > 80;
    dragStartYRef.current = null;
    dragOffsetRef.current = 0;
    setIsDragging(false);
    setDragOffset(0);
    if (shouldClose) {
      onClose();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="backdrop:bg-surface-900/35 m-0 h-dvh max-h-none w-dvw max-w-none border-0 bg-transparent p-0 md:hidden"
      aria-labelledby="mobile-sidebar-title"
      onClose={onClose}
    >
      <div className="fixed inset-0 z-50">
        <motion.button
          type="button"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-surface-900/35 absolute inset-0 h-full w-full cursor-default"
          onClick={onClose}
          aria-label="بستن منوی ناوبری"
        />

        <motion.div
          id="mobile-sidebar-more"
          animate={{ y: isDragging ? dragOffset : isOpen ? 0 : "100%" }}
          transition={
            isDragging
              ? { type: "tween", duration: 0 }
              : { type: "spring", damping: 30, stiffness: 300 }
          }
          className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-2xl"
        >
          <button
            type="button"
            className="focus-visible:ring-primary-600/40 mx-auto mb-3 flex h-7 w-24 cursor-pointer touch-none items-center justify-center rounded-full outline-none focus-visible:ring-2"
            onPointerDown={handleSheetDragStart}
            onPointerMove={handleSheetDragMove}
            onPointerUp={handleSheetDragEnd}
            onPointerCancel={handleSheetDragEnd}
            aria-label="بکشید تا بسته شود"
          >
            <span className="bg-surface-200 h-1.5 w-12 rounded-full" />
          </button>

          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 id="mobile-sidebar-title" className="text-surface-900 text-base font-semibold">
                همه بخش‌ها
              </h2>
              <p className="text-surface-500 text-xs">دسترسی سریع به تمام بخش‌های کلینیک</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-surface-500 hover:bg-surface-100 focus-visible:ring-primary-600/40 grid size-10 cursor-pointer place-items-center rounded-xl transition-colors outline-none focus-visible:ring-2"
              aria-label="بستن منو"
            >
              <CloseIcon />
            </button>
          </div>

          <div className="flex max-h-[65vh] flex-col gap-4 overflow-y-auto pb-2">
            {sections.map((section, index) => (
              <div
                key={section.group}
                className={`flex flex-col gap-1.5 ${
                  index > 0 ? "border-surface-100 border-t pt-4" : ""
                }`}
              >
                <p className="text-surface-400 px-3 text-[11px] font-semibold tracking-wide uppercase">
                  {section.label}
                </p>
                {section.items.map((item) => (
                  <SheetNavItem
                    key={item.path}
                    item={item}
                    isActive={!item.isWalkthrough && location.pathname === item.path}
                    onNavigate={onClose}
                    onWalkthrough={startMobileWalkthrough}
                  />
                ))}
              </div>
            ))}
          </div>

          <div className="border-surface-100 mt-2 border-t pt-3">
            <button
              type="button"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              className="focus-visible:ring-danger-600/40 text-danger-600 hover:bg-danger-50 flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="grid size-7 shrink-0 place-items-center text-xl">
                {logoutMutation.isPending ? (
                  <svg
                    className="size-5 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                ) : (
                  <BiExit />
                )}
              </span>
              <span>خروج از سیستم</span>
            </button>
          </div>
        </motion.div>
      </div>
    </dialog>
  );
};

const MobileNavigation = ({ sections }: { sections: SidebarSection[] }) => {
  const location = useLocation();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const moreDialogRef = useRef<HTMLDialogElement>(null);
  const primaryItems = sections.find((section) => section.group === "primary")?.items ?? [];
  const bottomItems = primaryItems.slice(0, 4);
  const bottomItemPaths = new Set(bottomItems.map((item) => item.path));
  const isMoreActive = sections.some((section) =>
    section.items.some((item) => !bottomItemPaths.has(item.path) && location.pathname === item.path)
  );

  const openMoreMenu = () => {
    setIsMoreOpen(true);
    const dialog = moreDialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  };

  const closeMoreMenu = () => {
    setIsMoreOpen(false);
    setTimeout(() => {
      const dialog = moreDialogRef.current;
      if (dialog?.open) {
        dialog.close();
      }
    }, 250);
  };

  return (
    <>
      <nav
        className="border-surface-200 fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 px-2 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur md:hidden"
        aria-label="ناوبری موبایل"
      >
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {bottomItems.map((item) => (
            <MobileBottomItem
              key={item.path}
              item={item}
              isActive={location.pathname === item.path}
            />
          ))}

          <motion.button
            type="button"
            onClick={openMoreMenu}
            whileTap={{ scale: 0.93 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className={`focus-visible:ring-primary-600/40 flex min-h-14 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-medium transition-colors outline-none focus-visible:ring-2 ${
              isMoreActive || isMoreOpen
                ? "bg-primary-600/10 text-primary-700"
                : "text-surface-400 hover:bg-primary-100 hover:text-primary-700"
            }`}
            aria-label="نمایش بقیه بخش‌ها"
            aria-expanded={isMoreOpen}
            aria-controls="mobile-sidebar-more"
          >
            <span className="grid size-6 place-items-center">
              <MoreIcon />
            </span>
            <span>بیشتر</span>
          </motion.button>
        </div>
      </nav>

      <MobileMoreSheet
        sections={sections}
        isOpen={isMoreOpen}
        dialogRef={moreDialogRef}
        onClose={closeMoreMenu}
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
