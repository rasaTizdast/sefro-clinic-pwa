import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Avatar } from "../Avatar";

describe("Avatar", () => {
  it("renders image when src is provided", () => {
    render(<Avatar src="/avatar.png" alt="User" />);
    const img = screen.getByAltText("User");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "/avatar.png");
  });

  it("renders initials from name when no src", () => {
    render(<Avatar name="علی رضایی" />);
    expect(screen.getByText("عر")).toBeInTheDocument();
  });

  it("renders single initial when name has one part", () => {
    render(<Avatar name="علی" />);
    expect(screen.getByText("ع")).toBeInTheDocument();
  });

  it("renders default fallback svg when no src or name", () => {
    render(<Avatar />);
    const { container } = render(<Avatar />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("renders custom fallback when provided", () => {
    render(<Avatar fallback={<span data-testid="custom">?</span>} />);
    expect(screen.getByTestId("custom")).toBeInTheDocument();
  });

  it("applies size classes to inner element", () => {
    const { container } = render(<Avatar size="lg" name="علی" />);
    const innerSpan = container.querySelector("span > span");
    expect(innerSpan).toHaveClass("size-12");
  });

  it("renders status indicator with correct color for online", () => {
    const { container } = render(<Avatar name="علی" status="online" />);
    const status = container.querySelector(".bg-success-500");
    expect(status).toBeInTheDocument();
  });

  it("renders status indicator with correct color for offline", () => {
    const { container } = render(<Avatar name="علی" status="offline" />);
    const status = container.querySelector(".bg-surface-400");
    expect(status).toBeInTheDocument();
  });

  it("renders status indicator with correct color for away", () => {
    const { container } = render(<Avatar name="علی" status="away" />);
    const status = container.querySelector(".bg-warning-500");
    expect(status).toBeInTheDocument();
  });

  it("renders status indicator with correct color for busy", () => {
    const { container } = render(<Avatar name="علی" status="busy" />);
    const status = container.querySelector(".bg-danger-500");
    expect(status).toBeInTheDocument();
  });

  it("applies status size based on avatar size", () => {
    const { container } = render(<Avatar name="علی" size="lg" status="online" />);
    const status = container.querySelector(".size-3\\.5");
    expect(status).toBeInTheDocument();
  });

  it("sets aria-label on inner span when name provided", () => {
    const { container } = render(<Avatar name="علی رضایی" />);
    const innerSpan = container.querySelector("span > span");
    expect(innerSpan).toHaveAttribute("aria-label", "علی رضایی");
  });

  it("applies custom className", () => {
    const { container } = render(<Avatar className="custom-class" />);
    expect(container.firstChild).toHaveClass("custom-class");
  });
});