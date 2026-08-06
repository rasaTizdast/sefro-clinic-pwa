import { BiHome } from "react-icons/bi";
import { CiMoneyBill, CiSettings } from "react-icons/ci";
import { FaRegCalendarAlt, FaWarehouse } from "react-icons/fa";
import { IoAnalytics } from "react-icons/io5";
import { MdHistory, MdMedicalServices, MdPalette } from "react-icons/md";
import { PiChartPieSliceDuotone } from "react-icons/pi";
import { Outlet } from "react-router";

import { CommandPalette } from "./components/CommandPalette";
import { PwaUpdater } from "./components/PwaUpdater";
import { QuickActionProvider } from "./components/QuickActionProvider";
import Sidebar from "./components/Sidebar";
import { LoadingBar } from "./components/ui/LoadingBar";
import { WalkthroughButton } from "./components/walkthrough/WalkthroughButton";
import { CommandPaletteContext } from "./contexts/commandPalette";
import { useCommandPalette } from "./hooks/useCommandPalette";
import { usePermissions } from "./hooks/usePermissions";
import type { SidebarItem } from "./types/sidebar";

const items: SidebarItem[] = [
  { label: "داشبورد", icon: <BiHome />, path: "/", group: "primary" },
  { label: "مراجعین", icon: <PiChartPieSliceDuotone />, path: "/patients", group: "primary" },
  { label: "حسابداری", icon: <CiMoneyBill />, path: "/accounting", group: "primary" },
  { label: "تقویم کلینیک", icon: <FaRegCalendarAlt />, path: "/calendar", group: "primary" },
  { label: "خدمات", icon: <MdMedicalServices />, path: "/services", group: "primary" },
  { label: "گزارش‌ها", icon: <IoAnalytics />, path: "/analytics", group: "primary" },
  { label: "مدیریت انبار", icon: <FaWarehouse />, path: "/warehouse", group: "secondary" },
  { label: "تنظیمات", icon: <CiSettings />, path: "/settings", group: "secondary" },
  { label: "سیستم طراحی", icon: <MdPalette />, path: "/design-system", group: "secondary" },
  { label: "لاگ سیستم", icon: <MdHistory />, path: "/logs", group: "secondary" },
];

function AppContent() {
  const { open, setOpen } = useCommandPalette();
  const { canViewLogs } = usePermissions();
  const visibleItems = canViewLogs ? items : items.filter((i) => i.path !== "/logs");

  return (
    <CommandPaletteContext.Provider value={{ open, setOpen }}>
      <div className="flex h-screen gap-3 overflow-hidden p-2 pb-24 md:p-3 md:pb-3">
        <PwaUpdater />
        <LoadingBar />
        <Sidebar items={visibleItems} />
        <main className="scrollable-content flex-1 p-1 md:p-3">
          <Outlet />
        </main>
        <CommandPalette open={open} onClose={() => setOpen(false)} />
        <WalkthroughButton />
      </div>
    </CommandPaletteContext.Provider>
  );
}

function App() {
  return (
    <QuickActionProvider>
      <AppContent />
    </QuickActionProvider>
  );
}

export default App;
