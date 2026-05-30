import { createBrowserRouter } from "react-router";
import App from "../App";
import Dashboard from "./Dashboard";
import Auth from "./Auth";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: App,  // Use Component instead of element when possible
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: "*",
        element: <div>404 - Page Not Found</div>,  // Catch-all for undefined routes
      },
    ],
  },
  {
    path:"auth",
    element: <Auth/>
  }
]);