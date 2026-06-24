import { type ReactNode, useMemo } from "react";
import { toast as sonnerToast, Toaster } from "sonner";

import { ToastContext, type ToastContextValue, type ToastInput } from "./ToastContext";

const toastFnMap = {
  success: sonnerToast.success,
  error: sonnerToast.error,
  warning: sonnerToast.warning,
  info: sonnerToast.info,
} as const;

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const value = useMemo<ToastContextValue>(() => {
    const showToast = ({ title, description, type = "info", duration = 4500 }: ToastInput) =>
      String(toastFnMap[type](title, { description, duration }));

    return {
      showToast,
      dismissToast: (id) => {
        sonnerToast.dismiss(id);
      },
      success: (title, description) => String(sonnerToast.success(title, { description })),
      error: (title, description) => String(sonnerToast.error(title, { description })),
      warning: (title, description) => String(sonnerToast.warning(title, { description })),
      info: (title, description) => String(sonnerToast.info(title, { description })),
    };
  }, []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster
        position="bottom-left"
        richColors
        closeButton
        dir="rtl"
        className="font-inherit"
        toastOptions={{ classNames: { toast: "font-inherit" } }}
      />
    </ToastContext.Provider>
  );
};
