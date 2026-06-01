import { Outlet } from "react-router";
import Sidebar, { type SidebarItem } from "./components/Sidebar";
import { PiChartPieSliceDuotone } from "react-icons/pi";
import { BiBell, BiHome } from "react-icons/bi";
import { CiMoneyBill, CiSettings } from "react-icons/ci";
import { FcServices } from "react-icons/fc";
import { FaWarehouse } from "react-icons/fa";
import { IoAnalytics } from "react-icons/io5";

const items: SidebarItem[] = [
  { label: 'داشبورد', icon: <BiHome />, path: '/' },
  { label: 'مراجعین', icon: <PiChartPieSliceDuotone />, path: '/patients' },
  { label: 'حسابداری', icon: <CiMoneyBill />, path: '/Accounting' },
  { label: 'تقویم کلینیک', icon: <BiBell />, path: '/calendar' },
  { label: 'خدمات', icon: <FcServices />, path: '/services' },
  { label: 'مدیریت انبار', icon: <FaWarehouse />, path: '/Warehouse' },
  { label: 'گزارش‌ها', icon: <IoAnalytics />, path: '/analytics' },
  { label: 'تنظیمات', icon: <CiSettings />, path: '/settings' },
];

function App() {
  return (
    <div className="flex min-h-screen gap-3 p-3 pb-24 md:h-screen md:pb-3">
      <Sidebar items={items} />
      <main className="min-w-0 flex-1 overflow-auto rounded-2xl bg-white/70 p-4">
        <Outlet />
      </main>
    </div>
  );
}

export default App;
