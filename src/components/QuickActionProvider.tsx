import { type ReactNode, useCallback, useMemo, useRef, useState } from "react";

import { type QuickAction, QuickActionContext } from "../contexts/quickAction";

export function QuickActionProvider({ children }: { children: ReactNode }) {
  const [actions, setActions] = useState<QuickAction[]>([]);
  const actionMapRef = useRef<Map<string, QuickAction>>(new Map());

  const registerAction = useCallback((action: QuickAction) => {
    actionMapRef.current.set(action.id, action);
    setActions(Array.from(actionMapRef.current.values()));
    return () => {
      actionMapRef.current.delete(action.id);
      setActions(Array.from(actionMapRef.current.values()));
    };
  }, []);

  const value = useMemo(() => ({ actions, registerAction }), [actions, registerAction]);

  return <QuickActionContext.Provider value={value}>{children}</QuickActionContext.Provider>;
}
