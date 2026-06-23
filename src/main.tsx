import "./index.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";

import { ToastProvider } from "./components/ui";
import { AuthProvider } from "./contexts/AuthContext";
import { QueryProvider } from "./contexts/QueryProvider";
import { router } from "./routes";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryProvider>
      <AuthProvider>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </AuthProvider>
    </QueryProvider>
  </StrictMode>
);
