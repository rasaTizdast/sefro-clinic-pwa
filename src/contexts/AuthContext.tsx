import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";

import { endpoints } from "../config/api";
import { apiClient } from "../lib/api-client";
import type { AuthUser } from "../types/auth";

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await apiClient.get(endpoints.auth.me);
        setUser(data as unknown as AuthUser);
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    await apiClient.post(endpoints.auth.token, { username, password });
    const { data } = await apiClient.get(endpoints.auth.me);
    setUser(data as unknown as AuthUser);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.post(endpoints.auth.logout);
    } finally {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
