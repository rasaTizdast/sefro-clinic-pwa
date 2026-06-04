import { createContext, useContext } from "react";

import type { ToastContextValue, ToastInput, ToastType } from "../../../types/toast";

export type { ToastContextValue, ToastInput, ToastType };

export const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }

  return context;
};
