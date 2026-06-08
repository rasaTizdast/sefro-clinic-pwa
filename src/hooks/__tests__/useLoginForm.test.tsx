import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ToastProvider } from "../../components/ui";
import { useLoginForm } from "../useLoginForm";

describe("useLoginForm", () => {
  it("returns initial idle state", () => {
    const { result } = renderHook(() => useLoginForm(), {
      wrapper: ({ children }) => <ToastProvider>{children}</ToastProvider>,
    });

    expect(result.current.state.status).toBe("idle");
    expect(result.current.state.errors).toEqual({});
    expect(result.current.state.message).toBeNull();
  });

  it("provides formAction and isPending", () => {
    const { result } = renderHook(() => useLoginForm(), {
      wrapper: ({ children }) => <ToastProvider>{children}</ToastProvider>,
    });

    expect(typeof result.current.formAction).toBe("function");
    expect(typeof result.current.isPending).toBe("boolean");
  });
});
