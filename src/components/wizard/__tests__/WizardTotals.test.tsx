import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { consumablesTotalToman } from "../../../lib/format";
import type { ConsumableSelection, PatientData, ServiceSelection } from "../../../types/wizard";
import { ToastProvider } from "../../ui/Toast";
import WizardStepPayment from "../WizardStepPayment";
import WizardStepService from "../WizardStepService";

const mockServicesList = vi.fn();
const mockPackagesList = vi.fn();
const mockServiceItems = vi.fn();
const mockProductsList = vi.fn();
const mockUsePackage = vi.fn();
const mockCheckoutMutate = vi.fn();
const mockRecordConsumptionMutate = vi.fn();
const mockReserveVisitMutate = vi.fn();
const mockCancelVisit = vi.fn();

vi.mock("../../../hooks/api/useServicesQuery", () => ({
  useServicesList: (...args: unknown[]) => mockServicesList(...args),
}));

vi.mock("../../../hooks/api/usePackagesQuery", () => ({
  usePackagesList: (...args: unknown[]) => mockPackagesList(...args),
  usePackage: (...args: unknown[]) => mockUsePackage(...args),
}));

vi.mock("../../../hooks/api/useServiceItemsQuery", () => ({
  useServiceItems: (...args: unknown[]) => mockServiceItems(...args),
}));

vi.mock("../../../hooks/api/useProductsQuery", () => ({
  useAllProducts: (...args: unknown[]) => mockProductsList(...args),
}));

vi.mock("../../../hooks/api", () => ({
  useCheckout: () => ({ mutateAsync: mockCheckoutMutate, isPending: false }),
  useWelcomePack: () => ({ data: undefined }),
  useWelcomePacksList: () => ({ data: { data: [] } }),
  useAllWelcomePacks: () => ({ data: [] }),
}));

vi.mock("../../../hooks/api/useCustomersQuery", () => ({
  useCreateCustomer: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("../../../hooks/api/useExchangeRatesQuery", () => ({
  useCurrentRate: () => ({
    data: { rate: "100000", rateTomanPerUsd: "100000" },
    isLoading: false,
  }),
}));

vi.mock("../../../hooks/api/useInventoryFinanceQuery", () => ({
  useRecordConsumption: () => ({ mutateAsync: mockRecordConsumptionMutate, isPending: false }),
}));

vi.mock("../../../hooks/api/useVisitsQuery", () => ({
  useReserveVisit: () => ({ mutateAsync: mockReserveVisitMutate, isPending: false }),
}));

vi.mock("../../../hooks/api/useWelcomePacksQuery", () => ({
  useIssueWelcomePack: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("../../../lib/payment-split", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../lib/payment-split")>();
  return {
    ...actual,
    // Pretend the full amount is already paid so finish-button state is irrelevant.
    isSplitComplete: () => true,
    splitPaidToman: () => 0,
  };
});

vi.mock("../../../services/exchangeRates", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../services/exchangeRates")>();
  return {
    ...actual,
    // Billing resolves the rate fresh at submit; pin it to the mocked
    // useCurrentRate value (100,000) so the split math below is unchanged.
    getBillingRate: () => Promise.resolve(100000),
  };
});

vi.mock("../../../services/visits", () => ({
  cancelVisit: (id: number) => mockCancelVisit(id),
}));

const toastWarningMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock("../../ui/Toast", async () => {
  const actual = await vi.importActual<typeof import("../../ui/Toast")>("../../ui/Toast");
  return {
    ...actual,
    useToast: () => ({
      warning: toastWarningMock,
      success: vi.fn(),
      error: toastErrorMock,
      info: vi.fn(),
    }),
  };
});

const mockPatient: PatientData = {
  id: 1,
  firstName: "علی",
  lastName: "رضایی",
  mobileNumber: "09121234567",
  nationalId: "0012345678",
  isNew: false,
  visitCount: 3,
  totalSpent: 500000,
  lastVisit: null,
  servicesHistory: [],
  notes: "",
  birthday: "",
  fileSysId: "",
};

const mockProductsPage = [
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
];

const mockServices = [
  { id: 1, title: "لیزر مو", priceToman: "2000000", priceUsd: "20.00", price: 2000000 },
  { id: 2, title: "پاکسازی پوست", priceToman: "800000", priceUsd: "8.00", price: 800000 },
];

const selectedService1: ServiceSelection = {
  serviceId: 1,
  serviceName: "لیزر مو",
  priceToman: "2000000",
  priceUsd: "20.00",
  isPackage: false,
  packageId: null,
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
}

/** Parent-owned state mirrors WizardPage tab.consumables / tab.extraProducts. */
function StatefulStep2() {
  const [selectedServices, setSelectedServices] = useState<ServiceSelection[]>([selectedService1]);
  const [consumables, setConsumables] = useState<Record<string, ConsumableSelection[]>>({});
  const [extraProducts, setExtraProducts] = useState<ConsumableSelection[]>([]);

  const serviceFee = selectedServices.reduce((sum, s) => sum + Number(s.priceToman || 0), 0);
  const consumableTotal = consumablesTotalToman(consumables, extraProducts);

  return (
    <div>
      <div data-testid="service-fee">{serviceFee}</div>
      <div data-testid="consumable-total">{consumableTotal}</div>
      <div data-testid="grand-total">{serviceFee + consumableTotal}</div>
      <WizardStepService
        patient={mockPatient}
        selectedServices={selectedServices}
        consumables={consumables}
        extraProducts={extraProducts}
        onBack={vi.fn()}
        onUpdateServices={setSelectedServices}
        onUpdateConsumables={setConsumables}
        onUpdateExtraProducts={setExtraProducts}
        onComplete={vi.fn()}
      />
    </div>
  );
}

function PaymentWithSeed({
  extraProducts = [],
  onComplete,
}: {
  extraProducts?: ConsumableSelection[];
  onComplete?: () => void;
}) {
  const recipe: Record<string, ConsumableSelection[]> = {
    "1": [
      {
        product: 50,
        productName: "سرم ویتامین",
        quantity: "2",
        priceToman: "150000",
        priceUsd: "1.50",
      },
      {
        product: 51,
        productName: "ماسک صورت",
        quantity: "1",
        priceToman: "200000",
        priceUsd: "0",
      },
    ],
  };
  const total = Number(selectedService1.priceToman) + consumablesTotalToman(recipe, extraProducts);

  return (
    <div>
      <div data-testid="payment-expected-total">{total}</div>
      <WizardStepPayment
        patient={mockPatient}
        selectedServices={[selectedService1]}
        consumables={recipe}
        extraProducts={extraProducts}
        welcomePack={null}
        onSelectWelcomePack={vi.fn()}
        onBack={vi.fn()}
        onComplete={onComplete ?? vi.fn()}
        onUpdatePatient={vi.fn()}
      />
    </div>
  );
}

describe("wizard consumable totals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReserveVisitMutate.mockResolvedValue({ data: { id: 77 } });
    mockCancelVisit.mockResolvedValue({ data: { id: 77, status: "canceled" } });
    mockServicesList.mockReturnValue({
      data: {
        data: mockServices,
        total: 2,
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
      data: mockProductsPage,
      isLoading: false,
      error: null,
    });
    mockUsePackage.mockReturnValue({ data: undefined, isLoading: false });
    mockServiceItems.mockImplementation((serviceId: number) => ({
      data:
        serviceId === 1
          ? [
              { id: 1, service: 1, product: 50, productName: "سرم ویتامین", quantity: "2.00" },
              { id: 2, service: 1, product: 51, productName: "ماسک صورت", quantity: "1.00" },
            ]
          : serviceId === 2
            ? [{ id: 3, service: 2, product: 50, productName: "سرم ویتامین", quantity: "1.00" }]
            : [],
      isLoading: false,
    }));
  });

  it("includes seeded service recipe consumables in the step 2 grand total", async () => {
    render(<StatefulStep2 />, { wrapper: createWrapper() });

    // Recipe: 2×150000 + 1×200000 = 500000; fee 2000000 → grand 2500000
    await waitFor(() => {
      expect(screen.getByTestId("consumable-total")).toHaveTextContent("500000");
    });
    expect(screen.getByTestId("grand-total")).toHaveTextContent("2500000");
    const grandRow = await screen.findByTestId("step2-grand-total");
    expect(grandRow).toHaveTextContent("جمع کل قابل پرداخت");
    expect(grandRow).toHaveTextContent("۲٬۵۰۰٬۰۰۰ تومان");
    // Floating price: dollar line at the mocked rate (100,000 Toman per USD).
    expect(grandRow).toHaveTextContent("$۲۵.۰۰");
  });

  it("updates step 2 totals when recipe quantity changes", async () => {
    const user = userEvent.setup();
    render(<StatefulStep2 />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId("consumable-total")).toHaveTextContent("500000");
    });

    const qtyInput = (await screen.findAllByLabelText("تعداد"))[0];
    await user.clear(qtyInput);
    await user.type(qtyInput, "3");

    // serum 3×150000 + mask 1×200000 = 650000
    await waitFor(() => {
      expect(screen.getByTestId("consumable-total")).toHaveTextContent("650000");
    });
    expect(screen.getByTestId("grand-total")).toHaveTextContent("2650000");
  });

  it("does not overwrite sibling service recipe keys when seeding multiple services", async () => {
    const user = userEvent.setup();
    render(<StatefulStep2 />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId("consumable-total")).toHaveTextContent("500000");
    });

    await user.click(await screen.findByText("پاکسازی پوست"));

    // 500000 (svc1) + 150000 (svc2) = 650000; fee 2000000+800000
    await waitFor(() => {
      expect(screen.getByTestId("consumable-total")).toHaveTextContent("650000");
    });
    expect(screen.getByTestId("grand-total")).toHaveTextContent("3450000");
  });

  it("rejects adding a product already reserved by the recipe", async () => {
    const user = userEvent.setup();
    render(<StatefulStep2 />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId("consumable-total")).toHaveTextContent("500000");
    });

    // Custom Select: open combobox, pick the reserved serum option (label includes price).
    const trigger = screen.getAllByRole("combobox")[0];
    await user.click(trigger);
    await user.click(await screen.findByRole("option", { name: /سرم ویتامین — ۱۵۰٬۰۰۰ تومان/ }));
    await user.click(screen.getByRole("button", { name: "افزودن محصول" }));

    expect(await screen.findByText("این محصول قبلاً اضافه شده است")).toBeInTheDocument();
    expect(screen.getByTestId("consumable-total")).toHaveTextContent("500000");
  });

  it("payment step shows fee + consumables in the final payable total", async () => {
    render(<PaymentWithSeed />, { wrapper: createWrapper() });

    // fee 2000000 + consumables 500000 = 2500000
    expect(screen.getByTestId("payment-expected-total")).toHaveTextContent("2500000");
    // Final payable row (fee + goods) must equal 2,500,000
    expect(
      await screen.findByText((_, el) => el?.textContent === "۲٬۵۰۰٬۰۰۰ تومان")
    ).toBeInTheDocument();
    // Consumable subtotal appears in both the goods list and the final summary.
    expect(
      screen.getAllByText((_, el) => el?.textContent === "۵۰۰٬۰۰۰ تومان").length
    ).toBeGreaterThanOrEqual(2);
  });

  it("payment final payable includes extra products", async () => {
    const extras: ConsumableSelection[] = [
      {
        product: 99,
        productName: "ژل",
        quantity: "2",
        priceToman: "100000",
        priceUsd: "0",
      },
    ];
    render(<PaymentWithSeed extraProducts={extras} />, { wrapper: createWrapper() });

    // 2000000 + 500000 + 200000 = 2700000
    expect(screen.getByTestId("payment-expected-total")).toHaveTextContent("2700000");
    expect(
      await screen.findByText((_, el) => el?.textContent === "۲٬۷۰۰٬۰۰۰ تومان")
    ).toBeInTheDocument();
  });

  it("finish splits checkout into a visit sale (fee) and a visit-less sale (goods)", async () => {
    const user = userEvent.setup();
    const extras: ConsumableSelection[] = [
      { product: 99, productName: "ژل", quantity: "2", priceToman: "100000", priceUsd: "0" },
    ];
    const onComplete = vi.fn();
    render(<PaymentWithSeed extraProducts={extras} onComplete={onComplete} />, {
      wrapper: createWrapper(),
    });

    // Pay the full displayed total in cash so buildCheckoutPayload accepts the split.
    expect(screen.getByTestId("payment-expected-total")).toHaveTextContent("2700000");
    await user.type(screen.getByLabelText("نقدی (تومان)"), "2700000");
    await user.click(screen.getByRole("button", { name: "ثبت نهایی" }));

    // Two sales: service fee on the visit, goods off the visit (products must
    // never inflate staff compensation).
    await waitFor(() => {
      expect(mockCheckoutMutate).toHaveBeenCalledTimes(2);
    });

    // Visit reserved for the right patient/service.
    expect(mockReserveVisitMutate).toHaveBeenCalledTimes(1);
    expect(mockReserveVisitMutate.mock.calls[0][0]).toMatchObject({ customer: 1, services: [1] });

    // One consumption call: recipe rows (numeric keys only) + extras (product 99)
    // forwarded as extra_products so their stock is deducted too.
    expect(mockRecordConsumptionMutate).toHaveBeenCalledTimes(1);
    const consumption = mockRecordConsumptionMutate.mock.calls[0][0];
    expect(consumption.visitId).toBe(77);
    expect(consumption.includeMandatoryOnly).toBe(true);
    expect(Object.keys(consumption.selection)).toEqual(["1"]);
    expect(consumption.selection["1"].map((r: ConsumableSelection) => r.product)).toEqual([50, 51]);
    expect(consumption.extraProducts).toEqual(extras);

    // Sale 1: the service fee (2,000,000) bound to the visit.
    const feePayload = mockCheckoutMutate.mock.calls[0][0];
    expect(feePayload.amountUsd).toBe("20.00");
    expect(feePayload.customer).toBe(1);
    expect(feePayload.visit).toBe(77);
    expect(feePayload.components).toEqual([{ method: "cash_toman", amountUsd: "2000000" }]);

    // Sale 2: the goods (700,000) with NO visit — excluded from compensation.
    const goodsPayload = mockCheckoutMutate.mock.calls[1][0];
    expect(goodsPayload.amountUsd).toBe("7.00");
    expect(goodsPayload.customer).toBe(1);
    expect(goodsPayload.visit).toBeNull();
    expect(goodsPayload.components).toEqual([{ method: "cash_toman", amountUsd: "700000" }]);

    // The two sales together still equal the displayed total.
    const usdSum = Number(feePayload.amountUsd) + Number(goodsPayload.amountUsd);
    expect(usdSum).toBeCloseTo(27.0, 2);

    // Consumption is recorded before the sale is checked out.
    expect(mockRecordConsumptionMutate.mock.invocationCallOrder[0]).toBeLessThan(
      mockCheckoutMutate.mock.invocationCallOrder[0]
    );
    // A successful checkout never releases the reservation.
    expect(mockCancelVisit).not.toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("releases the reserved visit when checkout is rejected", async () => {
    const user = userEvent.setup();
    mockCheckoutMutate.mockRejectedValueOnce({
      message: "Request failed with status code 400",
      raw: {
        error: "Payment components must sum to the sale amount (after currency conversion).",
      },
    });
    const onComplete = vi.fn();
    render(<PaymentWithSeed onComplete={onComplete} />, { wrapper: createWrapper() });

    expect(screen.getByTestId("payment-expected-total")).toHaveTextContent("2500000");
    await user.type(screen.getByLabelText("نقدی (تومان)"), "2500000");
    await user.click(screen.getByRole("button", { name: "ثبت نهایی" }));

    await waitFor(() => {
      expect(mockCancelVisit).toHaveBeenCalledWith(77);
    });
    expect(mockCheckoutMutate).toHaveBeenCalledTimes(1);
    expect(onComplete).not.toHaveBeenCalled();
    expect(toastErrorMock).toHaveBeenCalledWith(
      "Payment components must sum to the sale amount (after currency conversion)."
    );
  });

  it("a consumption failure does not block the two-sale checkout", async () => {
    const user = userEvent.setup();
    mockRecordConsumptionMutate.mockRejectedValueOnce(new Error("موجودی ناکافی"));
    const onComplete = vi.fn();
    render(<PaymentWithSeed onComplete={onComplete} />, { wrapper: createWrapper() });

    // 2000000 service + 500000 consumables, no extras.
    expect(screen.getByTestId("payment-expected-total")).toHaveTextContent("2500000");
    await user.type(screen.getByLabelText("نقدی (تومان)"), "2500000");
    await user.click(screen.getByRole("button", { name: "ثبت نهایی" }));

    // Both sales still land and the wizard completes.
    await waitFor(() => {
      expect(mockCheckoutMutate).toHaveBeenCalledTimes(2);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(toastWarningMock).toHaveBeenCalledWith(
      "پذیرش ثبت شد اما مصرف مواد ثبت نشد",
      "موجودی ناکافی"
    );
  });
});
