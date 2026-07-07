import { type ReactNode, useEffect, useEffectEvent, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

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

let openModalCount = 0;

export function Modal({ open, onClose, title, children, footer, size = "md" }: ModalProps) {
  const hasLockedScrollRef = useRef(false);
  const [dialogEl, setDialogEl] = useState<HTMLDialogElement | null>(null);
  const [portalEl, setPortalEl] = useState<HTMLDivElement | null>(null);
  const titleId = useId();
  const closeFromDialogEvent = useEffectEvent(() => {
    onClose();
  });

  useEffect(() => {
    if (open && !hasLockedScrollRef.current) {
      openModalCount = openModalCount + 1;
      hasLockedScrollRef.current = true;
      document.body.style.overflow = "hidden";
    } else if (!open && hasLockedScrollRef.current) {
      openModalCount = Math.max(0, openModalCount - 1);
      hasLockedScrollRef.current = false;
      if (openModalCount === 0) {
        document.body.style.overflow = "";
      }
    }
    return () => {
      if (!hasLockedScrollRef.current) return;

      openModalCount = Math.max(0, openModalCount - 1);
      hasLockedScrollRef.current = false;
      if (openModalCount === 0) {
        document.body.style.overflow = "";
      }
    };
  }, [open]);

  useEffect(() => {
    const el = dialogEl;
    if (!el) return;

    const handleCancel = (e: Event) => {
      e.preventDefault();
      closeFromDialogEvent();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeFromDialogEvent();
      }
    };

    el.addEventListener("cancel", handleCancel);
    el.addEventListener("keydown", handleKeyDown);
    return () => {
      el.removeEventListener("cancel", handleCancel);
      el.removeEventListener("keydown", handleKeyDown);
    };
  }, [dialogEl]);

  useEffect(() => {
    const el = dialogEl;
    if (!el || !open) return;

    const focusableSelector =
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusable = el.querySelectorAll<HTMLElement>(focusableSelector);
    if (focusable.length > 0) {
      focusable[0].focus();
    } else {
      el.focus();
    }
  }, [dialogEl, open]);

  if (!open) return null;

  return createPortal(
    <PortalTargetContext.Provider value={portalEl}>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} aria-hidden="true" />
      <dialog
        ref={setDialogEl}
        open
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={`fixed top-1/2 right-auto bottom-auto left-1/2 z-50 m-0 flex max-h-[90dvh] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-visible rounded-xl border-none bg-white p-0 shadow-xl ${sizeStyles[size]}`}
      >
        {title && (
          <div className="border-surface-200 flex shrink-0 items-center justify-between gap-4 border-b px-6 py-4">
            <h2 id={titleId} className="text-surface-900 text-lg font-semibold">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
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
      <div ref={setPortalEl} className="pointer-events-none fixed inset-0 z-[51]" />
    </PortalTargetContext.Provider>,
    document.body
  );
}
