import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as visitsService from "../../../services/visits";
import type { WelcomePack } from "../../../types/finance";
import type {
  PatientData,
  PaymentSelection,
  ServiceSelection,
  WelcomePackSelection,
} from "../../../types/wizard";
import { ToastProvider } from "../../ui/Toast";
import WizardStepPayment from "../WizardStepPayment";

const mockCheckout = vi.fn();
const mockReserve = vi.fn();
const mockConsumption = vi.fn();
const mockIssuePack = vi.fn();
const mockCreateCustomer = vi.fn();
const mockAllWelcomePacks = vi.fn();
const mockWelcomePackDetail = vi.fn();
const mockEnsureFreshToken = vi.fn();
const mockGetBillingRate = vi.fn();
const mockCountConsumptions = vi.hoisted(() => vi.fn());

vi.mock("../../../hooks/api", () => ({
  useAllWelcomePacks: (...args: unknown[]) => mockAllWelcomePacks(...args),
  useCheckout: () => ({ mutateAsync: mockCheckout, isPending: false }),
  useSettleVisit: () => ({ mutateAsync: mockCheckout, isPending: false }),
  useWelcomePack: (...args: unknown[]) => mockWelcomePackDetail(...args),
}));
vi.mock("../../../hooks/api/useCustomersQuery", () => ({
  useCreateCustomer: () => ({ mutateAsync: mockCreateCustomer, isPending: false }),
}));
vi.mock("../../../hooks/api/useExchangeRatesQuery", () => ({
  useCurrentRate: () => ({
    data: { rate: "600000", rateTomanPerUsd: "600000", effectiveAt: null, source: "manual" },
  }),
}));
vi.mock("../../../hooks/api/useInventoryFinanceQuery", () => ({
  useRecordConsumption: () => ({ mutateAsync: mockConsumption, isPending: false }),
}));
vi.mock("../../../hooks/api/useProductsQuery", () => ({
  useAllProducts: () => ({ data: [], isPending: false }),
}));
vi.mock("../../../hooks/api/useVisitsQuery", () => ({
  useReserveVisit: () => ({ mutateAsync: mockReserve, isPending: false }),
}));
vi.mock("../../../hooks/api/useWelcomePacksQuery", () => ({
  useIssueWelcomePack: () => ({ mutateAsync: mockIssuePack, isPending: false }),
}));
vi.mock("../../../lib/api-client", () => ({
  ensureFreshToken: (...args: unknown[]) => mockEnsureFreshToken(...args),
}));
vi.mock("../../../services/exchangeRates", () => ({
  getBillingRate: (...args: unknown[]) => mockGetBillingRate(...args),
}));
vi.mock("../../../services/inventoryFinance", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../services/inventoryFinance")>();
  return { ...actual, countVisitConsumptions: mockCountConsumptions };
});
vi.mock("../../../services/visits", () => ({
  completeVisit: vi.fn(),
  cancelVisit: vi.fn(),
}));

const pack: WelcomePack = {
  id: 5,
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
};

const patient: PatientData = {
  id: 1,
  firstName: "علی",
  lastName: "رضایی",
  mobileNumber: "09120000000",
  nationalId: "0012345678",
  isNew: false,
  visitCount: 2,
  totalSpent: 500000,
  lastVisit: "۱۴۰۵/۱/۱",
  servicesHistory: [],
  notes: "",
  birthday: "",
  fileSysId: "",
};

const services: ServiceSelection[] = [
  {
    serviceId: 7,
    serviceName: "ویزیت پزشک",
    priceToman: "100000",
    priceUsd: "0.17",
    isPackage: false,
    packageId: null,
  },
];

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
}

function renderStep(overrides: Partial<Parameters<typeof WizardStepPayment>[0]> = {}) {
  const props = {
    patient,
    selectedServices: services,
    consumables: {},
    extraProducts: [],
    welcomePack: null,
    onSelectWelcomePack: vi.fn(),
    onBack: vi.fn(),
    onComplete: vi.fn<(payment: PaymentSelection) => void>(),
    onUpdatePatient: vi.fn(),
    ...overrides,
  };
  render(<WizardStepPayment {...props} />, { wrapper: createWrapper() });
  return props;
}

/** Mirrors the real parent: the chosen pack lives in state and flows back as a prop. */
function PackAwareStep({
  onComplete,
  initialPack = null,
}: {
  onComplete: (payment: PaymentSelection) => void;
  initialPack?: WelcomePackSelection | null;
}) {
  const [pack, setPack] = useState<WelcomePackSelection | null>(initialPack);
  return (
    <WizardStepPayment
      patient={patient}
      selectedServices={services}
      consumables={{}}
      extraProducts={[]}
      welcomePack={pack}
      onSelectWelcomePack={setPack}
      onBack={vi.fn()}
      onComplete={onComplete}
      onUpdatePatient={vi.fn()}
    />
  );
}

async function payInFull(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("نقدی (تومان)"), "100000");
}

describe("WizardStepPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnsureFreshToken.mockResolvedValue(undefined);
    mockGetBillingRate.mockResolvedValue(600000);
    mockCountConsumptions.mockResolvedValue(0);
    mockCheckout.mockResolvedValue({ data: {} });
    mockConsumption.mockResolvedValue({});
    mockIssuePack.mockResolvedValue({});
    mockCreateCustomer.mockResolvedValue({ data: { id: 99 } });
    mockAllWelcomePacks.mockReturnValue({
      data: [pack],
      isPending: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    });
    mockWelcomePackDetail.mockReturnValue({ data: undefined });
    vi.mocked(visitsService.completeVisit).mockResolvedValue({ data: {} } as never);
    vi.mocked(visitsService.cancelVisit).mockResolvedValue({ data: {} } as never);
  });

  it("blocks submit when a welcome pack is requested but none is chosen", async () => {
    const user = userEvent.setup();
    const props = renderStep();
    mockReserve.mockResolvedValue({ data: { id: 42 } });

    await user.click(screen.getByRole("button", { name: "همراه با ولکام‌پک" }));
    await payInFull(user);
    await user.click(screen.getByRole("button", { name: "ثبت نهایی" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("یک ولکام‌پک انتخاب کنید");
    expect(mockReserve).not.toHaveBeenCalled();
    expect(mockCheckout).not.toHaveBeenCalled();
    expect(props.onComplete).not.toHaveBeenCalled();
  });

  it("never offers the placeholder row as a selectable pack", async () => {
    const user = userEvent.setup();
    renderStep();

    await user.click(screen.getByRole("button", { name: "همراه با ولکام‌پک" }));
    const trigger = screen.getByRole("combobox", { name: "انتخاب ولکام‌پک" });
    expect(trigger).toHaveTextContent("یک ولکام‌پک انتخاب کنید");

    await user.click(trigger);
    const options = await screen.findAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual([pack.name]);
    expect(
      screen.queryByRole("option", { name: "یک ولکام‌پک انتخاب کنید" })
    ).not.toBeInTheDocument();
  });

  it("blocks a stored pack that is no longer on the active list", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn<(payment: PaymentSelection) => void>();
    const stalePack: WelcomePackSelection = {
      packId: 999,
      packName: "ولکام‌پک حذف‌شده",
      totalCostToman: "0",
      totalCostUsd: "0.00",
    };
    render(<PackAwareStep onComplete={onComplete} initialPack={stalePack} />, {
      wrapper: createWrapper(),
    });
    mockReserve.mockResolvedValue({ data: { id: 46 } });

    // The stale pack matches no active option, so the picker reads as unchosen.
    expect(screen.getByRole("combobox", { name: "انتخاب ولکام‌پک" })).toHaveTextContent(
      "یک ولکام‌پک انتخاب کنید"
    );
    await payInFull(user);
    await user.click(screen.getByRole("button", { name: "ثبت نهایی" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("یک ولکام‌پک انتخاب کنید");
    expect(mockReserve).not.toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("settles the visit atomically when a pack is chosen", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn<(payment: PaymentSelection) => void>();
    render(<PackAwareStep onComplete={onComplete} />, { wrapper: createWrapper() });
    mockReserve.mockResolvedValue({ data: { id: 42 } });

    await user.click(screen.getByRole("button", { name: "همراه با ولکام‌پک" }));
    await user.click(screen.getByRole("combobox", { name: "انتخاب ولکام‌پک" }));
    await user.click(await screen.findByRole("option", { name: pack.name }));
    await payInFull(user);
    await user.click(screen.getByRole("button", { name: "ثبت نهایی" }));

    await waitFor(() => expect(mockCheckout).toHaveBeenCalled());
    expect(mockCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        visitId: 42,
        payload: expect.objectContaining({
          customer: 1,
          welcomePack: expect.objectContaining({ pack: pack.id, quantity: "1" }),
        }),
      })
    );
    expect(vi.mocked(visitsService.completeVisit)).not.toHaveBeenCalled();
    await waitFor(() => expect(onComplete).toHaveBeenCalled());
  });

  it("settles the visit without a pack when reception is pack-free", async () => {
    const user = userEvent.setup();
    const props = renderStep();
    mockReserve.mockResolvedValue({ data: { id: 43 } });

    await payInFull(user);
    await user.click(screen.getByRole("button", { name: "ثبت نهایی" }));

    await waitFor(() =>
      expect(mockCheckout).toHaveBeenCalledWith(
        expect.objectContaining({
          visitId: 43,
          payload: expect.objectContaining({ welcomePack: null }),
        })
      )
    );
    expect(mockIssuePack).not.toHaveBeenCalled();
    await waitFor(() => expect(props.onComplete).toHaveBeenCalled());
  });

  it("keeps the reception open when atomic settlement is refused", async () => {
    const user = userEvent.setup();
    const props = renderStep();
    mockReserve.mockResolvedValue({ data: { id: 44 } });
    mockCheckout.mockRejectedValueOnce({
      response: { data: { detail: "uncovered compensation role" } },
    });

    await payInFull(user);
    await user.click(screen.getByRole("button", { name: "ثبت نهایی" }));

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(props.onComplete).not.toHaveBeenCalled();
    expect(mockCheckout).toHaveBeenCalled();
    expect(vi.mocked(visitsService.cancelVisit)).not.toHaveBeenCalled();
  });

  it("does not finish the reception when settlement fails and reuses the visit on retry", async () => {
    const user = userEvent.setup();
    const props = renderStep();
    mockReserve.mockResolvedValue({ data: { id: 45 } });
    mockCheckout.mockRejectedValueOnce({
      response: { data: { detail: "stock empty" } },
    });

    await payInFull(user);
    await user.click(screen.getByRole("button", { name: "ثبت نهایی" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(mockCheckout).toHaveBeenCalledTimes(1);
    expect(props.onComplete).not.toHaveBeenCalled();
    expect(vi.mocked(visitsService.cancelVisit)).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "ثبت نهایی" }));
    await waitFor(() => expect(props.onComplete).toHaveBeenCalled());
    expect(mockReserve).toHaveBeenCalledTimes(1);
    expect(mockCheckout).toHaveBeenCalledTimes(2);
  });
});
