import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ToastProvider } from "../../components/ui/Toast";
import { WizardProvider } from "../../contexts/WizardContext";

const mockServicesList = vi.fn();
const mockPackagesList = vi.fn();
const mockServiceItems = vi.fn();
const mockProductsList = vi.fn();
const mockUsePackage = vi.fn();
const mockCustomersList = vi.fn();

vi.mock("react-calendar-datetime-picker", () => ({
  DtPicker: () => null,
}));

vi.mock("../../hooks/api/useServicesQuery", () => ({
  useServicesList: (...args: unknown[]) => mockServicesList(...args),
}));

vi.mock("../../hooks/api/usePackagesQuery", () => ({
  usePackagesList: (...args: unknown[]) => mockPackagesList(...args),
  usePackage: (...args: unknown[]) => mockUsePackage(...args),
}));

vi.mock("../../hooks/api/useServiceItemsQuery", () => ({
  useServiceItems: (...args: unknown[]) => mockServiceItems(...args),
}));

vi.mock("../../hooks/api/useProductsQuery", () => ({
  useAllProducts: (...args: unknown[]) => mockProductsList(...args),
}));

vi.mock("../../hooks/api/useCustomersQuery", () => ({
  useCustomersList: (...args: unknown[]) => mockCustomersList(...args),
  useCreateCustomer: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("../../hooks/api", () => ({
  useCheckout: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useWelcomePack: () => ({ data: undefined }),
  useWelcomePacksList: () => ({ data: { data: [] } }),
  useAllWelcomePacks: () => ({ data: [] }),
  useCurrentRate: () => ({
    data: { rate: "100000", rateTomanPerUsd: "100000" },
    isLoading: false,
  }),
}));

vi.mock("../../hooks/api/useExchangeRatesQuery", () => ({
  useCurrentRate: () => ({
    data: { rate: "100000", rateTomanPerUsd: "100000" },
    isLoading: false,
  }),
}));

vi.mock("../../hooks/api/useInventoryFinanceQuery", () => ({
  useRecordConsumption: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("../../hooks/api/useVisitsQuery", () => ({
  useReserveVisit: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("../../hooks/api/useWelcomePacksQuery", () => ({
  useIssueWelcomePack: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("../../lib/api-client", () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: { results: [] } }),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
  },
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

describe("WizardPage full flow — consumable totals", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();

    mockServicesList.mockReturnValue({
      data: {
        data: [
          { id: 1, title: "لیزر مو", priceToman: "2000000", priceUsd: "20.00", price: 2000000 },
        ],
        total: 1,
        page: 1,
        perPage: 50,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
      isLoading: false,
    });
    mockPackagesList.mockReturnValue({
      data: {
        data: [],
        total: 0,
        page: 1,
        perPage: 50,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
      isLoading: false,
    });
    mockProductsList.mockReturnValue({
      data: [
        {
          id: 50,
          name: "سرم ویتامین",
          stock: 100,
          unit: "عدد",
          unitPrice: "150000.00",
          unitPriceUsd: "1.50",
          description: "",
        },
        {
          id: 51,
          name: "ماسک صورت",
          stock: 50,
          unit: "عدد",
          unitPrice: "200000.00",
          unitPriceUsd: null,
          description: "",
        },
      ],
      isLoading: false,
      error: null,
    });
    mockUsePackage.mockReturnValue({ data: undefined, isLoading: false });
    mockServiceItems.mockImplementation(() => ({
      data: [{ id: 1, service: 1, product: 50, productName: "سرم ویتامین", quantity: "2.00" }],
      isLoading: false,
    }));
    mockCustomersList.mockReturnValue({
      data: {
        data: [
          {
            id: 1,
            firstName: "علی",
            lastName: "رضایی",
            mobileNumber: "09121234567",
            nationalId: "0012345678",
            isNewCustomer: false,
            visitCount: 1,
            totalPayments: 0,
            lastVisit: null,
            notes: "",
            birthday: "",
            fileSysId: "",
          },
        ],
        total: 1,
        page: 1,
        perPage: 20,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
      isFetching: false,
      isError: false,
      error: null,
    });
  });

  it("includes recipe consumables in step 2 grand total through WizardPage", async () => {
    const user = userEvent.setup();
    renderWizard();

    // Create tab
    await user.click(screen.getByRole("button", { name: "+" }));

    // Patient step: search and select
    const search = screen.getByPlaceholderText("نام، موبایل یا کد ملی...");
    await user.type(search, "علی");
    await user.click(await screen.findByText("علی رضایی"));
    await user.click(screen.getByRole("button", { name: "ادامه" }));

    // Service step: select the service
    await user.click(await screen.findByText("لیزر مو"));

    // Recipe seed: 2×150000 = 300000; fee 2000000 → grand 2300000
    // Appears in header "جمع کل" and in "جمع کل قابل پرداخت" box.
    await waitFor(
      () => {
        expect(
          screen.getAllByText((_, el) => el?.textContent === "۲٬۳۰۰٬۰۰۰ تومان").length
        ).toBeGreaterThanOrEqual(2);
      },
      { timeout: 3000 }
    );
    expect(screen.getByText("جمع کل قابل پرداخت")).toBeInTheDocument();
  });

  it("adds a non-reserved extra product into the step 2 grand total", async () => {
    const user = userEvent.setup();
    renderWizard();

    await user.click(screen.getByRole("button", { name: "+" }));
    const search = screen.getByPlaceholderText("نام، موبایل یا کد ملی...");
    await user.type(search, "علی");
    await user.click(await screen.findByText("علی رضایی"));
    await user.click(screen.getByRole("button", { name: "ادامه" }));
    await user.click(await screen.findByText("لیزر مو"));

    // Seed: fee 2M + serum 2×150k = 2.3M
    await waitFor(
      () => {
        expect(
          screen.getAllByText((_, el) => el?.textContent === "۲٬۳۰۰٬۰۰۰ تومان").length
        ).toBeGreaterThanOrEqual(1);
      },
      { timeout: 3000 }
    );

    // Add ماسک صورت (id 51, not in recipe) — 200000 × 1 = +200000 → 2.5M
    const trigger = screen.getAllByRole("combobox").at(-1)!;
    await user.click(trigger);
    await user.click(await screen.findByRole("option", { name: /ماسک صورت/ }));
    await user.click(screen.getByRole("button", { name: "افزودن محصول" }));

    await waitFor(
      () => {
        expect(
          screen.getAllByText((_, el) => el?.textContent === "۲٬۵۰۰٬۰۰۰ تومان").length
        ).toBeGreaterThanOrEqual(2);
      },
      { timeout: 3000 }
    );
  });

  it("updates grand total when recipe quantity is edited with Latin digits", async () => {
    const user = userEvent.setup();
    renderWizard();

    await user.click(screen.getByRole("button", { name: "+" }));
    const search = screen.getByPlaceholderText("نام، موبایل یا کد ملی...");
    await user.type(search, "علی");
    await user.click(await screen.findByText("علی رضایی"));
    await user.click(screen.getByRole("button", { name: "ادامه" }));
    await user.click(await screen.findByText("لیزر مو"));

    await waitFor(
      () => {
        expect(
          screen.getAllByText((_, el) => el?.textContent === "۲٬۳۰۰٬۰۰۰ تومان").length
        ).toBeGreaterThanOrEqual(1);
      },
      { timeout: 3000 }
    );

    const qtyInput = (await screen.findAllByLabelText("تعداد"))[0];
    await user.clear(qtyInput);
    await user.type(qtyInput, "3");
    // 3×150k = 450k + 2M = 2.45M
    await waitFor(
      () => {
        expect(
          screen.getAllByText((_, el) => el?.textContent === "۲٬۴۵۰٬۰۰۰ تومان").length
        ).toBeGreaterThanOrEqual(1);
      },
      { timeout: 3000 }
    );
  });

  it("rejects adding a product already reserved by the recipe", async () => {
    const user = userEvent.setup();
    renderWizard();

    await user.click(screen.getByRole("button", { name: "+" }));
    const search = screen.getByPlaceholderText("نام، موبایل یا کد ملی...");
    await user.type(search, "علی");
    await user.click(await screen.findByText("علی رضایی"));
    await user.click(screen.getByRole("button", { name: "ادامه" }));
    await user.click(await screen.findByText("لیزر مو"));

    await waitFor(
      () => {
        expect(
          screen.getAllByText((_, el) => el?.textContent === "۲٬۳۰۰٬۰۰۰ تومان").length
        ).toBeGreaterThanOrEqual(1);
      },
      { timeout: 3000 }
    );

    const trigger = screen.getAllByRole("combobox").at(-1)!;
    await user.click(trigger);
    await user.click(await screen.findByRole("option", { name: /سرم ویتامین/ }));
    await user.click(screen.getByRole("button", { name: "افزودن محصول" }));

    expect(await screen.findByText("این محصول قبلاً اضافه شده است")).toBeInTheDocument();
    expect(
      screen.getAllByText((_, el) => el?.textContent === "۲٬۳۰۰٬۰۰۰ تومان").length
    ).toBeGreaterThanOrEqual(1);
  });
});
