import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PatientData, ServiceSelection } from "../../../types/wizard";
import WizardStepService from "../WizardStepService";

const mockServicesList = vi.fn();
const mockPackagesList = vi.fn();

vi.mock("../../../hooks/api/useServicesQuery", () => ({
  useServicesList: (...args: unknown[]) => mockServicesList(...args),
}));

vi.mock("../../../hooks/api/usePackagesQuery", () => ({
  usePackagesList: (...args: unknown[]) => mockPackagesList(...args),
}));

const mockPatient: PatientData = {
  id: 1,
  firstName: "علی",
  lastName: "رضایی",
  mobileNumber: "09121234567",
  nationalId: "0012345678",
  isNew: false,
  visitCount: 3,
  totalSpent: 500000,
  lastVisit: "1404/06/15",
  servicesHistory: [],
  notes: "",
  birthday: "",
  fileSysId: "",
};

const mockServices = [
  { id: 1, title: "لیزر مو", priceToman: "2000000", priceUsd: "20.00" },
  { id: 2, title: "پاکسازی پوست", priceToman: "800000", priceUsd: "8.00" },
];

const mockPackages = [
  {
    id: 10,
    name: "پکیج لیزر کامل",
    priceToman: "5000000",
    priceUsd: "50.00",
    description: "۱۰ جلسه",
    services: [1],
  },
];

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("WizardStepService", () => {
  const onUpdateServices = vi.fn();
  const onComplete = vi.fn();
  const onBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
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
        data: mockPackages,
        total: 1,
        page: 1,
        perPage: 50,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
      isLoading: false,
    });
  });

  it("renders services list from API", async () => {
    render(
      <WizardStepService
        patient={mockPatient}
        selectedServices={[]}
        onBack={onBack}
        onUpdateServices={onUpdateServices}
        onComplete={onComplete}
      />,
      { wrapper: createWrapper() }
    );

    expect(await screen.findByText("لیزر مو")).toBeInTheDocument();
    expect(screen.getByText("پاکسازی پوست")).toBeInTheDocument();
  });

  it("renders packages list when packages tab is selected", async () => {
    const user = userEvent.setup();
    render(
      <WizardStepService
        patient={mockPatient}
        selectedServices={[]}
        onBack={onBack}
        onUpdateServices={onUpdateServices}
        onComplete={onComplete}
      />,
      { wrapper: createWrapper() }
    );

    await user.click(screen.getByRole("button", { name: "پکیج‌ها" }));

    expect(await screen.findByText("پکیج لیزر کامل")).toBeInTheDocument();
    expect(screen.getByText("۱۰ جلسه")).toBeInTheDocument();
  });

  it("calls onUpdateServices when adding a service (not onComplete)", async () => {
    const user = userEvent.setup();
    render(
      <WizardStepService
        patient={mockPatient}
        selectedServices={[]}
        onBack={onBack}
        onUpdateServices={onUpdateServices}
        onComplete={onComplete}
      />,
      { wrapper: createWrapper() }
    );

    await user.click(await screen.findByText("لیزر مو"));

    expect(onUpdateServices).toHaveBeenCalledWith([
      {
        serviceId: 1,
        serviceName: "لیزر مو",
        priceToman: "2000000",
        priceUsd: "20.00",
        isPackage: false,
        packageId: null,
      },
    ]);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("calls onUpdateServices when removing a service", async () => {
    const user = userEvent.setup();
    const selected: ServiceSelection[] = [
      {
        serviceId: 1,
        serviceName: "لیزر مو",
        priceToman: "2000000",
        priceUsd: "20.00",
        isPackage: false,
        packageId: null,
      },
    ];

    render(
      <WizardStepService
        patient={mockPatient}
        selectedServices={selected}
        onBack={onBack}
        onUpdateServices={onUpdateServices}
        onComplete={onComplete}
      />,
      { wrapper: createWrapper() }
    );

    const deleteBtn = screen.getByRole("button", { name: "" });
    await user.click(deleteBtn);

    expect(onUpdateServices).toHaveBeenCalledWith([]);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("calls onComplete only when continue button is clicked", async () => {
    const user = userEvent.setup();
    const selected: ServiceSelection[] = [
      {
        serviceId: 1,
        serviceName: "لیزر مو",
        priceToman: "2000000",
        priceUsd: "20.00",
        isPackage: false,
        packageId: null,
      },
    ];

    render(
      <WizardStepService
        patient={mockPatient}
        selectedServices={selected}
        onBack={onBack}
        onUpdateServices={onUpdateServices}
        onComplete={onComplete}
      />,
      { wrapper: createWrapper() }
    );

    await user.click(screen.getByRole("button", { name: "ادامه به پرداخت" }));

    expect(onComplete).toHaveBeenCalledWith(selected);
  });

  it("does not duplicate already selected services", async () => {
    const user = userEvent.setup();
    const selected: ServiceSelection[] = [
      {
        serviceId: 1,
        serviceName: "لیزر مو",
        priceToman: "2000000",
        priceUsd: "20.00",
        isPackage: false,
        packageId: null,
      },
    ];

    render(
      <WizardStepService
        patient={mockPatient}
        selectedServices={selected}
        onBack={onBack}
        onUpdateServices={onUpdateServices}
        onComplete={onComplete}
      />,
      { wrapper: createWrapper() }
    );

    const matches = screen.getAllByText("لیزر مو");
    await user.click(matches[0]);

    expect(onUpdateServices).not.toHaveBeenCalled();
  });

  it("disables continue button when no services selected", async () => {
    render(
      <WizardStepService
        patient={mockPatient}
        selectedServices={[]}
        onBack={onBack}
        onUpdateServices={onUpdateServices}
        onComplete={onComplete}
      />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "ادامه به پرداخت" })).toBeDisabled();
    });
  });

  it("calls onBack when back button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <WizardStepService
        patient={mockPatient}
        selectedServices={[]}
        onBack={onBack}
        onUpdateServices={onUpdateServices}
        onComplete={onComplete}
      />,
      { wrapper: createWrapper() }
    );

    await user.click(screen.getByRole("button", { name: "بازگشت" }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
