export type WizardStep = "patient" | "service" | "payment";

export interface PatientData {
  id: number | null;
  firstName: string;
  lastName: string;
  mobileNumber: string;
  nationalId: string;
  isNew: boolean;
  visitCount: number;
  totalSpent: number;
  lastVisit: string | null;
  servicesHistory: number[];
}

export interface ServiceSelection {
  serviceId: number | null;
  serviceName: string;
  priceToman: string;
  priceUsd: string;
  isPackage: boolean;
  packageId: number | null;
}

export interface PaymentSelection {
  method: "cash" | "card";
  amountUsd: string;
  cashToman: number;
  cardToman: number;
}

export interface WizardTabData {
  id: string;
  patient: PatientData;
  selectedServices: ServiceSelection[];
  payment: PaymentSelection | null;
  step: WizardStep;
  createdAt: number;
}

export interface WizardListState {
  tabs: WizardTabData[];
  lastVisitedAt: number;
}

export const WIZARD_STORAGE_KEY = "wizard_list";
export const WIZARD_TOKEN_EXPIRY_MS = 3 * 60 * 60 * 1000;
