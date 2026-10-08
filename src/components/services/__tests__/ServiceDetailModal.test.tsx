import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { Service } from "../../../types/service";
import { ServiceDetailModal } from "../ServiceDetailModal";

vi.mock("../../../hooks/api/useProductsQuery", () => ({
  useAllProducts: () => ({
    data: [
      {
        id: 10,
        name: "نیدل",
        stock: 200,
        unit: "عدد",
        unitPrice: "50000.00",
        unitPriceUsd: "0.50",
        description: "",
        status: "available",
      },
    ],
    isLoading: false,
    error: null,
  }),
}));

const baseService: Service = {
  id: 1,
  title: "لیزر مو",
  duration: 30,
  price: 500000,
  description: "",
  isActive: true,
  priceUsd: "5.00",
  priceToman: "500000",
  exchangeRate: "100000",
  category: null,
  compensationRole: "none",
  products: [
    { product: 10, name: "نیدل", quantity: "2", unitCostUsd: "1.00", totalCostUsd: "2.00" },
  ],
  estimatedCostUsd: "2.00",
  estimatedCostToman: "200000",
  estimatedGrossProfitUsd: "3.00",
  estimatedGrossProfitToman: "300000",
  estimatedMarginPercent: "60",
};

describe("ServiceDetailModal", () => {
  it("bills goods at unit_price, not at purchase cost", () => {
    render(<ServiceDetailModal service={baseService} onClose={vi.fn()} />);

    // Goods billable at selling price: 2 × 50,000 = 100,000 Toman ($1.00).
    expect(screen.getAllByText("۱۰۰٬۰۰۰ تومان ($۱.۰۰)").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText("به قیمت فروش واحد محصول؛ همین مبلغ به صورتحساب مشتری اضافه می‌شود")
    ).toBeInTheDocument();

    // The 200,000 Toman purchase cost exists only in the profit breakdown line —
    // no card ever renders it as the billed materials amount.
    expect(screen.queryByText("۲۰۰٬۰۰۰ تومان ($۲.۰۰)")).not.toBeInTheDocument();
    expect(
      screen.getByText(/بهای خرید مواد \(پایه سود\): ۲۰۰٬۰۰۰ تومان \(\$۲\.۰۰\)/)
    ).toBeInTheDocument();

    // Finished customer price = fee (500,000) + goods (100,000) = 600,000.
    expect(screen.getByText("۶۰۰٬۰۰۰ تومان ($۶.۰۰)")).toBeInTheDocument();

    // Real profit = finished − purchase cost = 400,000.
    expect(screen.getByText("۴۰۰٬۰۰۰ تومان ($۴.۰۰)")).toBeInTheDocument();

    // Fee card shows labor only.
    expect(screen.getByText("۵۰۰٬۰۰۰ تومان ($۵.۰۰)")).toBeInTheDocument();
    expect(screen.getByText("دستمزد خدمت؛ بهای مواد داخل آن نیست")).toBeInTheDocument();
  });

  it("shows the equation, share bars and the billable goods subtotal", () => {
    render(<ServiceDetailModal service={baseService} onClose={vi.fn()} />);

    expect(screen.getByText(/مبلغ نهایی = اجرت \+ مواد/)).toBeInTheDocument();
    expect(screen.getByText(/۶۰۰٬۰۰۰ = ۵۰۰٬۰۰۰ \+ ۱۰۰٬۰۰۰/)).toBeInTheDocument();

    // Separate share bars: goods 100k/600k = 16.7%, profit 400k/600k = 66.7%.
    expect(screen.getByText("16.7٪")).toBeInTheDocument();
    expect(screen.getByText("66.7٪")).toBeInTheDocument();

    expect(
      screen.getByText("جمع مواد (به صورتحساب مشتری): ۱۰۰٬۰۰۰ تومان ($۱.۰۰)")
    ).toBeInTheDocument();

    // Table unit price column shows the selling price.
    expect(
      screen.getAllByRole("columnheader", { name: "قیمت واحد" }).length
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("۵۰٬۰۰۰ تومان").length).toBeGreaterThanOrEqual(1);
  });

  it("falls back to — when the product selling price is unknown", () => {
    const service: Service = {
      ...baseService,
      products: [
        { product: 777, name: "نامشخص", quantity: "1", unitCostUsd: "1.00", totalCostUsd: "1.00" },
      ],
    };
    render(<ServiceDetailModal service={service} onClose={vi.fn()} />);

    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText("جمع مواد (به صورتحساب مشتری): —")).toBeInTheDocument();
    // Finished and profit cards cannot be derived either.
    expect(screen.queryByText("۶۰۰٬۰۰۰ تومان ($۶.۰۰)")).not.toBeInTheDocument();
  });
});
