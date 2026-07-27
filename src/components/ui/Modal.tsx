import {
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
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

let openModalCount = 0;

const SIZE_MAP: Record<ModalSize, string> = {
  sm: "24rem",
  md: "28rem",
  lg: "32rem",
  xl: "36rem",
  "2xl": "42rem",
};

export function Modal({ open, onClose, title, children, footer, size = "md" }: ModalProps) {
  const hasLockedScrollRef = useRef(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [portalEl, setPortalEl] = useState<HTMLDivElement | null>(null);
  const titleId = useId();
  const closeRef: RefObject<() => void> = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
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

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      closeRef.current?.();
    }
  }, []);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;

    el.addEventListener("keydown", handleKeyDown);
    return () => {
      el.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, handleKeyDown]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el || !open) return;

    const focusableSelector =
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusable = el.querySelectorAll<HTMLElement>(focusableSelector);
    if (focusable.length > 0) {
      focusable[0].focus();
    } else {
      el.focus();
    }
  }, [dialogRef, open]);

  if (!open) return null;

  const maxWidth = SIZE_MAP[size];

  return createPortal(
    <PortalTargetContext.Provider value={portalEl}>
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          onClick={onClose}
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
          }}
        />
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          style={{
            position: "relative",
            maxHeight: "90dvh",
            width: "calc(100vw - 2rem)",
            maxWidth,
            display: "flex",
            flexDirection: "column",
          }}
          className="m-0 overflow-visible rounded-xl border-none bg-white p-0 shadow-xl"
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
        </div>
      </div>
      <div
        ref={setPortalEl}
        className="pointer-events-none fixed inset-0"
        style={{ zIndex: 10001 }}
      />
    </PortalTargetContext.Provider>,
    document.body
  );
}
