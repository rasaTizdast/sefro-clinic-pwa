import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Modal } from "../Modal";

describe("Modal", () => {
  it("renders children when open", () => {
    render(<Modal open onClose={() => {}}><p>محتوا</p></Modal>);
    expect(screen.getByText("محتوا")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(<Modal open={false} onClose={() => {}}><p>محتوا</p></Modal>);
    expect(screen.queryByText("محتوا")).not.toBeInTheDocument();
  });

  it("renders title when provided", () => {
    render(<Modal open onClose={() => {}} title="عنوان مودال"><p>محتوا</p></Modal>);
    expect(screen.getByText("عنوان مودال")).toBeInTheDocument();
  });

  it("renders dialog as heading", () => {
    render(<Modal open onClose={() => {}} title="عنوان"><p>محتوا</p></Modal>);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("عنوان");
  });

  it("renders footer when provided", () => {
    render(
      <Modal open onClose={() => {}} footer={<button data-testid="footer-btn">ذخیره</button>}>
        <p>محتوا</p>
      </Modal>
    );
    expect(screen.getByTestId("footer-btn")).toBeInTheDocument();
  });

  it("renders close button when title is provided", () => {
    render(<Modal open onClose={() => {}} title="عنوان"><p>محتوا</p></Modal>);
    expect(screen.getByRole("button", { name: "بستن" })).toBeInTheDocument();
  });

  it("does not render close button when no title", () => {
    render(<Modal open onClose={() => {}}><p>محتوا</p></Modal>);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("calls onClose when close button clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<Modal open onClose={onClose} title="عنوان"><p>محتوا</p></Modal>);
    await user.click(screen.getByRole("button", { name: "بستن" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("applies size class for sm", () => {
    const { container } = render(<Modal open onClose={() => {}} size="sm"><p>محتوا</p></Modal>);
    expect(container.querySelector("dialog")).toHaveClass("max-w-sm");
  });

  it("applies size class for lg", () => {
    const { container } = render(<Modal open onClose={() => {}} size="lg"><p>محتوا</p></Modal>);
    expect(container.querySelector("dialog")).toHaveClass("max-w-lg");
  });

  it("applies size class for xl", () => {
    const { container } = render(<Modal open onClose={() => {}} size="xl"><p>محتوا</p></Modal>);
    expect(container.querySelector("dialog")).toHaveClass("max-w-xl");
  });

  it("applies size class for 2xl", () => {
    const { container } = render(<Modal open onClose={() => {}} size="2xl"><p>محتوا</p></Modal>);
    expect(container.querySelector("dialog")).toHaveClass("max-w-2xl");
  });

  it("applies default md size", () => {
    const { container } = render(<Modal open onClose={() => {}}><p>محتوا</p></Modal>);
    expect(container.querySelector("dialog")).toHaveClass("max-w-md");
  });
});