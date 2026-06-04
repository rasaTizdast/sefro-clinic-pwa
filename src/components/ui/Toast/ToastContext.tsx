import { createContext, useContext } from "react";
import type { ToastType, ToastInput, ToastContextValue } from "../../../types/toast";

export type { ToastType, ToastInput, ToastContextValue };

export const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }

  return context;
};
