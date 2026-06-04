import { BiBell, BiHome } from "react-icons/bi";
import { CiMoneyBill, CiSettings } from "react-icons/ci";
import { FaWarehouse } from "react-icons/fa";
import { FcServices } from "react-icons/fc";
import { IoAnalytics } from "react-icons/io5";
import { MdPalette } from "react-icons/md";
import { PiChartPieSliceDuotone } from "react-icons/pi";
import { Outlet } from "react-router";

import { CommandPalette } from "./components/CommandPalette";
import { QuickActionProvider } from "./components/QuickActionProvider";
import Sidebar from "./components/Sidebar";
import { LoadingBar } from "./components/ui/LoadingBar";
import { CommandPaletteContext } from "./contexts/commandPalette";
import { useCommandPalette } from "./hooks/useCommandPalette";
import type { SidebarItem } from "./types/sidebar";

const items: SidebarItem[] = [
  { label: "داشبورد", icon: <BiHome />, path: "/", group: "primary" },
  { label: "مراجعین", icon: <PiChartPieSliceDuotone />, path: "/patients", group: "primary" },
  { label: "حسابداری", icon: <CiMoneyBill />, path: "/accounting", group: "primary" },
  { label: "تقویم کلینیک", icon: <BiBell />, path: "/calendar", group: "primary" },
  { label: "خدمات", icon: <FcServices />, path: "/services", group: "primary" },
  { label: "گزارش‌ها", icon: <IoAnalytics />, path: "/analytics", group: "primary" },
  { label: "مدیریت انبار", icon: <FaWarehouse />, path: "/warehouse", group: "secondary" },
  { label: "تنظیمات", icon: <CiSettings />, path: "/settings", group: "secondary" },
  { label: "سیستم طراحی", icon: <MdPalette />, path: "/design-system", group: "secondary" },
];

function AppContent() {
  const { open, setOpen } = useCommandPalette();

  return (
    <CommandPaletteContext.Provider value={{ open, setOpen }}>
      <div className="flex h-screen gap-3 overflow-hidden p-2 pb-24 md:p-3 md:pb-3">
        <LoadingBar />
        <Sidebar items={items} />
        <main className="flex-1 overflow-y-auto p-1 md:p-3">
          <Outlet />
        </main>
        <CommandPalette open={open} onClose={() => setOpen(false)} />
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
