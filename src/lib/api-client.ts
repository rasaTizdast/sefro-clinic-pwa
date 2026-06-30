import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

import { API_URL } from "../config/api";
import type { ApiError } from "../types/api";
import { toCamelCase, toSnakeCase } from "./transform";

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 10_000,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  if (config.data && config.data instanceof FormData === false) {
    config.data = toSnakeCase(config.data) as Record<string, unknown>;
  }
  if (config.params) {
    config.params = toSnakeCase(config.params) as Record<string, unknown>;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    if (response.data && typeof response.data === "object") {
      response.data = toCamelCase(response.data);
    }
    return response;
  },
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    if (!originalRequest) return Promise.reject(error);

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        await axios.post(`${API_URL}/auth/token/refresh/`, {}, { withCredentials: true });
        return apiClient(originalRequest);
      } catch {
        if (window.location.pathname !== "/auth") {
          window.location.href = "/auth";
        }
        return Promise.reject(error);
      }
    }

    const responseData = error.response?.data as Record<string, unknown> | undefined;
    const normalized: ApiError = {
      message:
        (responseData?.detail as string) ??
        (responseData?.message as string) ??
        error.message ??
        "خطای ناشناخته",
      code: error.code,
      raw: responseData,
    };

    return Promise.reject(normalized);
  }
);
