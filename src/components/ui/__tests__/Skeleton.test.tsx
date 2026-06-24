import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Skeleton, SkeletonTable,SkeletonText } from "../Skeleton";

describe("Skeleton", () => {
  it("renders with default text variant", () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toHaveClass("animate-pulse");
    expect(container.firstChild).toHaveClass("bg-surface-200");
    expect(container.firstChild).toHaveClass("rounded");
  });

  it("applies circular variant", () => {
    const { container } = render(<Skeleton variant="circular" />);
    expect(container.firstChild).toHaveClass("rounded-full");
  });

  it("applies rectangular variant", () => {
    const { container } = render(<Skeleton variant="rectangular" />);
    expect(container.firstChild).toHaveClass("rounded-lg");
  });

  it("applies custom width and height", () => {
    const { container } = render(<Skeleton width="100px" height="20px" />);
    expect(container.firstChild).toHaveStyle({ width: "100px", height: "20px" });
  });

  it("has aria-hidden", () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
  });

  it("applies custom className", () => {
    const { container } = render(<Skeleton className="custom-skeleton" />);
    expect(container.firstChild).toHaveClass("custom-skeleton");
  });
});

describe("SkeletonText", () => {
  it("renders specified number of lines", () => {
    const { container } = render(<SkeletonText lines={4} />);
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons).toHaveLength(4);
  });

  it("renders 3 lines by default", () => {
    const { container } = render(<SkeletonText />);
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons).toHaveLength(3);
  });

  it("has aria-hidden on container", () => {
    const { container } = render(<SkeletonText />);
    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
  });
});

describe("SkeletonTable", () => {
  it("renders specified number of rows", () => {
    const { container } = render(<SkeletonTable rows={4} columns={2} />);
    const rows = container.querySelectorAll("[class*='flex']");
    expect(rows.length).toBeGreaterThanOrEqual(5);
  });

  it("has aria-hidden on container", () => {
    const { container } = render(<SkeletonTable />);
    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
  });

  it("applies custom className", () => {
    const { container } = render(<SkeletonTable className="custom-table" />);
    expect(container.firstChild).toHaveClass("custom-table");
  });
});