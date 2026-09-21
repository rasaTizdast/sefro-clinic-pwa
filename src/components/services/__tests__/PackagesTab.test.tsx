import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PackagesTab } from "../PackagesTab";

const pkg = {
  id: 4,
  name: "پکیج لیزر",
  description: "",
  priceUsd: "35.00",
  priceToman: "3500000",
  exchangeRate: "100000.00",
  isActive: true,
  services: [1],
  items: [{ product: 2, quantity: "1.000" }],
};

const saveMutateAsync = vi.fn().mockResolvedValue(pkg);

vi.mock("../../../hooks/api", () => ({
  usePackagesList: () => ({
    data: {
      data: [pkg],
      total: 1,
      page: 1,
      perPage: 20,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    },
    isLoading: false,
  }),
  useSavePackage: () => ({ mutateAsync: saveMutateAsync, isPending: false }),
  useDeletePackage: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useServicesList: () => ({
    data: {
      data: [
        { id: 1, title: "لیزر مو", price: 2000000, duration: 30, isActive: true, description: "" },
      ],
      total: 1,
      page: 1,
      perPage: 100,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    },
    isLoading: false,
  }),
  useProductsList: () => ({
    data: {
      data: [
        {
          id: 2,
          name: "ژل",
          stock: 10,
          unit: "عدد",
          unitPrice: "100000",
          description: "",
          status: "available",
        },
      ],
      total: 1,
      page: 1,
      perPage: 100,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    },
    isLoading: false,
  }),
  useCurrentRate: () => ({
    data: { rate: "100000", rateTomanPerUsd: "100000", effectiveAt: null, source: "manual" },
    isLoading: false,
  }),
}));

describe("PackagesTab", () => {
  it("renders packages with Toman primary and USD secondary prices", () => {
    render(<PackagesTab />);

    expect(screen.getAllByText("پکیج لیزر").length).toBeGreaterThan(0);
    expect(screen.getAllByText("۳٬۵۰۰٬۰۰۰ تومان").length).toBeGreaterThan(0);
    expect(screen.getAllByText("$35.00").length).toBeGreaterThan(0);
  });

  it("creates a package with converted priceUsd, serviceIds and items", async () => {
    const user = userEvent.setup();
    render(<PackagesTab />);

    await user.click(screen.getByRole("button", { name: "پکیج جدید" }));

    await user.type(screen.getByLabelText("نام پکیج"), "پکیج تست");
    const price = screen.getByLabelText("قیمت (تومان)");
    await user.clear(price);
    await user.type(price, "5000000");

    await user.click(screen.getByText("لیزر مو"));

    await user.click(screen.getByRole("button", { name: "+ افزودن ردیف" }));
    const comboboxes = screen.getAllByRole("combobox");
    await user.click(comboboxes[comboboxes.length - 1]);
    await user.click(screen.getByText("ژل"));

    await user.click(screen.getByRole("button", { name: "ذخیره" }));

    expect(saveMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "پکیج تست",
        priceUsd: "50.00",
        serviceIds: [1],
        items: [{ product: 2, quantity: "1.000" }],
      })
    );
  });

  it("asks for confirmation before deleting a package", async () => {
    const user = userEvent.setup();
    render(<PackagesTab />);

    await user.click(screen.getAllByRole("button", { name: "حذف" })[0]);
    expect(screen.getByRole("heading", { name: "حذف پکیج" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "حذف پکیج" })).toBeInTheDocument();
  });
});
