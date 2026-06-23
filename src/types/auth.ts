export interface LoginState {
  status: "idle" | "success" | "error";
  errors: Partial<Record<"identifier" | "password", string>>;
  message: string | null;
  rememberMe: boolean;
}

export interface AuthUser {
  id: number;
  username: string;
  role: "admin" | "employee";
  dateJoined: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
}
