import { type ReactNode, useRef, useState } from "react";

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  delay?: number;
  className?: string;
}

let tooltipIdCounter = 0;

export function Tooltip({
  content,
  children,
  side = "top",
  align = "center",
  delay = 200,
  className = "",
}: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<number | null>(null);
  const uid = `tooltip-${++tooltipIdCounter}`;

  const updatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const gap = 8;
    let top = 0;
    let left = 0;

    switch (side) {
      case "top":
        top = triggerRect.top - tooltipRect.height - gap;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        if (align === "start") left = triggerRect.left;
        if (align === "end") left = triggerRect.right - tooltipRect.width;
        break;
      case "bottom":
        top = triggerRect.bottom + gap;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        if (align === "start") left = triggerRect.left;
        if (align === "end") left = triggerRect.right - tooltipRect.width;
        break;
      case "left":
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.left - tooltipRect.width - gap;
        break;
      case "right":
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.right + gap;
        break;
    }

    setPosition({ top, left });
  };

  const show = () => {
    timeoutRef.current = window.setTimeout(() => {
      setIsOpen(true);
      requestAnimationFrame(updatePosition);
    }, delay);
  };

  const hide = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") hide();
  };

  return (
    <div
      className={`relative inline-flex ${className}`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      onKeyDown={handleKeyDown}
    >
      <span ref={triggerRef} tabIndex={0} aria-describedby={isOpen ? uid : undefined}>
        {children}
      </span>
      {isOpen && position && (
        <div
          ref={tooltipRef}
          id={uid}
          role="tooltip"
          style={{
            position: "fixed",
            top: position.top,
            left: position.left,
            zIndex: 50,
            pointerEvents: "none",
          }}
          className="bg-surface-900 rounded px-2.5 py-1.5 text-xs whitespace-nowrap text-white shadow-lg"
        >
          {content}
        </div>
      )}
    </div>
  );
}
