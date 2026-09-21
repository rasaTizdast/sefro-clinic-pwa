import { createBrowserRouter, Outlet } from "react-router";

import App from "../App";
import { ErrorFallback, NotFound } from "../components/ui";
import { routePermissions } from "../config/roles";
import { RedirectIfAuth, RequireAuth, RequireRole } from "./RouteGuard";

type LazyModule = { default: React.ComponentType };
const lazyRoute =
  (importFn: () => Promise<LazyModule>) => (): Promise<{ Component: React.ComponentType }> =>
    importFn().then((m) => ({ Component: m.default }));

export const router = createBrowserRouter(
  [
    {
      path: "/",
      Component: App,
      errorElement: <ErrorFallback />,
      children: [
        {
          Component: RequireAuth,
          children: [
            { index: true, lazy: lazyRoute(() => import("./Dashboard")) },
            { path: "wizard", lazy: lazyRoute(() => import("./WizardPage")) },
            { path: "patients", lazy: lazyRoute(() => import("./Patients")) },
            { path: "calendar", lazy: lazyRoute(() => import("./Calendar")) },
            { path: "services", lazy: lazyRoute(() => import("./Services")) },
            { path: "warehouse", lazy: lazyRoute(() => import("./Warehouse")) },
            { path: "accounting", lazy: lazyRoute(() => import("./Accounting")) },
            { path: "analytics", lazy: lazyRoute(() => import("./Analytics")) },
            { path: "settings", lazy: lazyRoute(() => import("./Settings")) },
            ...(import.meta.env.DEV
              ? [{ path: "design-system", lazy: lazyRoute(() => import("./DesignSystem")) }]
              : []),
            {
              path: "logs",
              element: (
                <RequireRole allowedRoles={routePermissions["/logs"]}>
                  <Outlet />
                </RequireRole>
              ),
              children: [{ index: true, lazy: lazyRoute(() => import("./Logs")) }],
            },
            { path: "*", element: <NotFound /> },
          ],
        },
      ],
    },
    {
      path: "auth",
      errorElement: <ErrorFallback />,
      children: [
        {
          Component: RedirectIfAuth,
          children: [{ index: true, lazy: lazyRoute(() => import("./Auth")) }],
        },
      ],
    },
  ],
  { basename: import.meta.env.DEV ? "/" : "/dashboard" }
);
