import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Spinner } from "../Spinner";

describe("Spinner", () => {
  it("renders with role status", () => {
    render(<Spinner />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("applies default size (md)", () => {
    const { container } = render(<Spinner />);
    expect(container.firstChild).toHaveClass("size-6");
  });

  it("applies sm size", () => {
    const { container } = render(<Spinner size="sm" />);
    expect(container.firstChild).toHaveClass("size-4");
  });

  it("applies lg size", () => {
    const { container } = render(<Spinner size="lg" />);
    expect(container.firstChild).toHaveClass("size-8");
  });

  it("has animate-spin class", () => {
    const { container } = render(<Spinner />);
    expect(container.firstChild).toHaveClass("animate-spin");
  });

  it("applies custom className", () => {
    const { container } = render(<Spinner className="custom-spinner" />);
    expect(container.firstChild).toHaveClass("custom-spinner");
  });

  it("renders SVG with correct structure", () => {
    const { container } = render(<Spinner />);
    const svg = container.querySelector("svg")!;
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("viewBox", "0 0 24 24");
    expect(svg.querySelector("circle")).toBeInTheDocument();
    expect(svg.querySelector("path")).toBeInTheDocument();
  });
});