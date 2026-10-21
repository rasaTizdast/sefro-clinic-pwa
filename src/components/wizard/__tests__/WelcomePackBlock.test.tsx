import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { WelcomePack } from "../../../types/finance";
import { WelcomePackBlock } from "../WelcomePackBlock";

const mockUseAllWelcomePacks = vi.fn();
const mockUseWelcomePack = vi.fn();

vi.mock("../../../hooks/api", () => ({
  useAllWelcomePacks: (...args: unknown[]) => mockUseAllWelcomePacks(...args),
  useWelcomePack: (...args: unknown[]) => mockUseWelcomePack(...args),
}));

const packs: WelcomePack[] = [
  {
    id: 1,
    name: "ولکام‌پک استاندارد",
    description: "",
    isActive: true,
    createdAt: "",
    updatedAt: "",
    createdBy: null,
    createdByName: null,
    totalCostUsd: "0.00",
    totalCostToman: "0",
    exchangeRate: null,
    items: [],
  },
];

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function renderBlock(overrides: Partial<Parameters<typeof WelcomePackBlock>[0]> = {}) {
  const props = {
    mode: "with" as const,
    onModeChange: vi.fn(),
    welcomePack: null,
    onChange: vi.fn(),
    ...overrides,
  };
  render(<WelcomePackBlock {...props} />, { wrapper: createWrapper() });
  return props;
}

describe("WelcomePackBlock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseWelcomePack.mockReturnValue({ data: undefined });
  });

  it("shows a skeleton instead of an empty picker while packs load", () => {
    mockUseAllWelcomePacks.mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
      isFetching: true,
      refetch: vi.fn(),
    });

    renderBlock();

    expect(screen.getByRole("status", { name: "در حال بارگذاری ولکام‌پک‌ها" })).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("surfaces a failed load with a retry action instead of an empty list", async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();
    mockUseAllWelcomePacks.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      isFetching: false,
      refetch,
    });

    renderBlock();

    expect(screen.getByText("ولکام‌پک‌ها بارگذاری نشدند")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "تلاش مجدد" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("says so when no active pack exists", () => {
    mockUseAllWelcomePacks.mockReturnValue({
      data: [],
      isPending: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    renderBlock();

    expect(screen.getByText("ولکام‌پک فعالی ثبت نشده است.")).toBeInTheDocument();
  });

  it("lists the active packs once they load", async () => {
    const user = userEvent.setup();
    mockUseAllWelcomePacks.mockReturnValue({
      data: packs,
      isPending: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    renderBlock();

    await user.click(screen.getByRole("combobox", { name: "انتخاب ولکام‌پک" }));

    expect(await screen.findByRole("option", { name: "ولکام‌پک استاندارد" })).toBeInTheDocument();
  });

  it("shows the unchosen state as a placeholder, never as a selectable option", async () => {
    const user = userEvent.setup();
    mockUseAllWelcomePacks.mockReturnValue({
      data: packs,
      isPending: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    renderBlock();

    const trigger = screen.getByRole("combobox", { name: "انتخاب ولکام‌پک" });
    expect(trigger).toHaveTextContent("یک ولکام‌پک انتخاب کنید");

    await user.click(trigger);
    const options = await screen.findAllByRole("option");
    expect(options).toHaveLength(1);
    expect(
      screen.queryByRole("option", { name: "یک ولکام‌پک انتخاب کنید" })
    ).not.toBeInTheDocument();
  });

  it("keeps the picker hidden until packs arrive", async () => {
    mockUseAllWelcomePacks.mockReturnValue({
      data: packs,
      isPending: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    renderBlock({ mode: "without" });

    await waitFor(() => {
      expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    });
  });
});
