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
import { AnimatePresence, motion } from 'motion/react';
import {
  ToastContext,
  type ToastContextValue,
  type ToastInput,
  type ToastType,
} from './ToastContext';

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
    className: 'border-success-200 bg-success-50/90 text-success-900',
    iconClassName: 'bg-success-100 text-success-600',
    progressClassName: 'bg-success-500',
  },
  error: {
    icon: <BiErrorCircle />,
    className: 'border-danger-200 bg-danger-50/90 text-danger-900',
    iconClassName: 'bg-danger-100 text-danger-600',
    progressClassName: 'bg-danger-500',
  },
  warning: {
    icon: <BiInfoCircle />,
    className: 'border-warning-200 bg-warning-50/90 text-warning-900',
    iconClassName: 'bg-warning-100 text-warning-600',
    progressClassName: 'bg-warning-500',
  },
  info: {
    icon: <BiInfoCircle />,
    className: 'border-info-200 bg-info-50/90 text-info-900',
    iconClassName: 'bg-info-100 text-info-600',
    progressClassName: 'bg-info-500',
  },
};

const createToastId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const style = toastStyles[toast.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30, mass: 1 }}
      className={`pointer-events-auto relative overflow-hidden rounded-2xl border p-4 shadow-[0_18px_50px_rgba(15,23,42,0.14)] backdrop-blur-sm ${style.className}`}
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
          onClick={() => onDismiss(toast.id)}
          className="grid size-8 shrink-0 place-items-center rounded-lg text-lg opacity-65 outline-none transition hover:bg-black/5 hover:opacity-100 focus-visible:ring-2 focus-visible:ring-black/20"
          aria-label="بستن پیام"
        >
          <BiX />
        </button>
      </div>

      {toast.duration > 0 && (
        <motion.span
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{ duration: toast.duration / 1000, ease: 'linear' }}
          onAnimationComplete={() => onDismiss(toast.id)}
          className={`absolute inset-x-0 bottom-0 h-1 origin-right ${style.progressClassName}`}
        />
      )}
    </motion.div>
  );
}

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

      return id;
    },
    [],
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
        className="pointer-events-none fixed inset-x-3 top-3 z-100 flex flex-col gap-3 sm:inset-x-auto sm:start-4 sm:w-[min(24rem,calc(100vw-2rem))]"
        aria-live="polite"
        aria-atomic="true"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <ToastItem
              key={toast.id}
              toast={toast}
              onDismiss={dismissToast}
            />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};
