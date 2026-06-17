import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Alert } from "../Alert";

describe("Alert", () => {
  it("renders children", () => {
    render(<Alert>محتوای اخطار</Alert>);
    expect(screen.getByText("محتوای اخطار")).toBeInTheDocument();
  });

  it("renders title", () => {
    render(<Alert title="عنوان">متن</Alert>);
    expect(screen.getByText("عنوان")).toBeInTheDocument();
  });

  it("applies variant classes", () => {
    const { container } = render(<Alert variant="error">خطا</Alert>);
    expect(container.firstChild).toHaveClass("bg-danger-50/80");
  });

  it("has role alert", () => {
    render(<Alert>متن</Alert>);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("renders dismiss button when dismissible", () => {
    const onDismiss = vi.fn();
    render(
      <Alert dismissible onDismiss={onDismiss}>
        متن
      </Alert>
    );
    expect(screen.getByRole("button", { name: "بستن" })).toBeInTheDocument();
  });

  it("calls onDismiss when dismiss button clicked", async () => {
    const onDismiss = vi.fn();
    const user = userEvent.setup();
    render(
      <Alert dismissible onDismiss={onDismiss}>
        متن
      </Alert>
    );
    await user.click(screen.getByRole("button", { name: "بستن" }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("does not render dismiss button when dismissible is false", () => {
    render(<Alert>متن</Alert>);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
