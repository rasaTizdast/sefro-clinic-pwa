import {
  type ChangeEvent,
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from "react";

import {
  caretOffsetForDigits,
  extractDigits,
  formatTomanInput,
  parseTomanInput,
} from "../../lib/toman-input";
import { Input } from "./Input";

export interface TomanInputHandle {
  focus: () => void;
}

interface TomanInputProps {
  label?: string;
  /** Canonical amount (Toman). Accepts an already-formatted string too. */
  value: number | string;
  onChange: (value: number) => void;
  helperText?: string;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  containerClassName?: string;
}

/**
 * Whole-Toman money input for Persian users:
 * - accepts Latin, Persian (۰-۹) and Arabic (٠-٩) digits while typing;
 * - always renders grouped by thousands ("۱٬۲۳۴٬۵۶۷") so the number stays readable;
 * - drops any non-digit keystroke instead of surfacing a parse error;
 * - keeps the caret on the same digit when separators are (re)inserted, so editing
 *   in the middle of a long price does not jump to the end.
 *
 * The parent only ever deals in numbers; all formatting lives here.
 */
export const TomanInput = forwardRef<TomanInputHandle, TomanInputProps>(function TomanInput(
  {
    label,
    value,
    onChange,
    helperText,
    error,
    placeholder = "مثال: ۳۵۰٬۰۰۰",
    disabled,
    id,
    className,
    containerClassName,
  },
  ref
) {
  const inputRef = useRef<HTMLInputElement>(null);
  /** Digit count the caret sat before, captured while the DOM still had the typed text. */
  const caretDigits = useRef<number | null>(null);

  const formatted = formatTomanInput(value);

  useImperativeHandle(ref, () => ({ focus: () => inputRef.current?.focus() }), []);

  // Re-inserting separators pushes the caret to the end of the string; put it back
  // on the digit the user was actually editing.
  useLayoutEffect(() => {
    const el = inputRef.current;
    const wanted = caretDigits.current;
    if (!el || wanted == null) return;
    caretDigits.current = null;
    const offset = caretOffsetForDigits(formatted, wanted);
    if (el.selectionStart !== offset || el.selectionEnd !== offset) {
      el.setSelectionRange(offset, offset);
    }
  }, [formatted]);

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const el = event.target;
      const before = el.value.slice(0, el.selectionStart ?? el.value.length);
      caretDigits.current = extractDigits(before).length;
      onChange(parseTomanInput(el.value));
    },
    [onChange]
  );

  return (
    <Input
      ref={inputRef}
      id={id}
      label={label}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      dir="ltr"
      disabled={disabled}
      value={formatted}
      onChange={handleChange}
      placeholder={placeholder}
      helperText={helperText}
      error={error}
      className={className}
      containerClassName={containerClassName}
    />
  );
});
