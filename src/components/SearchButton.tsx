import { BiSearch } from "react-icons/bi";

import { useCommandPaletteState } from "../contexts/commandPalette";

export function SearchButton() {
  const { setOpen } = useCommandPaletteState();

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="جستجوی کلی"
      className="border-surface-200 text-surface-400 hover:border-surface-300 hover:text-surface-500 focus-visible:ring-primary-600/40 flex shrink-0 items-center justify-center gap-1.5 rounded-lg border bg-white p-2 text-sm shadow-sm transition-colors focus-visible:ring-2 focus-visible:outline-none md:gap-2 md:px-3 md:py-2"
    >
      <BiSearch className="size-4 shrink-0" aria-hidden="true" />
      <span className="hidden md:inline">جستجو</span>
    </button>
  );
}
