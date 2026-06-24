import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Toggle } from "../Toggle";

describe("Toggle", () => {
  it("renders checkbox input", () => {
    render(<Toggle />);
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeInTheDocument();
  });

  it("renders label when provided", () => {
    render(<Toggle label="فعال" />);
    expect(screen.getByText("فعال")).toBeInTheDocument();
  });

  it("associates label with checkbox via for attribute", () => {
    render(<Toggle label="فعال" />);
    const label = screen.getByText("فعال").closest("label");
    const checkbox = screen.getByRole("checkbox");
    expect(label).toHaveAttribute("for", checkbox.id);
  });

  it("generates id from label when no id provided", () => {
    render(<Toggle label="وضعیت فعال" />);
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox.id).toBe("وضعیت-فعال");
  });

  it("uses provided id", () => {
    render(<Toggle id="custom-id" label="برچسب" />);
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox.id).toBe("custom-id");
  });

  it("is unchecked by default", () => {
    render(<Toggle />);
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });

  it("can be checked via defaultChecked", () => {
    render(<Toggle defaultChecked />);
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("calls onChange when clicked", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Toggle onChange={onChange} />);
    await user.click(screen.getByRole("checkbox"));
    expect(onChange).toHaveBeenCalledOnce();
  });

  it("applies disabled styles when disabled", () => {
    const { container } = render(<Toggle disabled label="غیرفعال" />);
    expect(container.firstChild).toHaveClass("cursor-not-allowed");
    expect(container.firstChild).toHaveClass("opacity-50");
    expect(screen.getByRole("checkbox")).toBeDisabled();
  });

  it("does not call onChange when disabled", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Toggle disabled onChange={onChange} />);
    await user.click(screen.getByRole("checkbox"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("applies custom className", () => {
    const { container } = render(<Toggle className="custom-toggle" />);
    expect(container.firstChild).toHaveClass("custom-toggle");
  });

  it("forwards additional props to input", () => {
    render(<Toggle name="toggle-name" />);
    expect(screen.getByRole("checkbox")).toHaveAttribute("name", "toggle-name");
  });
});