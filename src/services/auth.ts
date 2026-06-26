import { endpoints } from "../config/api";
import { apiClient } from "../lib/api-client";
import type { AuthUser } from "../types/auth";

export const login = (username: string, password: string) =>
  apiClient.post(endpoints.auth.token, { username, password });

export const logout = () => apiClient.post(endpoints.auth.logout);

export const getMe = async (): Promise<AuthUser> => {
  const { data } = await apiClient.get(endpoints.auth.me);
  return data as unknown as AuthUser;
};

export const listEmployees = async (): Promise<AuthUser[]> => {
  const { data } = await apiClient.get(endpoints.auth.employeesList);
  const raw = data as Record<string, unknown>;
  if (Array.isArray(raw)) return raw as unknown as AuthUser[];
  if (Array.isArray(raw.results)) return raw.results as unknown as AuthUser[];
  if (Array.isArray(raw.data)) return raw.data as unknown as AuthUser[];
  return [];
};

export const createEmployee = (employee: Record<string, unknown>) =>
  apiClient.post(endpoints.auth.employees, employee);

export const updateEmployee = (id: number, employee: Record<string, unknown>) =>
  apiClient.put(endpoints.auth.employee(id), employee);

export const deleteEmployee = (id: number) => apiClient.delete(endpoints.auth.employee(id));
