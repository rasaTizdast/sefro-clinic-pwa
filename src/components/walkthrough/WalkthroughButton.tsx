import { BiHelpCircle } from "react-icons/bi";

import { useWalkthrough } from "../../hooks/useWalkthrough";

export function WalkthroughButton() {
  const { startWalkthrough, isEnabled } = useWalkthrough();

  if (!isEnabled) return null;

  return (
    <button
      type="button"
      onClick={startWalkthrough}
      className="bg-primary-600 hover:bg-primary-700 focus-visible:ring-primary-600/50 fixed bottom-4 left-4 z-40 grid size-12 cursor-pointer place-items-center rounded-full text-white shadow-lg transition-all hover:scale-105 focus-visible:ring-2 focus-visible:outline-none active:scale-95 md:bottom-6 md:left-6"
      aria-label="راهنمای صفحه"
      title="راهنمای صفحه"
    >
      <BiHelpCircle className="size-6" />
    </button>
  );
}
