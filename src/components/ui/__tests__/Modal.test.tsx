import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Modal } from "../Modal";
import { PortalTargetContext } from "../PortalTargetContext";

describe("Modal", () => {
  afterEach(() => {
    document.body.style.overflow = "";
  });

  it("renders children when open", () => {
    render(
      <Modal open onClose={() => {}}>
        <p>محتوا</p>
      </Modal>
    );
    expect(screen.getByText("محتوا")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(
      <Modal open={false} onClose={() => {}}>
        <p>محتوا</p>
      </Modal>
    );
    expect(screen.queryByText("محتوا")).not.toBeInTheDocument();
  });

  it("renders title when provided", () => {
    render(
      <Modal open onClose={() => {}} title="عنوان مودال">
        <p>محتوا</p>
      </Modal>
    );
    expect(screen.getByText("عنوان مودال")).toBeInTheDocument();
  });

  it("renders dialog as heading", () => {
    render(
      <Modal open onClose={() => {}} title="عنوان">
        <p>محتوا</p>
      </Modal>
    );
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
    render(
      <Modal open onClose={() => {}} title="عنوان">
        <p>محتوا</p>
      </Modal>
    );
    expect(screen.getByRole("button", { name: "بستن" })).toBeInTheDocument();
  });

  it("does not render close button when no title", () => {
    render(
      <Modal open onClose={() => {}}>
        <p>محتوا</p>
      </Modal>
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("calls onClose when close button clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Modal open onClose={onClose} title="عنوان">
        <p>محتوا</p>
      </Modal>
    );
    await user.click(screen.getByRole("button", { name: "بستن" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose on Escape key", () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose}>
        <p>محتوا</p>
      </Modal>
    );
    const dialog = screen.getByRole("dialog");
    dialog.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when backdrop clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Modal open onClose={onClose}>
        <p>محتوا</p>
      </Modal>
    );
    const backdrop = document.querySelector(".fixed.inset-0.z-40");
    expect(backdrop).toBeInTheDocument();
    await user.click(backdrop!);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does not call onClose when dialog content clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Modal open onClose={onClose}>
        <p>محتوا</p>
      </Modal>
    );
    await user.click(screen.getByText("محتوا"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("locks body scroll when open", () => {
    render(
      <Modal open onClose={() => {}}>
        <p>محتوا</p>
      </Modal>
    );
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("restores body scroll when closed", () => {
    const { rerender } = render(
      <Modal open onClose={() => {}}>
        <p>محتوا</p>
      </Modal>
    );
    expect(document.body.style.overflow).toBe("hidden");
    rerender(
      <Modal open={false} onClose={() => {}}>
        <p>محتوا</p>
      </Modal>
    );
    expect(document.body.style.overflow).toBe("");
  });

  it("has role dialog", () => {
    render(
      <Modal open onClose={() => {}}>
        <p>محتوا</p>
      </Modal>
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("has aria-modal true", () => {
    render(
      <Modal open onClose={() => {}}>
        <p>محتوا</p>
      </Modal>
    );
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
  });

  it("has aria-labelledby when title provided", () => {
    render(
      <Modal open onClose={() => {}} title="عنوان">
        <p>محتوا</p>
      </Modal>
    );
    const dialog = screen.getByRole("dialog");
    const labelledby = dialog.getAttribute("aria-labelledby");
    expect(labelledby).toBeTruthy();
    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading.id).toBe(labelledby);
  });

  it("does not have aria-labelledby when no title", () => {
    render(
      <Modal open onClose={() => {}}>
        <p>محتوا</p>
      </Modal>
    );
    expect(screen.getByRole("dialog")).not.toHaveAttribute("aria-labelledby");
  });

  it("applies size class for sm", () => {
    render(
      <Modal open onClose={() => {}} size="sm">
        <p>محتوا</p>
      </Modal>
    );
    expect(screen.getByRole("dialog")).toHaveClass("max-w-sm");
  });

  it("applies size class for lg", () => {
    render(
      <Modal open onClose={() => {}} size="lg">
        <p>محتوا</p>
      </Modal>
    );
    expect(screen.getByRole("dialog")).toHaveClass("max-w-lg");
  });

  it("applies size class for xl", () => {
    render(
      <Modal open onClose={() => {}} size="xl">
        <p>محتوا</p>
      </Modal>
    );
    expect(screen.getByRole("dialog")).toHaveClass("max-w-xl");
  });

  it("applies size class for 2xl", () => {
    render(
      <Modal open onClose={() => {}} size="2xl">
        <p>محتوا</p>
      </Modal>
    );
    expect(screen.getByRole("dialog")).toHaveClass("max-w-2xl");
  });

  it("applies default md size", () => {
    render(
      <Modal open onClose={() => {}}>
        <p>محتوا</p>
      </Modal>
    );
    expect(screen.getByRole("dialog")).toHaveClass("max-w-md");
  });

  it("unsets native dialog opposing insets for RTL centering", () => {
    render(
      <Modal open onClose={() => {}}>
        <p>محتوا</p>
      </Modal>
    );
    expect(screen.getByRole("dialog")).toHaveClass(
      "left-1/2",
      "right-auto",
      "bottom-auto",
      "-translate-x-1/2"
    );
  });

  it("provides PortalTargetContext with portal element", () => {
    let captured: HTMLElement | null = null;
    render(
      <Modal open onClose={() => {}}>
        <PortalTargetContext.Consumer>
          {(value) => {
            captured = value as HTMLElement | null;
            return null;
          }}
        </PortalTargetContext.Consumer>
      </Modal>
    );
    expect(captured).toBeInstanceOf(HTMLDivElement);
  });

  it("focuses first focusable element on open (close button when title given)", () => {
    render(
      <Modal open onClose={() => {}} title="عنوان">
        <input data-testid="first-input" type="text" />
      </Modal>
    );
    const closeBtn = screen.getByRole("button", { name: "بستن" });
    expect(document.activeElement).toBe(closeBtn);
  });

  it("restores body scroll only when last modal closes", () => {
    const { rerender } = render(
      <div>
        <Modal open onClose={() => {}}>
          <p>اول</p>
        </Modal>
      </div>
    );
    expect(document.body.style.overflow).toBe("hidden");

    rerender(
      <div>
        <Modal open onClose={() => {}}>
          <p>اول</p>
        </Modal>
        <Modal open onClose={() => {}}>
          <p>دوم</p>
        </Modal>
      </div>
    );
    expect(document.body.style.overflow).toBe("hidden");

    rerender(<div />);
    expect(document.body.style.overflow).toBe("");
  });
});
