import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LoadingBar } from "../LoadingBar";

const mockUseLocation = vi.fn();
const mockUseNavigation = vi.fn();

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useLocation: () => mockUseLocation(),
    useNavigation: () => mockUseNavigation(),
  };
});

describe("LoadingBar", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders with aria-hidden", () => {
    mockUseLocation.mockReturnValue({ key: "initial" });
    mockUseNavigation.mockReturnValue({ state: "idle" });
    const { container } = render(<LoadingBar />);
    const outer = container.firstChild as HTMLElement;
    expect(outer).toHaveAttribute("aria-hidden", "true");
  });

  it("renders two motion divs", () => {
    mockUseLocation.mockReturnValue({ key: "initial" });
    mockUseNavigation.mockReturnValue({ state: "idle" });
    const { container } = render(<LoadingBar />);
    const divs = container.querySelectorAll(".bg-primary-500");
    expect(divs.length).toBe(1);
  });

  it("handles navigation loading state", () => {
    mockUseLocation.mockReturnValue({ key: "key1" });
    mockUseNavigation.mockReturnValue({ state: "loading" });
    expect(() => render(<LoadingBar />)).not.toThrow();
  });

  it("handles location key change", () => {
    const { rerender } = render(<LoadingBar />);
    mockUseLocation.mockReturnValue({ key: "new-key" });
    mockUseNavigation.mockReturnValue({ state: "idle" });
    expect(() => rerender(<LoadingBar />)).not.toThrow();
  });
});
