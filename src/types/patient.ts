import type { Service } from "./service";
import type { WarehouseItem } from "./warehouse";

export type PatientStatus = "active" | "inactive" | "new";

export interface Patient {
  id: number;
  firstName: string;
  lastName: string;
  mobileNumber: string;
  nationalId: string;
  bitmojiCode: string;
  lastVisit: string;
  visitCount: number;
  status: PatientStatus;
  createdAt: string;
  products: WarehouseItem[];
  services: Service[];
}

export interface PatientFormData {
  firstName: string;
  lastName: string;
  mobileNumber: string;
  nationalId: string;
  bitmojiCode: string;
}
