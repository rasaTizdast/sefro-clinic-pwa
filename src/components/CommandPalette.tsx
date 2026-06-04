import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { BiHome, BiSearch } from "react-icons/bi";
import { CiMoneyBill, CiSettings } from "react-icons/ci";
import { FaWarehouse } from "react-icons/fa";
import { FcServices } from "react-icons/fc";
import { IoAnalytics } from "react-icons/io5";
import { MdPalette } from "react-icons/md";
import { PiChartPieSliceDuotone, PiDotsThreeVertical } from "react-icons/pi";
import { useNavigate } from "react-router";

import { useQuickActions } from "../hooks/useQuickActions";

interface NavAction {
  id: string;
  label: string;
  icon: ReactNode;
  path: string;
}

const navActions: NavAction[] = [
  { id: "nav-dashboard", label: "داشبورد", icon: <BiHome />, path: "/" },
  {
    id: "nav-patients",
    label: "لیست بیماران",
    icon: <PiChartPieSliceDuotone />,
    path: "/patients",
  },
  { id: "nav-accounting", label: "حسابداری", icon: <CiMoneyBill />, path: "/accounting" },
  { id: "nav-calendar", label: "تقویم کلینیک", icon: <PiDotsThreeVertical />, path: "/calendar" },
  { id: "nav-services", label: "خدمات", icon: <FcServices />, path: "/services" },
  { id: "nav-analytics", label: "گزارش‌ها", icon: <IoAnalytics />, path: "/analytics" },
  { id: "nav-warehouse", label: "مدیریت انبار", icon: <FaWarehouse />, path: "/warehouse" },
  { id: "nav-settings", label: "تنظیمات", icon: <CiSettings />, path: "/settings" },
  { id: "nav-design-system", label: "سیستم طراحی", icon: <MdPalette />, path: "/design-system" },
];

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { actions } = useQuickActions();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const allActions: { id: string; label: string; icon?: ReactNode; perform: () => void }[] = [
    ...navActions.map((a) => ({
      id: a.id,
      label: a.label,
      icon: a.icon,
      perform: () => {
        navigate(a.path);
        onClose();
      },
    })),
    ...actions.map((a) => ({
      id: a.id,
      label: a.label,
      icon: a.icon,
      perform: () => {
        a.perform();
        onClose();
      },
    })),
  ];

  const filtered = query.trim() ? allActions.filter((a) => a.label.includes(query)) : allActions;

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      setQuery("");
      setSelectedIndex(0);
    } else if (!open && el.open) {
      el.close();
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && filtered[selectedIndex]) {
        e.preventDefault();
        filtered[selectedIndex].perform();
      }
    },
    [filtered, selectedIndex]
  );

  const handleBackdrop = useCallback(
    (e: React.MouseEvent<HTMLDialogElement>) => {
      if (e.target === dialogRef.current) {
        onClose();
      }
    },
    [onClose]
  );

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdrop}
      onClose={onClose}
      className="border-surface-200 m-auto max-h-[70vh] w-[min(32rem,calc(100vw-2rem))] rounded-2xl border bg-white shadow-2xl backdrop:bg-black/40 open:flex open:flex-col"
    >
      <div className="border-surface-200 flex items-center gap-3 border-b px-4 py-3">
        <BiSearch className="text-surface-400 size-5 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedIndex(0);
          }}
          onKeyDown={handleKeyDown}
          placeholder="جستجوی سریع..."
          className="text-surface-900 placeholder:text-surface-400 w-full bg-transparent text-sm outline-none"
          dir="rtl"
        />
        <kbd className="border-surface-200 bg-surface-50 text-surface-400 hidden shrink-0 items-center gap-0.5 rounded-md border px-2 py-0.5 text-[11px] font-medium sm:inline-flex">
          <span className="text-[10px]">⌘</span>K
        </kbd>
      </div>
      <div className="overflow-y-auto p-2">
        {filtered.length === 0 ? (
          <div className="text-surface-400 flex items-center justify-center py-8 text-sm">
            نتیجه‌ای یافت نشد
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {filtered.map((action, index) => (
              <button
                key={action.id}
                type="button"
                onClick={action.perform}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-right text-sm transition-colors outline-none ${
                  index === selectedIndex
                    ? "bg-primary-100 text-primary-800"
                    : "text-surface-700 hover:bg-surface-100"
                }`}
              >
                {action.icon && (
                  <span className="grid size-6 shrink-0 place-items-center text-base">
                    {action.icon}
                  </span>
                )}
                <span className="flex-1 truncate">{action.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </dialog>
  );
}
