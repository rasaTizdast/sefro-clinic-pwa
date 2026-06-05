import { type ReactNode, useCallback, useEffect, useRef } from "react";

type ModalSize = "sm" | "md" | "lg" | "xl" | "2xl";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
}

const sizeStyles: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
};

export function Modal({ open, onClose, title, children, footer, size = "md" }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;

    if (open && !el.open) {
      el.showModal();
    } else if (!open && el.open) {
      el.close();
    }
  }, [open]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;

    const handleCancel = (e: Event) => {
      e.preventDefault();
      handleClose();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      }
    };

    el.addEventListener("cancel", handleCancel);
    el.addEventListener("keydown", handleKeyDown);
    return () => {
      el.removeEventListener("cancel", handleCancel);
      el.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleClose]);

  const handleBackdrop = useCallback(
    (e: React.MouseEvent<HTMLDialogElement>) => {
      if (e.target === dialogRef.current) {
        handleClose();
      }
    },
    [handleClose]
  );

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdrop}
      className={`w-full backdrop:bg-black/50 ${sizeStyles[size]} m-auto max-h-[90vh] rounded-xl bg-white shadow-xl open:flex open:flex-col`}
    >
      {title && (
        <div className="border-surface-200 flex shrink-0 items-center justify-between gap-4 border-b px-6 py-4">
          <h2 className="text-surface-900 text-lg font-semibold">{title}</h2>
          <button
            onClick={handleClose}
            className="text-surface-400 hover:text-surface-600 hover:bg-surface-100 cursor-pointer rounded-md p-1 transition-colors"
            aria-label="بستن"
          >
            <svg
              className="size-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      <div className="grow overflow-y-auto px-6 py-4">{children}</div>
      {footer && (
        <div className="border-surface-200 flex shrink-0 items-center justify-end gap-3 border-t px-6 py-4">
          {footer}
        </div>
      )}
    </dialog>
  );
}
