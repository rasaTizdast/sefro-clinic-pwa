export interface ServiceCategory {
  id: number;
  name: string;
}

export interface Service {
  id: number;
  title: string;
  category: string;
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
