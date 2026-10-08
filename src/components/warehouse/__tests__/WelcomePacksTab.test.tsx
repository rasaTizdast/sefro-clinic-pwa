import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { ToastProvider } from "../../ui/Toast";
import { WelcomePacksTab } from "../WelcomePacksTab";

vi.mock("../../../hooks/useRateValue", () => ({
  useRateValue: () => 100000,
}));

vi.mock("../../../hooks/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../hooks/api")>();
  return {
    ...actual,
    useAllWelcomePacks: () => ({
      data: [
        {
          id: 3,
          name: "پک VIP",
          description: "",
          isActive: true,
          items: [{ id: 1, welcomePack: 3, product: 7, productName: "ماسک", quantity: "2.000" }],
          totalCostUsd: "5.00",
          totalCostToman: "500000",
          exchangeRate: "100000",
          createdAt: "",
          updatedAt: "",
          createdBy: null,
          createdByName: null,
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
    }),
    useAllProducts: () => ({
      data: [{ id: 7, name: "ماسک", unitPrice: "500000.00", unitPriceUsd: "5.00" }],
    }),
    useSaveWelcomePack: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useDeleteWelcomePack: () => ({ mutate: vi.fn() }),
  };
});

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={client}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
}

describe("WelcomePacksTab", () => {
  it("renders packs with Persian-formatted item prices from the product catalog", () => {
    render(<WelcomePacksTab />, { wrapper });

    expect(screen.getByText("ولکام‌پک‌ها")).toBeInTheDocument();
    expect(screen.getAllByText("پک VIP").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/ماسک/).length).toBeGreaterThan(0);
    // 2 × 500,000 Toman and 2 × $5.00 derived from the product's unit prices
    // (Table renders both desktop + mobile views → multiple matches expected)
    expect(screen.getAllByText(/۱٬۰۰۰٬۰۰۰ تومان/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/\$۱۰\.۰۰/).length).toBeGreaterThan(0);
  });

  it("only offers existing warehouse products — no inline creation, no price inputs", async () => {
    const user = userEvent.setup();
    render(<WelcomePacksTab />, { wrapper });

    await user.click(screen.getByRole("button", { name: "ولکام‌پک جدید" }));
    // Custom combobox dropdown: open it and verify the catalog-only options
    await user.click(screen.getByRole("combobox", { name: "محصول" }));
    expect(screen.queryByRole("option", { name: "+ محصول جدید…" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "ساخت و انتخاب" })).not.toBeInTheDocument();

    // Prices are never entered here — they live on the product in تب محصولات
    expect(screen.queryByLabelText("قیمت (تومان)")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("قیمت ($)")).not.toBeInTheDocument();

    // Selecting a product shows its catalog price in the totals box (1 × 500,000)
    await user.click(screen.getByRole("option", { name: "ماسک" }));
    expect(screen.getByText("۵۰۰٬۰۰۰ تومان")).toBeInTheDocument();
    expect(screen.getByText("$۵.۰۰")).toBeInTheDocument();
  });
});
