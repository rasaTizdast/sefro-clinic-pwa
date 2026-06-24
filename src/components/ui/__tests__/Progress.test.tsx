import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Progress } from "../Progress";

describe("Progress", () => {
  it("renders with role progressbar", () => {
    render(<Progress value={50} />);
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("sets aria-valuenow correctly", () => {
    render(<Progress value={75} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "75");
  });

  it("sets aria-valuemin to 0", () => {
    render(<Progress value={50} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuemin", "0");
  });

  it("sets aria-valuemax to default 100", () => {
    render(<Progress value={50} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuemax", "100");
  });

  it("sets aria-valuemax to custom max", () => {
    render(<Progress value={3} max={10} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuemax", "10");
  });

  it("clamps value to max", () => {
    render(<Progress value={150} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  });

  it("clamps value to 0", () => {
    render(<Progress value={-10} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  });

  it("applies default variant class", () => {
    const { container } = render(<Progress value={50} />);
    expect(container.querySelector('[class*="h-full"]')).toHaveClass("bg-primary-600");
  });

  it("applies success variant class", () => {
    const { container } = render(<Progress value={50} variant="success" />);
    expect(container.querySelector('[class*="h-full"]')).toHaveClass("bg-success-500");
  });

  it("applies warning variant class", () => {
    const { container } = render(<Progress value={50} variant="warning" />);
    expect(container.querySelector('[class*="h-full"]')).toHaveClass("bg-warning-500");
  });

  it("applies danger variant class", () => {
    const { container } = render(<Progress value={50} variant="danger" />);
    expect(container.querySelector('[class*="h-full"]')).toHaveClass("bg-danger-500");
  });

  it("applies info variant class", () => {
    const { container } = render(<Progress value={50} variant="info" />);
    expect(container.querySelector('[class*="h-full"]')).toHaveClass("bg-info-500");
  });

  it("applies sm size", () => {
    const { container } = render(<Progress value={50} size="sm" />);
    expect(container.firstChild?.firstChild).toHaveClass("h-1.5");
  });

  it("applies md size", () => {
    const { container } = render(<Progress value={50} size="md" />);
    expect(container.firstChild?.firstChild).toHaveClass("h-2.5");
  });

  it("shows percentage label when showLabel is true", () => {
    render(<Progress value={50} showLabel />);
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("does not show percentage label by default", () => {
    render(<Progress value={50} />);
    expect(screen.queryByText("50%")).not.toBeInTheDocument();
  });

  it("rounds percentage label", () => {
    render(<Progress value={33} max={100} showLabel />);
    expect(screen.getByText("33%")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(<Progress value={50} className="custom-progress" />);
    expect(container.firstChild).toHaveClass("custom-progress");
  });

  it("sets aria-label with percentage", () => {
    render(<Progress value={50} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-label", "50%");
  });
});