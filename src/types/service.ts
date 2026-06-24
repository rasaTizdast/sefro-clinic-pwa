export interface Service {
  id: number;
  title: string;
  duration: number;
  price: number;
  description: string;
  isActive: boolean;
}

export interface ServiceFormData {
  title: string;
  duration: number;
  price: number;
  description: string;
  isActive: boolean;
}
