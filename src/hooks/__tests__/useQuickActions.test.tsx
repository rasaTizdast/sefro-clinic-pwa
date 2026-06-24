import { act,renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { QuickActionProvider } from "../../components/QuickActionProvider";
import { useQuickActions } from "../useQuickActions";

describe("useQuickActions", () => {
  it("returns actions and registerAction", () => {
    const { result } = renderHook(() => useQuickActions(), {
      wrapper: ({ children }) => <QuickActionProvider>{children}</QuickActionProvider>,
    });
    expect(result.current.actions).toEqual([]);
    expect(typeof result.current.registerAction).toBe("function");
  });

  it("registerAction adds an action", () => {
    const { result } = renderHook(() => useQuickActions(), {
      wrapper: ({ children }) => <QuickActionProvider>{children}</QuickActionProvider>,
    });
    act(() => {
      result.current.registerAction({
        id: "test-1",
        label: "Test Action",
        perform: () => {},
      });
    });
    expect(result.current.actions).toHaveLength(1);
    expect(result.current.actions[0].id).toBe("test-1");
    expect(result.current.actions[0].label).toBe("Test Action");
  });

  it("unregister removes an action", () => {
    const { result } = renderHook(() => useQuickActions(), {
      wrapper: ({ children }) => <QuickActionProvider>{children}</QuickActionProvider>,
    });
    let unregister: () => void;
    act(() => {
      unregister = result.current.registerAction({
        id: "test-1",
        label: "Test Action",
        perform: () => {},
      });
    });
    expect(result.current.actions).toHaveLength(1);
    act(() => {
      unregister();
    });
    expect(result.current.actions).toHaveLength(0);
  });

  it("throws when used outside QuickActionProvider", () => {
    expect(() => renderHook(() => useQuickActions())).toThrow(
      "useQuickActions must be inside QuickActionProvider"
    );
  });
});