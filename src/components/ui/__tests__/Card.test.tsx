import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Card, CardDescription,CardHeader, CardTitle } from "../Card";

describe("Card", () => {
  it("renders children", () => {
    render(<Card>محتوای کارت</Card>);
    expect(screen.getByText("محتوای کارت")).toBeInTheDocument();
  });

  it("applies default variant classes", () => {
    const { container } = render(<Card>پیش‌فرض</Card>);
    expect(container.firstChild).toHaveClass("bg-white");
  });

  it("applies outlined variant classes", () => {
    const { container } = render(<Card variant="outlined">آউتلاین</Card>);
    expect(container.firstChild).toHaveClass("border-2");
    expect(container.firstChild).toHaveClass("border-surface-200");
  });

  it("applies elevated variant classes", () => {
    const { container } = render(<Card variant="elevated">بالا</Card>);
    expect(container.firstChild).toHaveClass("shadow-md");
    expect(container.firstChild).toHaveClass("hover:shadow-lg");
  });

  it("applies padding classes", () => {
    const { container } = render(<Card padding="sm">کم</Card>);
    expect(container.firstChild?.firstChild).toHaveClass("p-3");
  });

  it("applies lg padding", () => {
    const { container } = render(<Card padding="lg">بسیار</Card>);
    expect(container.firstChild?.firstChild).toHaveClass("p-6");
  });

  it("renders header when provided", () => {
    render(<Card header={<div data-testid="header">هدر</div>}>محتوای تست</Card>);
    expect(screen.getByTestId("header")).toBeInTheDocument();
  });

  it("renders title in content area", () => {
    render(<Card title="عنوان کارت">محتوای تست</Card>);
    expect(screen.getByText("عنوان کارت")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3 })).toBeInTheDocument();
  });

  it("renders footer when provided", () => {
    render(<Card footer={<button data-testid="footer-btn">اکشن</button>}>محتوای تست</Card>);
    expect(screen.getByTestId("footer-btn")).toBeInTheDocument();
  });

  it("renders both header and footer", () => {
    render(
      <Card
        header={<div data-testid="h">هدر</div>}
        footer={<div data-testid="f">فوتر</div>}
      >
        بدنه
      </Card>
    );
    expect(screen.getByTestId("h")).toBeInTheDocument();
    expect(screen.getByTestId("f")).toBeInTheDocument();
    expect(screen.getByText("بدنه")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(<Card className="custom-card">محتوای تست</Card>);
    expect(container.firstChild).toHaveClass("custom-card");
  });

  it("renders CardHeader with children", () => {
    render(<CardHeader><span data-testid="ch">هدر</span></CardHeader>);
    expect(screen.getByTestId("ch")).toBeInTheDocument();
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });

  it("renders CardTitle", () => {
    render(<CardTitle>عنوان</CardTitle>);
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("عنوان");
  });

  it("renders CardDescription", () => {
    render(<CardDescription>توضیح</CardDescription>);
    expect(screen.getByText("توضیح")).toBeInTheDocument();
    expect(screen.getByRole("paragraph")).toHaveClass("text-sm");
  });
});