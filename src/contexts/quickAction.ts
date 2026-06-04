import { createContext, type ReactNode } from "react";

export interface QuickAction {
  id: string;
  label: string;
  icon?: ReactNode;
  perform: () => void;
}

export interface QuickActionContextValue {
  actions: QuickAction[];
  registerAction: (action: QuickAction) => () => void;
}

export const QuickActionContext = createContext<QuickActionContextValue | null>(null);
