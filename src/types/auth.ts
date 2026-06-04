export interface LoginState {
  status: "idle" | "success" | "error";
  errors: Partial<Record<"identifier" | "password", string>>;
  message: string | null;
  rememberMe: boolean;
}
