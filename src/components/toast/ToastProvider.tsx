import {
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  BiCheckCircle,
  BiErrorCircle,
  BiInfoCircle,
  BiX,
} from 'react-icons/bi';
import {
  ToastContext,
  type ToastContextValue,
  type ToastInput,
  type ToastType,
} from './toastContext';

interface Toast extends Required<Pick<ToastInput, 'title' | 'type'>> {
  id: string;
  description?: string;
  duration: number;
}

const toastStyles: Record<
  ToastType,
  {
    icon: ReactNode;
    className: string;
    iconClassName: string;
    progressClassName: string;
  }
> = {
  success: {
    icon: <BiCheckCircle />,
    className: 'border-emerald-200 bg-emerald-50 text-emerald-950',
    iconClassName: 'bg-emerald-100 text-emerald-700',
    progressClassName: 'bg-emerald-500',
  },
  error: {
    icon: <BiErrorCircle />,
    className: 'border-rose-200 bg-rose-50 text-rose-950',
    iconClassName: 'bg-rose-100 text-rose-700',
    progressClassName: 'bg-rose-500',
  },
  warning: {
    icon: <BiInfoCircle />,
    className: 'border-amber-200 bg-amber-50 text-amber-950',
    iconClassName: 'bg-amber-100 text-amber-700',
    progressClassName: 'bg-amber-500',
  },
  info: {
    icon: <BiInfoCircle />,
    className: 'border-sky-200 bg-sky-50 text-sky-950',
    iconClassName: 'bg-sky-100 text-sky-700',
    progressClassName: 'bg-sky-500',
  },
};

const createToastId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((currentToasts) =>
      currentToasts.filter((toast) => toast.id !== id),
    );
  }, []);

  const showToast = useCallback(
    ({ title, description, type = 'info', duration = 4500 }: ToastInput) => {
      const id = createToastId();
      const toast: Toast = { id, title, description, type, duration };

      setToasts((currentToasts) => [toast, ...currentToasts].slice(0, 5));

      if (duration > 0) {
        window.setTimeout(() => dismissToast(id), duration);
      }

      return id;
    },
    [dismissToast],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast,
      dismissToast,
      success: (title, description) =>
        showToast({ title, description, type: 'success' }),
      error: (title, description) =>
        showToast({ title, description, type: 'error' }),
      warning: (title, description) =>
        showToast({ title, description, type: 'warning' }),
      info: (title, description) =>
        showToast({ title, description, type: 'info' }),
    }),
    [dismissToast, showToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        dir="rtl"
        className="pointer-events-none fixed inset-x-3 top-3 z-100 flex flex-col gap-3 sm:inset-x-auto sm:right-4 sm:w-[min(24rem,calc(100vw-2rem))]"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((toast) => {
          const style = toastStyles[toast.type];

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto relative overflow-hidden rounded-2xl border p-4 shadow-[0_18px_50px_rgba(15,23,42,0.14)] backdrop-blur ${style.className}`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`grid size-10 shrink-0 place-items-center rounded-xl text-2xl ${style.iconClassName}`}
                >
                  {style.icon}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold leading-6">{toast.title}</p>
                  {toast.description && (
                    <p className="mt-1 text-xs leading-5 opacity-80">
                      {toast.description}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => dismissToast(toast.id)}
                  className="grid size-8 shrink-0 place-items-center rounded-lg text-lg opacity-65 outline-none transition hover:bg-black/5 hover:opacity-100 focus-visible:ring-2 focus-visible:ring-black/20"
                  aria-label="بستن پیام"
                >
                  <BiX />
                </button>
              </div>

              {toast.duration > 0 && (
                <span
                  className={`absolute inset-x-0 bottom-0 h-1 origin-right animate-[toast-progress_linear_forwards] ${style.progressClassName}`}
                  style={{ animationDuration: `${toast.duration}ms` }}
                />
              )}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
