import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

import { API_URL } from "../config/api";
import type { ApiError } from "../types/api";
import { toCamelCase, toSnakeCase } from "./transform";

const BASE_PATH = import.meta.env.DEV ? "" : "/dashboard";

const CSRF_COOKIE_NAME = "csrftoken";
const CSRF_HEADER_NAME = "X-CSRFToken";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS", "TRACE"]);

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

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
  const method = (config.method ?? "GET").toUpperCase();
  if (!SAFE_METHODS.has(method)) {
    const token = readCookie(CSRF_COOKIE_NAME);
    if (token) config.headers.set(CSRF_HEADER_NAME, token);
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
        const csrfToken = readCookie(CSRF_COOKIE_NAME);
        const refreshHeaders: Record<string, string> = { "Content-Type": "application/json" };
        if (csrfToken) refreshHeaders[CSRF_HEADER_NAME] = csrfToken;
        await axios.post(
          `${API_URL}/auth/token/refresh/`,
          {},
          {
            withCredentials: true,
            headers: refreshHeaders,
          }
        );
        return apiClient(originalRequest);
      } catch {
        if (window.location.pathname !== `${BASE_PATH}/auth`) {
          window.location.href = `${BASE_PATH}/auth`;
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
