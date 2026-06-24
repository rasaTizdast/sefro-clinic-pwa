import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EmptyState } from "../EmptyState";

describe("EmptyState", () => {
  it("renders title", () => {
    render(<EmptyState title="داده‌ای وجود ندارد" />);
    expect(screen.getByText("داده‌ای وجود ندارد")).toBeInTheDocument();
  });

  it("renders title as heading", () => {
    render(<EmptyState title="عنوان" />);
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("عنوان");
  });

  it("renders description when provided", () => {
    render(<EmptyState title="عنوان" description="توضیحات خالی" />);
    expect(screen.getByText("توضیحات خالی")).toBeInTheDocument();
  });

  it("renders default icon when no icon provided", () => {
    const { container } = render(<EmptyState title="عنوان" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("renders custom icon when provided", () => {
    render(<EmptyState title="عنوان" icon={<span data-testid="custom-icon">🔍</span>} />);
    expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
  });

  it("renders action when provided", () => {
    render(
      <EmptyState
        title="عنوان"
        action={<button data-testid="action-btn">ایجاد</button>}
      />
    );
    expect(screen.getByTestId("action-btn")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(<EmptyState title="عنوان" className="custom-empty" />);
    expect(container.firstChild).toHaveClass("custom-empty");
  });

  it("does not render description when not provided", () => {
    render(<EmptyState title="عنوان" />);
    expect(screen.queryByRole("paragraph")).not.toBeInTheDocument();
  });

  it("does not render action when not provided", () => {
    const { container } = render(<EmptyState title="عنوان" />);
    expect(container.querySelector("button")).not.toBeInTheDocument();
  });
});