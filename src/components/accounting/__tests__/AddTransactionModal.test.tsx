import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-calendar-datetime-picker", () => ({
  DtPicker: () => null,
}));

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual("@tanstack/react-query");
  return {
    ...actual,
    useQueries: () => [],
  };
});

import { AddTransactionModal } from "../AddTransactionModal";

const mockMutateAsync = vi.fn().mockResolvedValue(undefined);

vi.mock("../../../hooks/api", () => ({
  useVisitsList: () => ({
    data: {
      data: [
        {
          id: 1,
          customer: 1,
          customerName: "علی رضایی",
          customerMobile: "09121234567",
          status: "confirmed",
          date: "1404/03/15",
          time: "10:30",
          services: [1],
          serviceNames: ["ویزیت عمومی"],
        },
      ],
      meta: { total: 1, perPage: 200, currentPage: 1, lastPage: 1 },
    },
    isLoading: false,
  }),
  useServicesList: () => ({
    data: {
      data: [
        {
          id: 1,
          title: "ویزیت عمومی",
          price: 250000,
          duration: 30,
          isActive: true,
          description: "",
        },
      ],
      meta: { total: 1, perPage: 200, currentPage: 1, lastPage: 1 },
    },
  }),
  useCreatePayment: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

vi.mock("../../../services/customers", () => ({
  getCustomer: vi.fn().mockResolvedValue({
    id: 1,
    firstName: "علی",
    lastName: "رضایی",
    mobileNumber: "09121234567",
  }),
}));

describe("AddTransactionModal", () => {
  it("renders modal title when open", () => {
    render(<AddTransactionModal open onClose={() => {}} />);
    expect(screen.getByText("انتخاب ویزیت")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(<AddTransactionModal open={false} onClose={() => {}} />);
    expect(screen.queryByText("انتخاب ویزیت")).not.toBeInTheDocument();
  });

  it("renders visit selection step", () => {
    render(<AddTransactionModal open onClose={() => {}} />);
    expect(screen.getByText("علی رضایی")).toBeInTheDocument();
  });

  it("renders step indicator", () => {
    render(<AddTransactionModal open onClose={() => {}} />);
    expect(screen.getByText("ویزیت")).toBeInTheDocument();
    expect(screen.getByText("پرداخت")).toBeInTheDocument();
  });

  it("shows cancel button on visit step", () => {
    render(<AddTransactionModal open onClose={() => {}} />);
    expect(screen.getByRole("button", { name: "انصراف" })).toBeInTheDocument();
  });

  it("calls onClose when cancel clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<AddTransactionModal open onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: "انصراف" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("renders date picker label", () => {
    render(<AddTransactionModal open onClose={() => {}} />);
    expect(screen.getByText("تاریخ")).toBeInTheDocument();
  });
});
