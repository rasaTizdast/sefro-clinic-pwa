import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Badge } from "../Badge";

describe("Badge", () => {
  it("renders children", () => {
    render(<Badge>فعال</Badge>);
    expect(screen.getByText("فعال")).toBeInTheDocument();
  });

  it("applies variant classes", () => {
    const { container } = render(<Badge variant="success">فعال</Badge>);
    expect(container.firstChild).toHaveClass("bg-success-100");
  });

  it("applies size classes", () => {
    const { container } = render(<Badge size="sm">کوچک</Badge>);
    expect(container.firstChild).toHaveClass("px-1.5");
  });

  it("renders dot indicator", () => {
    const { container } = render(<Badge dot>فعال</Badge>);
    const dot = container.querySelector("span.rounded-full");
    expect(dot).toBeInTheDocument();
  });

  it("renders as pill shape", () => {
    const { container } = render(<Badge pill>فعال</Badge>);
    expect(container.firstChild).toHaveClass("rounded-full");
  });

  it("renders as rounded-md by default", () => {
    const { container } = render(<Badge>فعال</Badge>);
    expect(container.firstChild).toHaveClass("rounded-md");
  });
});
