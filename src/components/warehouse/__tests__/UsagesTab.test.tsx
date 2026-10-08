import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ALL_PER_PAGE } from "../../../services/fetch-all-pages";
import type { ProductUsage } from "../../../types/finance";
import { UsagesTab } from "../UsagesTab";

const state = vi.hoisted(() => ({
  usages: [] as ProductUsage[],
  isLoading: false,
  isError: false,
  error: null as unknown,
  products: [] as { id: number; name: string }[],
  services: [] as { id: number; title: string }[],
  visits: [] as { id: number; customerName: string; time: string }[],
}));

vi.mock("../../../hooks/api", () => ({
  useAllUsages: () => ({
    data: state.usages,
    isLoading: state.isLoading,
    isError: state.isError,
    error: state.error,
  }),
  useAllProducts: () => ({ data: state.products }),
  useAllServices: () => ({ data: state.services }),
  useAllVisits: () => ({ data: state.visits }),
}));

vi.mock("../../ui/JalaliDatePicker", () => ({
  JalaliDatePicker: ({
    value,
    onChange,
    label,
  }: {
    value: string | null;
    onChange: (v: string | null) => void;
    label?: string;
  }) => {
    const id = label ?? "date";
    return (
      <div>
        <label htmlFor={id}>{label}</label>
        <input id={id} onChange={(e) => onChange(e.target.value)} value={value ?? ""} />
      </div>
    );
  },
}));

function usageRow(overrides: Partial<ProductUsage>): ProductUsage {
  return {
    id: 1,
    product: 1,
    visit: null,
    service: null,
    packageSale: null,
    quantity: "1.000",
    unitCostUsdSnapshot: "2.00",
    totalCostUsdSnapshot: "2.00",
    exchangeRateSnapshot: "100000.00",
    createdAt: "2026-09-20T09:00:00Z",
    ...overrides,
  };
}

beforeEach(() => {
  state.usages = [];
  state.isLoading = false;
  state.isError = false;
  state.error = null;
  state.products = [];
  state.services = [];
  state.visits = [];
});

describe("UsagesTab", () => {
  it("totals and counts cover the whole log while the table pages at ALL_PER_PAGE rows", async () => {
    const user = userEvent.setup();
    const count = ALL_PER_PAGE + 25;
    state.products = Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      name: `محصول ${i + 1}`,
    }));
    state.usages = state.products.map((p, i) => usageRow({ id: i + 1, product: p.id }));

    render(<UsagesTab />);

    // Summary cards cover all rows, not just the first page
    expect(screen.getByText("۱۲۵")).toBeInTheDocument();
    expect(screen.getByText("۱۲۵.۰۰۰")).toBeInTheDocument();
    expect(screen.getByText("$250.00")).toBeInTheDocument();
    expect(screen.getByText("۲۵٬۰۰۰٬۰۰۰ تومان")).toBeInTheDocument();

    // Row-level checks stay inside the tables (product names also exist as filter options)
    const tables = screen.getAllByRole("table");
    expect(tables.length).toBeGreaterThan(0);
    for (const table of tables) {
      expect(within(table).getByText("محصول 1")).toBeInTheDocument();
      expect(within(table).queryByText("محصول 101")).not.toBeInTheDocument();
    }

    await user.click(screen.getByRole("button", { name: "Page 2" }));

    for (const table of screen.getAllByRole("table")) {
      expect(within(table).queryByText("محصول 1")).not.toBeInTheDocument();
      expect(within(table).getByText("محصول 101")).toBeInTheDocument();
    }
    expect(screen.getByText("۱۲۵")).toBeInTheDocument();
  });

  it("filters by the Persian date range client-side (the API ignores date params)", async () => {
    const user = userEvent.setup();
    state.products = [
      { id: 1, name: "نیدل قدیمی" },
      { id: 2, name: "نیدل جدید" },
    ];
    state.usages = [
      usageRow({ id: 1, product: 1, createdAt: "2026-09-01T10:00:00Z" }),
      usageRow({ id: 2, product: 2, createdAt: "2026-09-25T10:00:00Z" }),
    ];

    render(<UsagesTab />);

    await user.click(screen.getByRole("button", { name: "نمایش فیلترهای پیشرفته" }));
    // 1405/06/15 = 2026-09-06 → only the September 25 row survives
    await user.type(screen.getByLabelText("از تاریخ"), "1405/06/15");

    expect(screen.getByText("۱")).toBeInTheDocument();
    for (const table of screen.getAllByRole("table")) {
      expect(within(table).queryByText("نیدل قدیمی")).not.toBeInTheDocument();
      expect(within(table).getByText("نیدل جدید")).toBeInTheDocument();
    }

    // 1405/06/19 = 2026-09-10 → the range now ends before the remaining row
    await user.type(screen.getByLabelText("تا تاریخ"), "1405/06/19");
    expect(screen.getByText("با فیلترهای دیگر تلاش کنید.")).toBeInTheDocument();
  });

  it("narrows rows and totals by the selected product", async () => {
    const user = userEvent.setup();
    state.products = [
      { id: 7, name: "نیدل" },
      { id: 8, name: "گاز" },
    ];
    state.usages = [
      usageRow({ id: 1, product: 7, quantity: "2.000", totalCostUsdSnapshot: "4.00" }),
      usageRow({ id: 2, product: 8, quantity: "1.000", totalCostUsdSnapshot: "2.00" }),
    ];

    render(<UsagesTab />);

    await user.click(screen.getByRole("combobox", { name: "محصول" }));
    await user.click(screen.getByRole("option", { name: "گاز" }));

    expect(screen.getByText("۱")).toBeInTheDocument();
    expect(screen.getByText("۱.۰۰۰")).toBeInTheDocument();
    for (const table of screen.getAllByRole("table")) {
      expect(within(table).getByText("گاز")).toBeInTheDocument();
      expect(within(table).queryByText("نیدل")).not.toBeInTheDocument();
    }
  });

  it("shows an error alert instead of an empty state when the query fails", () => {
    state.isError = true;
    state.error = new Error("boom");

    render(<UsagesTab />);

    expect(screen.getByRole("alert")).toHaveTextContent("boom");
    expect(screen.queryByText("هنوز مصرفی در سیستم ثبت نشده است.")).not.toBeInTheDocument();
  });

  it("explains that nothing has been recorded when the log is empty", () => {
    render(<UsagesTab />);

    expect(screen.getByText("هنوز مصرفی در سیستم ثبت نشده است.")).toBeInTheDocument();
    expect(screen.getByText("۰")).toBeInTheDocument();
  });
});
