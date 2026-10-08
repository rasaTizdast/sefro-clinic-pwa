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
  notes: string;
  birthday: string;
  fileSysId: string;
}

export interface ServiceSelection {
  serviceId: number | null;
  serviceName: string;
  priceToman: string;
  priceUsd: string;
  isPackage: boolean;
  packageId: number | null;
  /** Per-item consumables with customer-facing prices. */
  consumables?: ConsumableSelection[];
}

export interface ConsumableSelection {
  product: number;
  productName: string;
  quantity: string;
  priceToman: string;
  priceUsd: string;
}

export interface WelcomePackSelection {
  packId: number;
  packName: string;
  totalCostToman: string | null;
  totalCostUsd: string;
}

export interface PaymentSelection {
  method: "cash" | "card";
  amountUsd: string;
  cashToman: number;
  cardToman: number;
  /** Cash paid in USD (dollar). "0" when unused. */
  cashUsd: string;
}

export interface WizardTabData {
  id: string;
  patient: PatientData;
  selectedServices: ServiceSelection[];
  /** Single package selection (exclusive with individual services). */
  selectedPackageId: number | null;
  /** Per-service recipe consumables (customer-billable, added to total). */
  consumables: Record<string, ConsumableSelection[]>;
  /** Extra warehouse products used for this visit (customer-billable, not in the service recipe). */
  extraProducts: ConsumableSelection[];
  /** Optional welcome pack (issued via API only, never a local financial txn). */
  welcomePack: WelcomePackSelection | null;
  payment: PaymentSelection | null;
  /** Backend visit id once created — cleared on successful submit/reset. */
  visitId: number | null;
  step: WizardStep;
  createdAt: number;
}

export interface WizardListState {
  tabs: WizardTabData[];
  lastVisitedAt: number;
}

export const WIZARD_STORAGE_KEY = "wizard_list";
export const WIZARD_TOKEN_EXPIRY_MS = 3 * 60 * 60 * 1000;
