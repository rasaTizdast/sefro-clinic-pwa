export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface DrfPaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedRequest {
  page?: number;
  perPage?: number;
  sort?: string;
  order?: "asc" | "desc";
  search?: string;
}

export interface ApiError {
  message: string;
  code?: string;
  raw?: Record<string, unknown>;
}
