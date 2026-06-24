import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ToastProvider, useToast } from "../Toast";

vi.mock("sonner", async () => {
  const actual = await vi.importActual("sonner");
  return {
    ...actual,
    Toaster: () => <div data-testid="toaster" />,
    toast: {
      success: vi.fn().mockReturnValue("toast-id"),
      error: vi.fn().mockReturnValue("toast-id"),
      warning: vi.fn().mockReturnValue("toast-id"),
      info: vi.fn().mockReturnValue("toast-id"),
      dismiss: vi.fn(),
    },
  };
});

import { toast as sonnerToast } from "sonner";

function TestConsumer({ action }: { action: (hooks: ReturnType<typeof useToast>) => void }) {
  const hooks = useToast();
  return <button onClick={() => action(hooks)}>Do Action</button>;
}

describe("ToastProvider", () => {
  it("renders Toaster component", () => {
    render(<ToastProvider><div>child</div></ToastProvider>);
    expect(screen.getByTestId("toaster")).toBeInTheDocument();
  });

  it("renders children", () => {
    render(<ToastProvider><div data-testid="child">child</div></ToastProvider>);
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("provides context without error", () => {
    expect(() =>
      render(
        <ToastProvider>
          <TestConsumer action={() => {}} />
        </ToastProvider>
      )
    ).not.toThrow();
  });
});

describe("useToast", () => {
  it("throws when used outside ToastProvider", () => {
    const TestBad = () => {
      useToast();
      return null;
    };
    expect(() => render(<TestBad />)).toThrow("useToast must be used inside ToastProvider");
  });

  it("success calls sonner toast.success", async () => {
    const user = (await import("@testing-library/user-event")).default.setup();
    render(
      <ToastProvider>
        <TestConsumer action={(hooks) => hooks.success("Success!")} />
      </ToastProvider>
    );
    await user.click(screen.getByText("Do Action"));
    expect(sonnerToast.success).toHaveBeenCalledWith("Success!", { description: undefined });
  });

  it("error calls sonner toast.error", async () => {
    const user = (await import("@testing-library/user-event")).default.setup();
    render(
      <ToastProvider>
        <TestConsumer action={(hooks) => hooks.error("Error!")} />
      </ToastProvider>
    );
    await user.click(screen.getByText("Do Action"));
    expect(sonnerToast.error).toHaveBeenCalledWith("Error!", { description: undefined });
  });

  it("warning calls sonner toast.warning", async () => {
    const user = (await import("@testing-library/user-event")).default.setup();
    render(
      <ToastProvider>
        <TestConsumer action={(hooks) => hooks.warning("Warning!")} />
      </ToastProvider>
    );
    await user.click(screen.getByText("Do Action"));
    expect(sonnerToast.warning).toHaveBeenCalledWith("Warning!", { description: undefined });
  });

  it("info calls sonner toast.info", async () => {
    const user = (await import("@testing-library/user-event")).default.setup();
    render(
      <ToastProvider>
        <TestConsumer action={(hooks) => hooks.info("Info!")} />
      </ToastProvider>
    );
    await user.click(screen.getByText("Do Action"));
    expect(sonnerToast.info).toHaveBeenCalledWith("Info!", { description: undefined });
  });

  it("success with description passes it through", async () => {
    const user = (await import("@testing-library/user-event")).default.setup();
    render(
      <ToastProvider>
        <TestConsumer action={(hooks) => hooks.success("Saved", "Item saved successfully")} />
      </ToastProvider>
    );
    await user.click(screen.getByText("Do Action"));
    expect(sonnerToast.success).toHaveBeenCalledWith("Saved", {
      description: "Item saved successfully",
    });
  });

  it("showToast calls correct sonner method based on type", async () => {
    const user = (await import("@testing-library/user-event")).default.setup();
    render(
      <ToastProvider>
        <TestConsumer
          action={(hooks) => hooks.showToast({ title: "Test", type: "error" })}
        />
      </ToastProvider>
    );
    await user.click(screen.getByText("Do Action"));
    expect(sonnerToast.error).toHaveBeenCalledWith("Test", {
      description: undefined,
      duration: 4500,
    });
  });

  it("dismissToast calls sonner dismiss", async () => {
    const user = (await import("@testing-library/user-event")).default.setup();
    render(
      <ToastProvider>
        <TestConsumer action={(hooks) => hooks.dismissToast("some-id")} />
      </ToastProvider>
    );
    await user.click(screen.getByText("Do Action"));
    expect(sonnerToast.dismiss).toHaveBeenCalledWith("some-id");
  });

  it("returns toast id from success", async () => {
    let returnedId: string | undefined;
    const user = (await import("@testing-library/user-event")).default.setup();
    render(
      <ToastProvider>
        <TestConsumer
          action={(hooks) => {
            returnedId = hooks.success("Test");
          }}
        />
      </ToastProvider>
    );
    await user.click(screen.getByText("Do Action"));
    expect(returnedId).toBe("toast-id");
  });
});