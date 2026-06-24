import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { ErrorFallback } from "../ErrorFallback";

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useRouteError: vi.fn(),
    isRouteErrorResponse: (error: unknown) =>
      typeof error === "object" && error !== null && "status" in error && "statusText" in error,
  };
});

import { useRouteError } from "react-router";
const mockUseRouteError = vi.mocked(useRouteError);

function renderError() {
  return render(
    <MemoryRouter>
      <ErrorFallback />
    </MemoryRouter>
  );
}

describe("ErrorFallback", () => {
  it("renders 404 error for route error with status 404", () => {
    mockUseRouteError.mockReturnValue({ status: 404, statusText: "Not Found" });
    renderError();
    expect(screen.getByText("404")).toBeInTheDocument();
    expect(screen.getByText("صفحه مورد نظر یافت نشد")).toBeInTheDocument();
  });

  it("renders 401 error for route error with status 401", () => {
    mockUseRouteError.mockReturnValue({ status: 401, statusText: "Unauthorized" });
    renderError();
    expect(screen.getByText("401")).toBeInTheDocument();
    expect(screen.getByText("دسترسی محدود")).toBeInTheDocument();
  });

  it("renders 403 error for route error with status 403", () => {
    mockUseRouteError.mockReturnValue({ status: 403, statusText: "Forbidden" });
    renderError();
    expect(screen.getByText("403")).toBeInTheDocument();
    expect(screen.getByText("دسترسی ممنوع")).toBeInTheDocument();
  });

  it("renders 500 error for route error with status 500", () => {
    mockUseRouteError.mockReturnValue({ status: 500, statusText: "Internal Server Error" });
    renderError();
    expect(screen.getByText("500")).toBeInTheDocument();
    expect(screen.getByText("خطای سرور")).toBeInTheDocument();
  });

  it("renders generic error for unknown route error status", () => {
    mockUseRouteError.mockReturnValue({ status: 418, statusText: "I'm a teapot" });
    renderError();
    expect(screen.getByText("418")).toBeInTheDocument();
    expect(screen.getByText("خطا")).toBeInTheDocument();
  });

  it("renders loading error for chunk/loading/fetch/network Error messages", () => {
    mockUseRouteError.mockReturnValue(new Error("Failed to load chunk"));
    renderError();
    expect(screen.getByText("خطا در بارگذاری صفحه")).toBeInTheDocument();
  });

  it("renders unexpected error for other Error instances", () => {
    mockUseRouteError.mockReturnValue(new Error("Something went wrong"));
    renderError();
    expect(screen.getByText("خطای غیرمنتظره")).toBeInTheDocument();
  });

  it("renders unexpected error for unknown error types", () => {
    mockUseRouteError.mockReturnValue("some string error");
    renderError();
    expect(screen.getByText("خطای غیرمنتظره")).toBeInTheDocument();
  });

  it("renders retry button", () => {
    mockUseRouteError.mockReturnValue({ status: 404, statusText: "Not Found" });
    renderError();
    expect(screen.getByRole("button", { name: "تلاش مجدد" })).toBeInTheDocument();
  });

  it("renders home page button", () => {
    mockUseRouteError.mockReturnValue({ status: 404, statusText: "Not Found" });
    renderError();
    expect(screen.getByRole("button", { name: "صفحه اصلی" })).toBeInTheDocument();
  });
});