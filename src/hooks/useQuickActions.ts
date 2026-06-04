import { useContext } from "react";

import { QuickActionContext } from "../contexts/quickAction";

export function useQuickActions() {
  const ctx = useContext(QuickActionContext);
  if (!ctx) throw new Error("useQuickActions must be inside QuickActionProvider");
  return ctx;
}
