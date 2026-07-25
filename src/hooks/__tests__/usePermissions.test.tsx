import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { usePermissions } from "../usePermissions";

vi.mock("../../contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "../../contexts/AuthContext";
const mockUseAuth = vi.mocked(useAuth);

describe("usePermissions", () => {
  it("returns full permissions for admin", () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, username: "admin", role: "admin", dateJoined: "" },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    const { result } = renderHook(() => usePermissions());

    expect(result.current.canDelete).toBe(true);
    expect(result.current.canManageUsers).toBe(true);
    expect(result.current.canViewLogs).toBe(true);
  });

  it("returns restricted permissions for employee", () => {
    mockUseAuth.mockReturnValue({
      user: { id: 2, username: "doctor", role: "employee", dateJoined: "" },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    const { result } = renderHook(() => usePermissions());

    expect(result.current.canDelete).toBe(false);
    expect(result.current.canManageUsers).toBe(false);
    expect(result.current.canViewLogs).toBe(false);
  });

  it("returns all false when no user", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    const { result } = renderHook(() => usePermissions());

    expect(result.current.canDelete).toBe(false);
    expect(result.current.canManageUsers).toBe(false);
    expect(result.current.canViewLogs).toBe(false);
  });
});
