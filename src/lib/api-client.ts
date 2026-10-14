import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

import { API_URL, endpoints } from "../config/api";
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

/** Single-flight refresh: concurrent 401s share one POST so rotation+blacklist can't kill siblings. */
let refreshPromise: Promise<void> | null = null;

/** Last successful token rotation (login or refresh). null = never (fresh page load). */
let lastRotatedAt: number | null = null;

/** Access-cookie lifetime is 15 min server-side; rotate before it expires. */
const TOKEN_MAX_AGE_MS = 13 * 60 * 1000;

function markRotated() {
  lastRotatedAt = Date.now();
}

function doRefresh(): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
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
      markRotated();
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 10_000,
  headers: { "Content-Type": "application/json" },
});

/**
 * Proactively rotate the session cookies before a burst of unsafe requests
 * (checkout posts customer → visit → consumption → sale in one click; the first
 * 401 mid-burst can fail siblings before the single-flight refresh lands).
 * Never throws — an expired session still falls through to the 401 interceptor.
 */
export async function ensureFreshToken(): Promise<void> {
  try {
    await doRefresh();
  } catch {
    // Session really is dead; the upcoming request's 401 will redirect to login.
  }
}

/**
 * Record the moment fresh session cookies were issued (after a successful
 * login) so the proactive-refresh interceptor stays quiet for the next
 * TOKEN_MAX_AGE_MS.
 */
export function markSessionFresh(): void {
  markRotated();
}

apiClient.interceptors.request.use(async (config) => {
  const method = (config.method ?? "GET").toUpperCase();
  // Only rotate around unsafe requests; GETs are harmless and e2e mocks
  // stub the refresh endpoint with 401.
  if (!SAFE_METHODS.has(method) && config.url !== endpoints.auth.refresh) {
    if (lastRotatedAt === null || Date.now() - lastRotatedAt > TOKEN_MAX_AGE_MS) {
      try {
        await doRefresh(); // single-flight
      } catch {
        // Session really dead — let the request go; the 401 interceptor handles redirect.
      }
    }
  }
  return config;
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
        await doRefresh();
        return apiClient(originalRequest);
      } catch {
        const authPath = `${BASE_PATH}/auth`;
        if (window.location.pathname !== authPath) {
          // Preserve where the employee was so login can return here instead of losing work.
          const next = encodeURIComponent(window.location.pathname + window.location.search);
          window.location.href = `${authPath}?next=${next}`;
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
