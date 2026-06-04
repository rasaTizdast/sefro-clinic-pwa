import "./index.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";

import { ToastProvider } from "./components/ui";
import { router } from "./routes";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>
  </StrictMode>
);
