import { Outlet } from "react-router";
import Sidebar, { type SidebarItem } from "./components/Sidebar";
import { PiChartPieSliceDuotone } from "react-icons/pi";
import { BiBell, BiHome } from "react-icons/bi";
import { FiSettings } from "react-icons/fi";

const items: SidebarItem[] = [
  { label: 'Home', icon: <BiHome />, path: '/' },
  { label: 'Dashboard', icon: <PiChartPieSliceDuotone />, path: '/dashboard', badge: 3 },
  { label: 'Notifications', icon: <BiBell />, path: '/notifications', badge: '99+' },
  { label: 'Settings', icon: <FiSettings />, path: '/settings' },
];

function App() {
  return (
    <div className="flex gap-3 p-3 h-screen">
    <Sidebar items={items}/>
      <main>
        <Outlet />
      </main>
    </div>
  );
}

export default App;