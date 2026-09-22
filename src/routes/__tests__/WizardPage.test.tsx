import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ToastProvider } from "../../components/ui/Toast";
import { WizardProvider } from "../../contexts/WizardContext";

vi.mock("react-calendar-datetime-picker", () => ({
  DtPicker: () => null,
}));

vi.mock("../../services/customers", () => ({
  listCustomers: vi.fn().mockResolvedValue({ data: [] }),
}));

vi.mock("../../lib/api-client", () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: { results: [] } }),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("../../hooks/api", () => ({
  useCurrentRate: () => ({
    data: { rate: "600000", rateTomanPerUsd: "600000" },
    isLoading: false,
  }),
  useCheckout: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
}));

import WizardPage from "../../routes/WizardPage";

function renderWizard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter initialEntries={["/wizard"]}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <WizardProvider>
            <WizardPage />
          </WizardProvider>
        </ToastProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

describe("WizardPage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("shows empty state when no tabs exist", () => {
    renderWizard();
    expect(screen.getByText("برای شروع پذیرش، دکمه + را بزنید")).toBeInTheDocument();
  });

  it("creates a new tab when + button is clicked", async () => {
    const user = userEvent.setup();
    renderWizard();

    await user.click(screen.getByRole("button", { name: "+" }));

    expect(screen.getByText("انتخاب بیمار")).toBeInTheDocument();
  });

  it("shows patient step with back button that does not switch tabs", async () => {
    const user = userEvent.setup();
    renderWizard();

    // Create first tab
    await user.click(screen.getByRole("button", { name: "+" }));
    expect(screen.getByText("انتخاب بیمار")).toBeInTheDocument();

    // Back button should be present but do nothing on first step
    const backBtn = screen.getByRole("button", { name: "بازگشت" });
    await user.click(backBtn);

    // Should still be on patient step (no tab switch, no crash)
    expect(screen.getByText("انتخاب بیمار")).toBeInTheDocument();
  });
});
