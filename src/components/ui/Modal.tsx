import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";

import { PortalTargetContext } from "./PortalTargetContext";

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
  const internalDialogRef = useRef<HTMLDialogElement>(null);
  const [dialogEl, setDialogEl] = useState<HTMLDialogElement | null>(null);

  const setDialogRef = useCallback((el: HTMLDialogElement | null) => {
    internalDialogRef.current = el;
    setDialogEl(el);
  }, []);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const el = internalDialogRef.current;
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

  useEffect(() => {
    const el = internalDialogRef.current;
    if (!el || !open) return;

    const focusableSelector =
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusable = el.querySelectorAll<HTMLElement>(focusableSelector);
    if (focusable.length > 0) {
      focusable[0].focus();
    } else {
      el.focus();
    }
  }, [open]);

  const handleBackdrop = useCallback(() => {
    handleClose();
  }, [handleClose]);

  if (!open) return null;

  return (
    <PortalTargetContext.Provider value={dialogEl}>
      <div className="fixed inset-0 z-30 bg-black/50" onClick={handleBackdrop} aria-hidden="true" />
      <dialog
        ref={setDialogRef}
        open
        onClick={(e) => e.stopPropagation()}
        className={`fixed top-1/2 left-1/2 z-40 w-full -translate-x-1/2 -translate-y-1/2 ${sizeStyles[size]} max-h-[90vh] rounded-xl bg-white shadow-xl`}
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
    </PortalTargetContext.Provider>
  );
}
