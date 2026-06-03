import { createBrowserRouter } from "react-router";
import App from "../App";
import Dashboard from "./Dashboard";
import Auth from "./Auth";
import Patients from "./Patients";
import Calendar from "./Calendar";
import Services from "./Services";
import Warehouse from "./Warehouse";
import Accounting from "./Accounting";
import Analytics from "./Analytics";
import Settings from "./Settings";
import DesignSystem from "./DesignSystem";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: App,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "patients", element: <Patients /> },
      { path: "calendar", element: <Calendar /> },
      { path: "services", element: <Services /> },
      { path: "warehouse", element: <Warehouse /> },
      { path: "accounting", element: <Accounting /> },
      { path: "analytics", element: <Analytics /> },
      { path: "settings", element: <Settings /> },
      { path: "design-system", element: <DesignSystem /> },
      { path: "*", element: <div className="flex items-center justify-center h-64 text-surface-500 text-lg">صفحه مورد نظر یافت نشد</div> },
    ],
  },
  {
    path: "auth",
    element: <Auth />,
  },
]);
