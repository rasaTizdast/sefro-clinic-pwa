import type { WizardListState, WizardTabData } from "../types/wizard";
import { WIZARD_STORAGE_KEY, WIZARD_TOKEN_EXPIRY_MS } from "../types/wizard";

const EXPIRY_KEY = "wizard_last_visited";

function getLastVisitedAt(): number {
  try {
    const raw = localStorage.getItem(EXPIRY_KEY);
    return raw ? Number(raw) : 0;
  } catch {
    return 0;
  }
}

function setLastVisitedAt(ts: number): void {
  try {
    localStorage.setItem(EXPIRY_KEY, String(ts));
  } catch {
    // ignore
  }
}

export function isSessionExpired(): boolean {
  const last = getLastVisitedAt();
  if (last === 0) return false;
  return Date.now() - last > WIZARD_TOKEN_EXPIRY_MS;
}

export function refreshSession(): void {
  setLastVisitedAt(Date.now());
}

export function loadWizardList(): WizardListState {
  try {
    const raw = localStorage.getItem(WIZARD_STORAGE_KEY);
    if (!raw) return { tabs: [], lastVisitedAt: getLastVisitedAt() };
    const parsed = JSON.parse(raw) as WizardListState;
    if (!parsed.tabs) return { tabs: [], lastVisitedAt: getLastVisitedAt() };
    return { ...parsed, lastVisitedAt: getLastVisitedAt() };
  } catch {
    return { tabs: [], lastVisitedAt: getLastVisitedAt() };
  }
}

export function saveWizardList(state: WizardListState): void {
  try {
    localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error("[wizard-storage] save failed:", err);
  }
}

export function addWizardTab(tabData: Omit<WizardTabData, "id" | "createdAt">): WizardTabData {
  const state = loadWizardList();
  const newTab: WizardTabData = {
    ...tabData,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  };
  state.tabs.push(newTab);
  saveWizardList(state);
  return newTab;
}

export function removeWizardTab(tabId: string): void {
  const state = loadWizardList();
  state.tabs = state.tabs.filter((t) => t.id !== tabId);
  if (state.tabs.length === 0) {
    localStorage.removeItem(WIZARD_STORAGE_KEY);
  } else {
    saveWizardList(state);
  }
}

export function getWizardTab(tabId: string): WizardTabData | null {
  const state = loadWizardList();
  return state.tabs.find((t) => t.id === tabId) ?? null;
}

export function updateWizardTab(
  tabId: string,
  updates: Partial<WizardTabData>
): WizardTabData | null {
  const state = loadWizardList();
  const idx = state.tabs.findIndex((t) => t.id === tabId);
  if (idx === -1) return null;
  state.tabs[idx] = { ...state.tabs[idx], ...updates };
  saveWizardList(state);
  return state.tabs[idx];
}

export function cleanupExpiredTabs(): number {
  if (!isSessionExpired()) return 0;

  const state = loadWizardList();
  const before = state.tabs.length;
  state.tabs = [];
  saveWizardList(state);
  return before;
}

export function getActiveTabs(): WizardTabData[] {
  return loadWizardList().tabs;
}
