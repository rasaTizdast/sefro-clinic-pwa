import { AnimatePresence, motion } from "motion/react";
import {
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface ActionItem {
  label?: string;
  icon?: ReactNode;
  onClick?: () => void;
  divider?: boolean;
  disabled?: boolean;
  danger?: boolean;
  description?: string;
  shortcut?: string;
}

interface SelectProps {
  label?: string;
  error?: string;
  options?: SelectOption[];
  items?: ActionItem[];
  trigger?: ReactNode;
  align?: "start" | "end";
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (e: ChangeEvent<HTMLSelectElement>) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
  searchable?: boolean;
}

export function Select({
  label,
  error,
  options,
  items,
  trigger,
  align = "start",
  placeholder,
  value: controlledValue,
  defaultValue = "",
  onChange,
  disabled = false,
  className = "",
  id: idProp,
  name,
  searchable = false,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [searchQuery, setSearchQuery] = useState("");

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const uid = useId();

  const isActionMenu = !!trigger;

  const isControlled = controlledValue !== undefined;
  const currentValue = isControlled ? controlledValue : internalValue;

  const selectId = idProp || (label ? label.replace(/\s+/g, "-").toLowerCase() : undefined);
  const errorId = selectId ? `${selectId}-error` : undefined;
  const listboxId = `select-listbox-${uid}`;

  const displayedOptions =
    options && searchable && searchQuery
      ? options.filter((o) => o.label.toLowerCase().includes(searchQuery.toLowerCase()))
      : options;

  const close = useCallback(() => {
    setIsOpen(false);
    setActiveIndex(-1);
    setSearchQuery("");
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        close();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, close]);

  useEffect(() => {
    if (isOpen && searchable) {
      searchInputRef.current?.focus();
    }
  }, [isOpen, searchable]);

  const enabledItems = isActionMenu
    ? ((items ?? [])
        .map((item, i) => (item.divider || item.disabled ? -1 : i))
        .filter((i) => i !== -1) as number[])
    : (displayedOptions ?? []).map((_, i) => i);

  function selectOption(index: number) {
    if (isActionMenu || !options) return;
    const option = options[index];
    if (!option) return;

    if (!isControlled) {
      setInternalValue(option.value);
    }

    onChange?.({ target: { value: option.value } } as ChangeEvent<HTMLSelectElement>);

    close();
    triggerRef.current?.focus();
  }

  function triggerItem(index: number) {
    if (!isActionMenu || !items) return;
    const item = items[index];
    if (!item || item.disabled || item.divider) return;
    item.onClick?.();
    close();
    triggerRef.current?.focus();
  }

  function moveFocus(direction: 1 | -1) {
    const enab = enabledItems;
    if (enab.length === 0) return;

    setActiveIndex((prev) => {
      const currentPos = enab.indexOf(prev);
      if (currentPos === -1) return enab[0];
      const nextPos = (currentPos + direction + enab.length) % enab.length;
      const next = enab[nextPos];
      optionRefs.current[next]?.focus();
      return next;
    });
  }

  function openMenu() {
    setIsOpen(true);
    if (enabledItems.length > 0) {
      setActiveIndex(enabledItems[0]);
    }
  }

  function handleTriggerClick() {
    if (disabled) return;
    if (isOpen) {
      close();
    } else {
      openMenu();
    }
  }

  function handleTriggerKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    switch (e.key) {
      case "Enter":
      case " ":
      case "ArrowDown":
        e.preventDefault();
        if (!isOpen) openMenu();
        break;
      case "ArrowUp":
        e.preventDefault();
        if (!isOpen) openMenu();
        break;
    }
  }

  function handleSearchKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (enabledItems.length > 0) {
        optionRefs.current[enabledItems[0]]?.focus();
        setActiveIndex(enabledItems[0]);
      }
    }
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      triggerRef.current?.focus();
    }
  }

  function handleMenuKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        moveFocus(1);
        break;
      case "ArrowUp":
        e.preventDefault();
        if ((e.target as HTMLElement).tagName === "INPUT") return;
        moveFocus(-1);
        break;
      case "Home":
        e.preventDefault();
        if (enabledItems.length > 0) {
          const idx = enabledItems[0];
          setActiveIndex(idx);
          optionRefs.current[idx]?.focus();
        }
        break;
      case "End":
        e.preventDefault();
        if (enabledItems.length > 0) {
          const idx = enabledItems[enabledItems.length - 1];
          setActiveIndex(idx);
          optionRefs.current[idx]?.focus();
        }
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (activeIndex >= 0) {
          if (isActionMenu) {
            triggerItem(activeIndex);
          } else {
            selectOption(activeIndex);
          }
        }
        break;
      case "Escape":
        e.preventDefault();
        close();
        triggerRef.current?.focus();
        break;
      case "Tab":
        close();
        break;
    }
  }

  const selectedLabel =
    !isActionMenu && options ? options.find((opt) => opt.value === currentValue)?.label : undefined;

  const hasSearch = searchable && !!options;

  return (
    <div className={`relative flex flex-col gap-1.5 ${className}`}>
      {label && !isActionMenu && (
        <label htmlFor={selectId} className="text-surface-700 text-sm font-medium">
          {label}
        </label>
      )}

      <div className="relative">
        {isActionMenu ? (
          <button
            ref={triggerRef}
            type="button"
            role="combobox"
            aria-expanded={isOpen}
            aria-haspopup="menu"
            aria-controls={isOpen ? listboxId : undefined}
            disabled={disabled}
            onClick={handleTriggerClick}
            onKeyDown={handleTriggerKeyDown}
          >
            {trigger}
          </button>
        ) : (
          <button
            ref={triggerRef}
            id={selectId}
            type="button"
            role="combobox"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-controls={isOpen ? listboxId : undefined}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
            disabled={disabled}
            onClick={handleTriggerClick}
            onKeyDown={handleTriggerKeyDown}
            className={`disabled:bg-surface-50 disabled:text-surface-400 flex w-full items-center justify-between rounded-lg border bg-white py-2 ps-3 pe-9 text-sm transition-all duration-150 ease-in-out outline-none focus-visible:ring-2 focus-visible:ring-offset-0 disabled:cursor-not-allowed ${
              error
                ? "border-danger-400 focus-visible:border-danger-500 focus-visible:ring-danger-500/30"
                : "border-surface-300 focus-visible:border-primary-500 focus-visible:ring-primary-500/30"
            } ${selectedLabel ? "text-surface-900" : "text-surface-400"}`}
          >
            <span className="truncate">{selectedLabel || placeholder}</span>
            <span className="text-surface-400 pointer-events-none absolute inset-y-0 inset-e-0 flex items-center pe-3">
              <svg
                className={`size-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </button>
        )}

        <AnimatePresence>
          {isOpen && (
            <motion.div
              ref={menuRef}
              id={listboxId}
              role={isActionMenu ? "menu" : "listbox"}
              aria-label={label}
              onKeyDown={handleMenuKeyDown}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className={`border-surface-200 absolute top-full z-50 mt-1.5 max-h-[300px] w-full overflow-hidden overflow-y-auto rounded-xl border bg-white shadow-lg ring-1 ring-black/5 ${
                align === "end" ? "end-0" : "start-0"
              }`}
            >
              {hasSearch && (
                <div className="px-3 pb-1.5">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setActiveIndex(-1);
                    }}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="جستجو..."
                    className="border-surface-300 focus:border-primary-500 focus:ring-primary-500/30 w-full rounded-md border px-2.5 py-1.5 text-sm transition-colors duration-150 outline-none focus:ring-1"
                    dir="auto"
                  />
                </div>
              )}

              {isActionMenu && items ? (
                items.map((item, index) => {
                  if (item.divider) {
                    return (
                      <div
                        key={`divider-${index}`}
                        className="border-surface-100 my-1 border-t"
                        role="separator"
                      />
                    );
                  }

                  return (
                    <button
                      key={index}
                      ref={(el) => {
                        optionRefs.current[index] = el;
                      }}
                      role="menuitem"
                      tabIndex={activeIndex === index ? 0 : -1}
                      disabled={item.disabled}
                      onClick={() => triggerItem(index)}
                      onMouseEnter={() => setActiveIndex(index)}
                      className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-sm focus-visible:outline-none ${
                        item.disabled
                          ? "text-surface-400 cursor-not-allowed"
                          : item.danger
                            ? "text-danger-600 hover:bg-danger-50 focus-visible:bg-danger-100"
                            : "text-surface-700 hover:bg-surface-100 focus-visible:bg-primary-50 focus-visible:text-primary-700"
                      } ${activeIndex === index && !item.disabled ? "bg-primary-50/30" : ""}`}
                      aria-disabled={item.disabled || undefined}
                    >
                      {item.icon && (
                        <span className="flex size-4 shrink-0 items-center justify-center [&>svg]:size-4">
                          {item.icon}
                        </span>
                      )}
                      <span className="flex flex-1 flex-col text-start">
                        <span className="truncate">{item.label}</span>
                        {item.description && (
                          <span className="text-surface-400 truncate text-[11px] leading-tight">
                            {item.description}
                          </span>
                        )}
                      </span>
                      {item.shortcut && (
                        <span
                          className="text-surface-400 ms-auto text-[11px] leading-none"
                          dir="ltr"
                        >
                          {item.shortcut}
                        </span>
                      )}
                    </button>
                  );
                })
              ) : (displayedOptions ?? []).length > 0 ? (
                (displayedOptions ?? []).map((option, index) => {
                  const isSelected = option.value === currentValue;

                  return (
                    <button
                      key={option.value}
                      ref={(el) => {
                        optionRefs.current[index] = el;
                      }}
                      role="option"
                      aria-selected={isSelected}
                      tabIndex={activeIndex === index ? 0 : -1}
                      onClick={() => selectOption(index)}
                      onMouseEnter={() => setActiveIndex(index)}
                      className={`flex w-full items-center px-3 py-2.5 text-sm focus-visible:outline-none ${"text-surface-700 hover:bg-surface-100"} ${isSelected ? "bg-primary-100 text-primary-800 font-medium" : ""} focus-visible:bg-primary-50/20`}
                    >
                      <span className="truncate">{option.label}</span>
                      {isSelected && (
                        <svg
                          className="text-primary-600 ms-auto size-4 shrink-0"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4.5 12.75l6 6 9-13.5"
                          />
                        </svg>
                      )}
                    </button>
                  );
                })
              ) : !isActionMenu && searchQuery ? (
                <div className="text-surface-400 px-3 py-4 text-center text-sm">موردی یافت نشد</div>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {error && (
        <p id={errorId} className="text-danger-600 text-xs" role="alert">
          {error}
        </p>
      )}

      {name && !isActionMenu && <input type="hidden" name={name} value={currentValue} />}
    </div>
  );
}
