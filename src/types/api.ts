export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface PaginatedRequest {
  page: number;
  perPage: number;
  sort?: string;
  order?: "asc" | "desc";
}

export interface ApiError {
  message: string;
  code?: string;
  field?: string;
}
