import { beforeEach, describe, expect, it } from "vitest";

import type { WizardTabData } from "../../types/wizard";
import * as wizardStorage from "../wizard-storage";

const mockTab: Omit<WizardTabData, "id" | "createdAt"> = {
  patient: {
    id: 1,
    firstName: "علی",
    lastName: "رضایی",
    mobileNumber: "09121234567",
    nationalId: "0012345678",
    isNew: false,
    visitCount: 3,
    totalSpent: 500000,
    lastVisit: "1404/06/15",
    servicesHistory: [],
    notes: "",
    birthday: "",
    fileSysId: "",
  },
  selectedServices: [],
  payment: null,
  step: "patient",
};

describe("wizard-storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("addWizardTab creates a tab with id and createdAt", () => {
    const tab = wizardStorage.addWizardTab(mockTab);
    expect(tab.id).toBeDefined();
    expect(tab.createdAt).toBeGreaterThan(0);
    expect(tab.patient.firstName).toBe("علی");
  });

  it("getActiveTabs returns all stored tabs", () => {
    wizardStorage.addWizardTab(mockTab);
    wizardStorage.addWizardTab({ ...mockTab, patient: { ...mockTab.patient, firstName: "رضا" } });

    const tabs = wizardStorage.getActiveTabs();
    expect(tabs).toHaveLength(2);
  });

  it("removeWizardTab removes a specific tab", () => {
    const tab1 = wizardStorage.addWizardTab(mockTab);
    const tab2 = wizardStorage.addWizardTab({
      ...mockTab,
      patient: { ...mockTab.patient, firstName: "رضا" },
    });

    wizardStorage.removeWizardTab(tab1.id);

    const tabs = wizardStorage.getActiveTabs();
    expect(tabs).toHaveLength(1);
    expect(tabs[0].id).toBe(tab2.id);
  });

  it("removes storage key when last tab is deleted", () => {
    const tab = wizardStorage.addWizardTab(mockTab);
    wizardStorage.removeWizardTab(tab.id);

    expect(localStorage.getItem("wizard_list")).toBeNull();
  });

  it("updateWizardTab merges partial updates", () => {
    const tab = wizardStorage.addWizardTab(mockTab);
    wizardStorage.updateWizardTab(tab.id, { step: "service" });

    const updated = wizardStorage.getActiveTabs();
    expect(updated[0].step).toBe("service");
    expect(updated[0].patient.firstName).toBe("علی");
  });

  it("updateWizardTab returns null for nonexistent tab", () => {
    const result = wizardStorage.updateWizardTab("nonexistent", { step: "service" });
    expect(result).toBeNull();
  });

  it("loadWizardList returns empty tabs when no data", () => {
    const state = wizardStorage.loadWizardList();
    expect(state.tabs).toEqual([]);
  });

  it("isSessionExpired returns false when no session exists", () => {
    expect(wizardStorage.isSessionExpired()).toBe(false);
  });

  it("isSessionExpired returns true after expiry", () => {
    // Set last visited to 4 hours ago
    const fourHoursAgo = Date.now() - 4 * 60 * 60 * 1000;
    localStorage.setItem("wizard_last_visited", String(fourHoursAgo));

    expect(wizardStorage.isSessionExpired()).toBe(true);
  });

  it("refreshSession resets the expiry timer", () => {
    const fourHoursAgo = Date.now() - 4 * 60 * 60 * 1000;
    localStorage.setItem("wizard_last_visited", String(fourHoursAgo));

    wizardStorage.refreshSession();

    expect(wizardStorage.isSessionExpired()).toBe(false);
  });

  it("cleanupExpiredTabs clears all tabs when expired", () => {
    wizardStorage.addWizardTab(mockTab);
    const fourHoursAgo = Date.now() - 4 * 60 * 60 * 1000;
    localStorage.setItem("wizard_last_visited", String(fourHoursAgo));

    const removed = wizardStorage.cleanupExpiredTabs();
    expect(removed).toBe(1);
    expect(wizardStorage.getActiveTabs()).toEqual([]);
  });

  it("cleanupExpiredTabs does nothing when not expired", () => {
    wizardStorage.addWizardTab(mockTab);
    wizardStorage.refreshSession();

    const removed = wizardStorage.cleanupExpiredTabs();
    expect(removed).toBe(0);
    expect(wizardStorage.getActiveTabs()).toHaveLength(1);
  });
});
