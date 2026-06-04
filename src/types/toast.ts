export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastInput {
  title: string;
  description?: string;
  type?: ToastType;
  duration?: number;
}

export interface ToastContextValue {
  showToast: (toast: ToastInput) => string;
  dismissToast: (id: string) => void;
  success: (title: string, description?: string) => string;
  error: (title: string, description?: string) => string;
  warning: (title: string, description?: string) => string;
  info: (title: string, description?: string) => string;
}
