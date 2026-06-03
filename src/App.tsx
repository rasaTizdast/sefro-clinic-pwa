import { Outlet } from "react-router";
import Sidebar, { type SidebarItem } from "./components/Sidebar";
import { PiChartPieSliceDuotone } from "react-icons/pi";
import { BiBell, BiHome } from "react-icons/bi";
import { CiMoneyBill, CiSettings } from "react-icons/ci";
import { FcServices } from "react-icons/fc";
import { MdPalette } from "react-icons/md";
import { FaWarehouse } from "react-icons/fa";
import { IoAnalytics } from "react-icons/io5";

const items: SidebarItem[] = [
  { label: 'داشبورد', icon: <BiHome />, path: '/', group:"primary" },
  { label: 'مراجعین', icon: <PiChartPieSliceDuotone />, path: '/patients', group:"primary" },
  { label: 'حسابداری', icon: <CiMoneyBill />, path: '/accounting', group:"primary" },
  { label: 'تقویم کلینیک', icon: <BiBell />, path: '/calendar', group:"primary" },
  { label: 'خدمات', icon: <FcServices />, path: '/services', group:"primary" },
  { label: 'گزارش‌ها', icon: <IoAnalytics />, path: '/analytics', group:"primary" },
  { label: 'مدیریت انبار', icon: <FaWarehouse />, path: '/warehouse', group:"secondary" },
  { label: 'تنظیمات', icon: <CiSettings />, path: '/settings', group:"secondary" },
  { label: 'سیستم طراحی', icon: <MdPalette />, path: '/design-system', group:"secondary" },
];

function App() {
  return (
    <div className="flex min-h-screen gap-3 p-3 pb-24 md:h-screen md:pb-3">
      <Sidebar items={items} />
      <main className="flex-1 p-4">
        <Outlet />
      </main>
    </div>
  );
}

export default App;
