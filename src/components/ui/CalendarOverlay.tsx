import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export function CalendarOverlay() {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<MutationObserver | null>(null);

  const setupObserver = useCallback((container: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (!container) return;

    const check = () => {
      const popup = container.querySelector<HTMLElement>(".calendar-picker-modal");
      setOpen(!!popup && popup.style.visibility !== "hidden");
    };

    const obs = new MutationObserver(check);
    obs.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "class"],
    });
    observerRef.current = obs;
    wrapperRef.current = container;
    check();
  }, []);

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, []);

  return (
    <>
      <div ref={setupObserver} className="contents" />
      {open &&
        createPortal(<div className="calendar-page-overlay" aria-hidden="true" />, document.body)}
    </>
  );
}
