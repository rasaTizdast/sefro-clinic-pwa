import { act,renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AuthProvider, useAuth } from "../AuthContext";

vi.mock("../../lib/api-client", () => ({
  apiClient: {
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import { apiClient } from "../../lib/api-client";
const mockApiClient = vi.mocked(apiClient);

function renderAuth() {
  return renderHook(() => useAuth(), {
    wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
  });
}

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading initially", () => {
    vi.mocked(mockApiClient.get).mockReturnValue(new Promise(() => {}));
    const { result } = renderAuth();
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it("sets user on successful initial load", async () => {
    const mockUser = { id: 1, username: "admin", role: "admin" };
    vi.mocked(mockApiClient.get).mockResolvedValue({ data: mockUser });
    const { result } = renderAuth();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
  });

  it("sets unauthenticated when initial load fails", async () => {
    vi.mocked(mockApiClient.get).mockRejectedValue(new Error("Unauthorized"));
    const { result } = renderAuth();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it("login calls API and updates user", async () => {
    vi.mocked(mockApiClient.get).mockRejectedValue(new Error("Unauthorized"));
    const { result } = renderAuth();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const mockUser = { id: 1, username: "admin", role: "admin" };
    vi.mocked(mockApiClient.post).mockResolvedValue({});
    vi.mocked(mockApiClient.get).mockResolvedValue({ data: mockUser });

    await act(async () => {
      await result.current.login("admin", "pass123");
    });
    expect(mockApiClient.post).toHaveBeenCalledWith(expect.any(String), {
      username: "admin",
      password: "pass123",
    });
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
  });

  it("logout calls API and clears user", async () => {
    const mockUser = { id: 1, username: "admin", role: "admin" };
    vi.mocked(mockApiClient.get).mockResolvedValue({ data: mockUser });
    const { result } = renderAuth();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(true);

    vi.mocked(mockApiClient.post).mockResolvedValue({});
    await act(async () => {
      await result.current.logout();
    });
    expect(mockApiClient.post).toHaveBeenCalledWith(expect.any(String));
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it("logout clears user even if API call fails", async () => {
    const mockUser = { id: 1, username: "admin", role: "admin" };
    vi.mocked(mockApiClient.get).mockResolvedValue({ data: mockUser });
    const { result } = renderAuth();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    vi.mocked(mockApiClient.post).mockRejectedValue(new Error("Network error"));
    await act(async () => {
      try {
        await result.current.logout();
      } catch {
        // Expected to throw, but user should still be cleared
      }
    });
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });
});

describe("useAuth", () => {
  it("throws when used outside AuthProvider", () => {
    expect(() => renderHook(() => useAuth())).toThrow(
      "useAuth must be used within AuthProvider"
    );
  });
});