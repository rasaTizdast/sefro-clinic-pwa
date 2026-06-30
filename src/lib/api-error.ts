import type { ApiError } from "../types/api";

function collectMessages(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(collectMessages);
  }
  if (typeof value === "object" && value !== null) {
    return Object.values(value).flatMap(collectMessages);
  }
  if (typeof value === "string") {
    return [value];
  }
  return [];
}

export function extractApiError(error: unknown): string {
  if (!error) return "خطای ناشناخته";

  if (typeof error === "string") return error;

  const apiErr = error as ApiError;
  const raw = apiErr.raw;

  if (raw && typeof raw === "object") {
    const messages = collectMessages(raw);
    if (messages.length > 0) return messages.join("، ");
  }

  return apiErr.message || "خطای ناشناخته";
}
