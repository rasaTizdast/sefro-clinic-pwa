import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PatientData } from "../../../types/wizard";
import WizardStepPatient from "../WizardStepPatient";

vi.mock("react-calendar-datetime-picker", () => ({
  DtPicker: () => null,
}));

const mockListCustomers = vi.fn();

vi.mock("../../../services/customers", () => ({
  listCustomers: (...args: unknown[]) => mockListCustomers(...args),
}));

const emptyPatient: PatientData = {
  id: null,
  firstName: "",
  lastName: "",
  mobileNumber: "",
  nationalId: "",
  isNew: true,
  visitCount: 0,
  totalSpent: 0,
  lastVisit: null,
  servicesHistory: [],
  notes: "",
  birthday: "",
  fileSysId: "",
};

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("WizardStepPatient", () => {
  const onComplete = vi.fn();
  const onBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockListCustomers.mockResolvedValue({ data: [] });
  });

  it("renders search input and new patient button", () => {
    render(<WizardStepPatient patient={emptyPatient} onBack={onBack} onComplete={onComplete} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByPlaceholderText("نام، موبایل یا کد ملی...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /بیمار جدید/ })).toBeInTheDocument();
  });

  it("shows new patient form with all required fields", async () => {
    const user = userEvent.setup();
    render(<WizardStepPatient patient={emptyPatient} onBack={onBack} onComplete={onComplete} />, {
      wrapper: createWrapper(),
    });

    await user.click(screen.getByRole("button", { name: /بیمار جدید/ }));

    expect(screen.getByLabelText("نام")).toBeInTheDocument();
    expect(screen.getByLabelText("نام خانوادگی")).toBeInTheDocument();
    expect(screen.getByLabelText("موبایل")).toBeInTheDocument();
    expect(screen.getByLabelText("کد ملی")).toBeInTheDocument();
    expect(screen.getByText("تاریخ تولد")).toBeInTheDocument();
    expect(screen.getByLabelText("شماره پرونده")).toBeInTheDocument();
    expect(screen.getByLabelText("یادداشت‌ها")).toBeInTheDocument();
  });

  it("disables submit when required fields are empty", async () => {
    const user = userEvent.setup();
    render(<WizardStepPatient patient={emptyPatient} onBack={onBack} onComplete={onComplete} />, {
      wrapper: createWrapper(),
    });

    await user.click(screen.getByRole("button", { name: /بیمار جدید/ }));

    expect(screen.getByRole("button", { name: "ثبت و ادامه" })).toBeDisabled();
  });

  it("enables submit when required fields are filled", async () => {
    const user = userEvent.setup();
    render(<WizardStepPatient patient={emptyPatient} onBack={onBack} onComplete={onComplete} />, {
      wrapper: createWrapper(),
    });

    await user.click(screen.getByRole("button", { name: /بیمار جدید/ }));

    await user.type(screen.getByLabelText("نام"), "علی");
    await user.type(screen.getByLabelText("نام خانوادگی"), "رضایی");
    await user.type(screen.getByLabelText("موبایل"), "09121234567");
    await user.type(screen.getByLabelText("کد ملی"), "0012345678");

    expect(screen.getByRole("button", { name: "ثبت و ادامه" })).not.toBeDisabled();
  });

  it("creates new patient with notes, birthday, and fileSysId", async () => {
    const user = userEvent.setup();
    render(<WizardStepPatient patient={emptyPatient} onBack={onBack} onComplete={onComplete} />, {
      wrapper: createWrapper(),
    });

    await user.click(screen.getByRole("button", { name: /بیمار جدید/ }));

    await user.type(screen.getByLabelText("نام"), "علی");
    await user.type(screen.getByLabelText("نام خانوادگی"), "رضایی");
    await user.type(screen.getByLabelText("موبایل"), "09121234567");
    await user.type(screen.getByLabelText("کد ملی"), "0012345678");
    await user.type(screen.getByLabelText("شماره پرونده"), "12345");
    await user.type(screen.getByLabelText("یادداشت‌ها"), "یادداشت آزمایشی");

    const submitBtn = screen.getByRole("button", { name: "ثبت و ادامه" });
    await waitFor(() => expect(submitBtn).not.toBeDisabled());
    await user.click(submitBtn);

    await waitFor(() => expect(screen.getByText("انتخاب بیمار")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "ادامه" }));

    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: "علی",
        lastName: "رضایی",
        mobileNumber: "09121234567",
        nationalId: "0012345678",
        notes: "یادداشت آزمایشی",
        fileSysId: "12345",
        isNew: true,
      })
    );
  });

  it("calls onBack when back button is clicked", async () => {
    const user = userEvent.setup();
    render(<WizardStepPatient patient={emptyPatient} onBack={onBack} onComplete={onComplete} />, {
      wrapper: createWrapper(),
    });

    await user.click(screen.getByRole("button", { name: "بازگشت" }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it("disables continue when no patient selected", () => {
    render(<WizardStepPatient patient={emptyPatient} onBack={onBack} onComplete={onComplete} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByRole("button", { name: "ادامه" })).toBeDisabled();
  });

  it("hides search input when new patient form is open", async () => {
    const user = userEvent.setup();
    render(<WizardStepPatient patient={emptyPatient} onBack={onBack} onComplete={onComplete} />, {
      wrapper: createWrapper(),
    });

    await user.click(screen.getByRole("button", { name: /بیمار جدید/ }));

    expect(screen.queryByPlaceholderText("نام، موبایل یا کد ملی...")).not.toBeInTheDocument();
  });

  it("shows cancel button that hides the form", async () => {
    const user = userEvent.setup();
    render(<WizardStepPatient patient={emptyPatient} onBack={onBack} onComplete={onComplete} />, {
      wrapper: createWrapper(),
    });

    await user.click(screen.getByRole("button", { name: /بیمار جدید/ }));
    expect(screen.getByLabelText("نام")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "انصراف" }));
    expect(screen.queryByLabelText("نام")).not.toBeInTheDocument();
  });

  it("strips digits from name fields", async () => {
    const user = userEvent.setup();
    render(<WizardStepPatient patient={emptyPatient} onBack={onBack} onComplete={onComplete} />, {
      wrapper: createWrapper(),
    });

    await user.click(screen.getByRole("button", { name: /بیمار جدید/ }));

    const nameInput = screen.getByLabelText("نام");
    await user.type(nameInput, "علی123");
    expect(nameInput).toHaveValue("علی");
  });

  it("strips non-digits from mobile field", async () => {
    const user = userEvent.setup();
    render(<WizardStepPatient patient={emptyPatient} onBack={onBack} onComplete={onComplete} />, {
      wrapper: createWrapper(),
    });

    await user.click(screen.getByRole("button", { name: /بیمار جدید/ }));

    const mobileInput = screen.getByLabelText("موبایل");
    await user.type(mobileInput, "0912abc3456");
    expect(mobileInput).toHaveValue("09123456");
  });
});
