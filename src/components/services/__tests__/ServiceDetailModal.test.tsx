import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { Service } from "../../../types/service";
import { ServiceDetailModal } from "../ServiceDetailModal";

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
  compensationRole: "none",
  products: [],
  estimatedCostUsd: "2.00",
  estimatedCostToman: "200000",
  estimatedGrossProfitUsd: "3.00",
  estimatedGrossProfitToman: "300000",
  estimatedMarginPercent: "60",
};

describe("ServiceDetailModal", () => {
  it("renders the service price with both currencies", () => {
    render(<ServiceDetailModal service={baseService} onClose={vi.fn()} />);

    expect(screen.getByText("لیزر مو")).toBeInTheDocument();
    expect(screen.getByText("۵۰۰٬۰۰۰ تومان ($۵.۰۰)")).toBeInTheDocument();
    expect(screen.getByText("قیمت خدمت")).toBeInTheDocument();
  });

  it("renders meta badges and the description fallback", () => {
    render(<ServiceDetailModal service={baseService} onClose={vi.fn()} />);

    expect(screen.getByText("۳۰ دقیقه")).toBeInTheDocument();
    expect(screen.getByText("بدون اپراتور")).toBeInTheDocument();
    expect(screen.getByText("فعال")).toBeInTheDocument();
    expect(screen.getByText("توضیحاتی برای این خدمت ثبت نشده است.")).toBeInTheDocument();
  });

  it("derives the Toman price from USD when price_toman is missing", () => {
    const service: Service = {
      ...baseService,
      priceToman: null,
    };
    render(<ServiceDetailModal service={service} onClose={vi.fn()} />);

    // 5 USD × 100,000 = 500,000 Toman.
    expect(screen.getByText("۵۰۰٬۰۰۰ تومان ($۵.۰۰)")).toBeInTheDocument();
  });
});
