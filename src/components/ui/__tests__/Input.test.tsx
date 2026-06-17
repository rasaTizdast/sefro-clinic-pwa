import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Input } from "../Input";

describe("Input", () => {
  it("renders with label", () => {
    render(<Input label="نام" />);
    expect(screen.getByLabelText("نام")).toBeInTheDocument();
  });

  it("renders error message", () => {
    render(<Input label="نام" error="این فیلد الزامی است" />);
    expect(screen.getByRole("alert")).toHaveTextContent("این فیلد الزامی است");
  });

  it("renders helper text when no error", () => {
    render(<Input label="نام" helperText="نام خود را وارد کنید" />);
    expect(screen.getByText("نام خود را وارد کنید")).toBeInTheDocument();
  });

  it("does not show helper text when error is present", () => {
    render(<Input label="نام" error="خطا" helperText="راهنما" />);
    expect(screen.getByRole("alert")).toHaveTextContent("خطا");
    expect(screen.queryByText("راهنما")).not.toBeInTheDocument();
  });

  it("sets aria-invalid when error is present", () => {
    render(<Input label="نام" error="خطا" />);
    expect(screen.getByLabelText("نام")).toHaveAttribute("aria-invalid", "true");
  });

  it("calls onChange when typing", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Input label="نام" onChange={onChange} />);
    await user.type(screen.getByLabelText("نام"), "a");
    expect(onChange).toHaveBeenCalled();
  });

  it("renders with startIcon", () => {
    const { container } = render(<Input startIcon={<span data-testid="icon" />} />);
    expect(container.querySelector("[data-testid='icon']")).toBeInTheDocument();
  });

  it("disables the input element", () => {
    render(<Input label="نام" disabled />);
    expect(screen.getByLabelText("نام")).toBeDisabled();
  });
});
