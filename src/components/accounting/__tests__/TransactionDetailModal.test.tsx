import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TransactionDetailModal } from "../TransactionDetailModal";

const baseTransaction = {
  id: 1,
  date: "۱۴۰۴/۱۰/۱۵",
  description: "پرداخت ویزیت",
  patient: "علی رضایی",
  amount: 250000,
  paymentMethod: "cash" as const,
  status: "paid" as const,
};

describe("TransactionDetailModal", () => {
  it("returns null when transaction is null", () => {
    const { container } = render(
      <TransactionDetailModal open onClose={() => {}} transaction={null} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders transaction title", () => {
    render(<TransactionDetailModal open onClose={() => {}} transaction={baseTransaction} />);
    expect(screen.getByText("جزئیات تراکنش")).toBeInTheDocument();
  });

  it("renders transaction date", () => {
    render(<TransactionDetailModal open onClose={() => {}} transaction={baseTransaction} />);
    expect(screen.getByText("۱۴۰۴/۱۰/۱۵")).toBeInTheDocument();
  });

  it("renders patient name", () => {
    render(<TransactionDetailModal open onClose={() => {}} transaction={baseTransaction} />);
    expect(screen.getByText("علی رضایی")).toBeInTheDocument();
  });

  it("renders description", () => {
    render(<TransactionDetailModal open onClose={() => {}} transaction={baseTransaction} />);
    expect(screen.getByText("پرداخت ویزیت")).toBeInTheDocument();
  });

  it("renders formatted price", () => {
    render(<TransactionDetailModal open onClose={() => {}} transaction={baseTransaction} />);
    expect(screen.getByText(/۲۵۰٬۰۰۰/)).toBeInTheDocument();
  });

  it("renders payment method label", () => {
    render(<TransactionDetailModal open onClose={() => {}} transaction={baseTransaction} />);
    expect(screen.getByText("نقدی")).toBeInTheDocument();
  });

  it("renders payment method label for card", () => {
    render(
      <TransactionDetailModal
        open
        onClose={() => {}}
        transaction={{ ...baseTransaction, paymentMethod: "card" }}
      />
    );
    expect(screen.getByText("کارت خوان")).toBeInTheDocument();
  });

  it("renders payment method label for transfer", () => {
    render(
      <TransactionDetailModal
        open
        onClose={() => {}}
        transaction={{ ...baseTransaction, paymentMethod: "transfer" }}
      />
    );
    expect(screen.getByText("کارت به کارت")).toBeInTheDocument();
  });

  it("renders paid status badge", () => {
    render(<TransactionDetailModal open onClose={() => {}} transaction={baseTransaction} />);
    expect(screen.getByText("پرداخت شده")).toBeInTheDocument();
  });

  it("renders cancelled status badge", () => {
    render(
      <TransactionDetailModal
        open
        onClose={() => {}}
        transaction={{ ...baseTransaction, status: "cancelled" }}
      />
    );
    expect(screen.getByText("لغو شده")).toBeInTheDocument();
  });

  it("renders service info when provided", () => {
    const service = {
      id: 1,
      title: "ویزیت عمومی",
      duration: 30,
      description: "معاینه کامل",
      price: 250000,
      isActive: true,
      priceUsd: "0.00",
      priceToman: null,
      exchangeRate: null,
      category: null,
      compensationRole: "none" as const,
      products: [],
      estimatedCostUsd: "0.00",
      estimatedCostToman: null,
      estimatedGrossProfitUsd: "0.00",
      estimatedGrossProfitToman: null,
      estimatedMarginPercent: "0",
    };
    render(
      <TransactionDetailModal
        open
        onClose={() => {}}
        transaction={baseTransaction}
        service={service}
      />
    );
    expect(screen.getByText("ویزیت عمومی")).toBeInTheDocument();
    expect(
      screen.getByText((content) => content.includes("30") && content.includes("دقیقه"))
    ).toBeInTheDocument();
    expect(screen.getByText("معاینه کامل")).toBeInTheDocument();
  });

  it("renders close button in footer", () => {
    render(<TransactionDetailModal open onClose={() => {}} transaction={baseTransaction} />);
    const buttons = screen.getAllByRole("button", { name: "بستن" });
    expect(buttons.length).toBe(2);
  });
});
