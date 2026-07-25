import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { RedirectIfAuth, RequireAuth, RequireRole } from "../RouteGuard";

vi.mock("../../contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "../../contexts/AuthContext";
const mockUseAuth = vi.mocked(useAuth);

vi.mock("../../components/ui/Toast", () => ({
  useToast: vi.fn(() => ({
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  })),
}));

describe("RequireAuth", () => {
  it("shows loading spinner when isLoading is true", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
    });
    const { container } = render(
      <MemoryRouter>
        <RequireAuth />
      </MemoryRouter>
    );
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders children when authenticated", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: 1, username: "admin", role: "admin" } as never,
      login: vi.fn(),
      logout: vi.fn(),
    });
    render(
      <MemoryRouter initialEntries={["/protected"]}>
        <Routes>
          <Route element={<RequireAuth />}>
            <Route
              path="protected"
              element={<div data-testid="protected-content">Protected</div>}
            />
          </Route>
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByTestId("protected-content")).toBeInTheDocument();
  });

  it("redirects to /auth when not authenticated", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
    });
    render(
      <MemoryRouter initialEntries={["/protected"]}>
        <Routes>
          <Route element={<RequireAuth />}>
            <Route path="protected" element={<div>Protected</div>} />
          </Route>
          <Route path="auth" element={<div data-testid="auth-page">Auth</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByTestId("auth-page")).toBeInTheDocument();
  });
});

describe("RedirectIfAuth", () => {
  it("shows loading spinner when isLoading is true", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
    });
    const { container } = render(
      <MemoryRouter>
        <RedirectIfAuth />
      </MemoryRouter>
    );
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("redirects to / when already authenticated", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: 1, username: "admin", role: "admin" } as never,
      login: vi.fn(),
      logout: vi.fn(),
    });
    render(
      <MemoryRouter initialEntries={["/auth"]}>
        <Routes>
          <Route element={<RedirectIfAuth />}>
            <Route path="auth" element={<div>Auth Page</div>} />
          </Route>
          <Route path="/" element={<div data-testid="home-page">Home</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByTestId("home-page")).toBeInTheDocument();
  });

  it("renders children when not authenticated", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
    });
    render(
      <MemoryRouter initialEntries={["/auth"]}>
        <Routes>
          <Route element={<RedirectIfAuth />}>
            <Route path="auth" element={<div data-testid="auth-content">Auth</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByTestId("auth-content")).toBeInTheDocument();
  });
});

describe("RequireRole", () => {
  it("renders children when user role is allowed", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: 1, username: "admin", role: "admin", dateJoined: "" },
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter>
        <RequireRole allowedRoles={["admin"]}>
          <div data-testid="protected-content">Protected</div>
        </RequireRole>
      </MemoryRouter>
    );

    expect(screen.getByTestId("protected-content")).toBeInTheDocument();
  });

  it("redirects to / when user role is not allowed", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: 2, username: "doctor", role: "employee", dateJoined: "" },
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/logs"]}>
        <Routes>
          <Route
            path="/logs"
            element={
              <RequireRole allowedRoles={["admin"]}>
                <div>Logs</div>
              </RequireRole>
            }
          />
          <Route path="/" element={<div data-testid="home-page">Home</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId("home-page")).toBeInTheDocument();
  });

  it("shows loading spinner when isLoading", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
    });

    const { container } = render(
      <MemoryRouter>
        <RequireRole allowedRoles={["admin"]}>
          <div>Content</div>
        </RequireRole>
      </MemoryRouter>
    );

    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });
});
