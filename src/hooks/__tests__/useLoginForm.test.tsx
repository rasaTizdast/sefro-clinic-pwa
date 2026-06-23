import { renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { ToastProvider } from "../../components/ui";
import { AuthProvider } from "../../contexts/AuthContext";
import { useLoginForm } from "../useLoginForm";

vi.mock("../../lib/api-client", () => {
  const mockApiClient = {
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
    get: vi.fn().mockRejectedValue(new Error("Not authenticated")),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };
  return { apiClient: mockApiClient };
});

describe("useLoginForm", () => {
  it("returns initial idle state", () => {
    const { result } = renderHook(() => useLoginForm(), {
      wrapper: ({ children }) => (
        <MemoryRouter>
          <AuthProvider>
            <ToastProvider>{children}</ToastProvider>
          </AuthProvider>
        </MemoryRouter>
      ),
    });

    expect(result.current.state.status).toBe("idle");
    expect(result.current.state.errors).toEqual({});
    expect(result.current.state.message).toBeNull();
  });

  it("provides formAction and isPending", () => {
    const { result } = renderHook(() => useLoginForm(), {
      wrapper: ({ children }) => (
        <MemoryRouter>
          <AuthProvider>
            <ToastProvider>{children}</ToastProvider>
          </AuthProvider>
        </MemoryRouter>
      ),
    });

    expect(typeof result.current.formAction).toBe("function");
    expect(typeof result.current.isPending).toBe("boolean");
  });
});
