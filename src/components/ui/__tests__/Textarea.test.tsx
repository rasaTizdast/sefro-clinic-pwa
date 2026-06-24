import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Textarea } from "../Textarea";

describe("Textarea", () => {
  it("renders textarea element", () => {
    render(<Textarea />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("renders label when provided", () => {
    render(<Textarea label="توضیحات" />);
    expect(screen.getByLabelText("توضیحات")).toBeInTheDocument();
  });

  it("associates label with textarea via for attribute", () => {
    render(<Textarea label="توضیحات" />);
    const label = screen.getByText("توضیحات");
    const textarea = screen.getByRole("textbox");
    expect(label).toHaveAttribute("for", textarea.id);
  });

  it("generates id from label when no id provided", () => {
    render(<Textarea label="توضیحات اضافی" />);
    const textarea = screen.getByRole("textbox");
    expect(textarea.id).toBe("توضیحات-اضافی");
  });

  it("uses provided id", () => {
    render(<Textarea id="custom-id" label="برچسب" />);
    const textarea = screen.getByRole("textbox");
    expect(textarea.id).toBe("custom-id");
  });

  it("renders error message with role alert", () => {
    render(<Textarea label="توضیحات" error="این فیلد الزامی است" />);
    expect(screen.getByRole("alert")).toHaveTextContent("این فیلد الزامی است");
  });

  it("sets aria-invalid when error is present", () => {
    render(<Textarea label="توضیحات" error="خطا" />);
    expect(screen.getByLabelText("توضیحات")).toHaveAttribute("aria-invalid", "true");
  });

  it("renders helper text when no error", () => {
    render(<Textarea label="توضیحات" helperText="حداکثر 500 کاراکتر" />);
    expect(screen.getByText("حداکثر 500 کاراکتر")).toBeInTheDocument();
  });

  it("does not show helper text when error is present", () => {
    render(<Textarea label="توضیحات" error="خطا" helperText="راهنما" />);
    expect(screen.getByRole("alert")).toHaveTextContent("خطا");
    expect(screen.queryByText("راهنما")).not.toBeInTheDocument();
  });

  it("sets aria-describedby to error id when error present", () => {
    render(<Textarea label="توضیحات" error="خطا" />);
    const textarea = screen.getByLabelText("توضیحات");
    expect(textarea).toHaveAttribute("aria-describedby", expect.stringContaining("-error"));
  });

  it("sets aria-describedby to helper id when helper present and no error", () => {
    render(<Textarea label="توضیحات" helperText="راهنما" />);
    const textarea = screen.getByLabelText("توضیحات");
    expect(textarea).toHaveAttribute("aria-describedby", expect.stringContaining("-helper"));
  });

  it("calls onChange when typing", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Textarea label="توضیحات" onChange={onChange} />);
    await user.type(screen.getByLabelText("توضیحات"), "تست");
    expect(onChange).toHaveBeenCalled();
  });

  it("applies disabled styles", () => {
    render(<Textarea label="توضیحات" disabled />);
    expect(screen.getByLabelText("توضیحات")).toBeDisabled();
    expect(screen.getByLabelText("توضیحات")).toHaveClass("disabled:bg-surface-50");
  });

  it("forwards ref", () => {
    const ref = vi.fn();
    render(<Textarea ref={ref} />);
    expect(ref).toHaveBeenCalledWith(expect.any(HTMLTextAreaElement));
  });

  it("applies custom className", () => {
    const { container } = render(<Textarea className="custom-textarea" />);
    expect(container.querySelector("textarea")).toHaveClass("custom-textarea");
  });

  it("has min-height", () => {
    const { container } = render(<Textarea />);
    expect(container.querySelector("textarea")).toHaveClass("min-h-[80px]");
  });

  it("allows resize vertical", () => {
    const { container } = render(<Textarea />);
    expect(container.querySelector("textarea")).toHaveClass("resize-y");
  });
});