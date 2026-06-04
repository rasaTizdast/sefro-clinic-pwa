export type PatientStatus = "active" | "inactive" | "new";

export interface Patient {
  id: number;
  name: string;
  phone: string;
  nationalCode: string;
  birthDate: string;
  address: string;
  notes: string;
  lastVisit: string;
  visitCount: number;
  debt: number;
  status: PatientStatus;
  createdAt: string;
}

export interface PatientFormData {
  name: string;
  phone: string;
  nationalCode: string;
  birthDate: string;
  address: string;
  notes: string;
}
