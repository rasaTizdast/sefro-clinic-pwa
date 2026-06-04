export type ServiceCategory = "زیبایی" | "درمانی" | "مشاوره" | "آزمایشگاهی";

export interface Service {
  id: number;
  title: string;
  category: ServiceCategory;
  duration: number;
  price: number;
  description: string;
  isActive: boolean;
}

export interface ServiceFormData {
  title: string;
  category: string;
  duration: string;
  price: string;
  description: string;
  isActive: boolean;
}
