export type PatientStatus = "new" | "active" | "loyal" | "inactive";

export interface Patient {
  id: number;
  firstName: string;
  lastName: string;
  mobileNumber: string;
  nationalId: string;
  bitmojiCode: string;
  satisfaction: number;
  notes: string;
  lastVisit: string;
  visitCount: number;
  status: PatientStatus;
  isNewCustomer: boolean;
  isLoyalCustomer: boolean;
  totalPayments: number;
  createdAt: string;
  /** Shamsi birthday as the API stores it (`YYYY-MM-DD`); null when unset. */
  birthday?: string | null;
  fileSysId?: string | null;
}

export interface PatientFormData {
  firstName: string;
  lastName: string;
  mobileNumber: string;
  nationalId: string;
  bitmojiCode: string;
  notes: string;
  /** Picker format (`YYYY/MM/DD`); empty string when unset. */
  birthday?: string;
  fileSysId?: string;
}
