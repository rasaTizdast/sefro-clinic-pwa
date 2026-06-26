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
}

export interface PatientFormData {
  firstName: string;
  lastName: string;
  mobileNumber: string;
  nationalId: string;
  bitmojiCode: string;
  notes: string;
}
