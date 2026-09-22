import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";

import * as wizardStorage from "../lib/wizard-storage";
import type { WizardTabData } from "../types/wizard";

interface WizardContextValue {
  tabs: WizardTabData[];
  activeTabId: string | null;
  createTab: () => string;
  closeTab: (tabId: string) => void;
  setActiveTabId: (id: string | null) => void;
  updateTab: (tabId: string, updates: Partial<WizardTabData>) => void;
}

const WizardCtx = createContext<WizardContextValue | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useWizard() {
  const ctx = useContext(WizardCtx);
  if (!ctx) throw new Error("useWizard must be used inside WizardProvider");
  return ctx;
}

export function WizardProvider({ children }: { children: ReactNode }) {
  const [tabs, setTabs] = useState<WizardTabData[]>(() => {
    if (wizardStorage.isSessionExpired()) {
      wizardStorage.cleanupExpiredTabs();
    }
    return wizardStorage.getActiveTabs();
  });
  const [activeTabId, setActiveTabId] = useState<string | null>(() => {
    const active = wizardStorage.getActiveTabs();
    return active.length > 0 ? active[active.length - 1].id : null;
  });

  useEffect(() => {
    wizardStorage.refreshSession();
  }, []);

  const createTab = useCallback(() => {
    wizardStorage.refreshSession();
    const tab = wizardStorage.addWizardTab({
      patient: {
        id: null,
        firstName: "",
        lastName: "",
        mobileNumber: "",
        nationalId: "",
        isNew: true,
        visitCount: 0,
        totalSpent: 0,
        lastVisit: null,
        servicesHistory: [],
        notes: "",
        birthday: "",
        fileSysId: "",
      },
      selectedServices: [],
      payment: null,
      step: "patient",
    });
    setTabs(wizardStorage.getActiveTabs());
    setActiveTabId(tab.id);
    return tab.id;
  }, []);

  const closeTab = useCallback((tabId: string) => {
    wizardStorage.removeWizardTab(tabId);
    setTabs(wizardStorage.getActiveTabs());
    setActiveTabId((prev) => {
      if (prev === tabId) {
        const remaining = wizardStorage.getActiveTabs();
        return remaining.length > 0 ? remaining[remaining.length - 1].id : null;
      }
      return prev;
    });
  }, []);

  const updateTab = useCallback((tabId: string, updates: Partial<WizardTabData>) => {
    wizardStorage.refreshSession();
    wizardStorage.updateWizardTab(tabId, updates);
    setTabs(wizardStorage.getActiveTabs());
  }, []);

  return (
    <WizardCtx.Provider
      value={{ tabs, activeTabId, createTab, closeTab, setActiveTabId, updateTab }}
    >
      {children}
    </WizardCtx.Provider>
  );
}
