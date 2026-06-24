import { act,renderHook } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { useCommandPalette } from "../useCommandPalette";

describe("useCommandPalette", () => {
  it("starts closed", () => {
    const { result } = renderHook(() => useCommandPalette());
    expect(result.current.open).toBe(false);
  });

  it("opens on Ctrl+K", async () => {
    const user = userEvent.setup();
    const { result } = renderHook(() => useCommandPalette());
    await user.keyboard("{Control>}k{/Control}");
    expect(result.current.open).toBe(true);
  });

  it("opens on Meta+K", async () => {
    const user = userEvent.setup();
    const { result } = renderHook(() => useCommandPalette());
    await user.keyboard("{Meta>}k{/Meta}");
    expect(result.current.open).toBe(true);
  });

  it("toggles on second Ctrl+K", async () => {
    const user = userEvent.setup();
    const { result } = renderHook(() => useCommandPalette());
    await user.keyboard("{Control>}k{/Control}");
    expect(result.current.open).toBe(true);
    await user.keyboard("{Control>}k{/Control}");
    expect(result.current.open).toBe(false);
  });

  it("provides setOpen function", () => {
    const { result } = renderHook(() => useCommandPalette());
    expect(typeof result.current.setOpen).toBe("function");
    act(() => {
      result.current.setOpen(true);
    });
    expect(result.current.open).toBe(true);
  });
});