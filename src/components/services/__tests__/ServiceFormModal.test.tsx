import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ServiceFormModal } from "../ServiceFormModal";

const createMutateAsync = vi.fn().mockResolvedValue({ id: 9 });
const syncMutateAsync = vi.fn().mockResolvedValue([]);

vi.mock("../../../hooks/api", () => ({
  useCurrentRate: () => ({
    data: { rate: "100000", rateTomanPerUsd: "100000", effectiveAt: null, source: "manual" },
    isLoading: false,
  }),
  useServiceCategories: () => ({
    data: [{ id: 3, name: "لیزر", slug: "laser", description: "", isActive: true, sortOrder: 1 }],
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
  useServiceItems: () => ({ data: undefined, isLoading: false }),
  useCreateService: () => ({ mutateAsync: createMutateAsync, isPending: false }),
  useUpdateService: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSyncServiceItems: () => ({ mutateAsync: syncMutateAsync, isPending: false }),
}));

describe("ServiceFormModal", () => {
  it("saves with price_usd converted from Toman plus category and role", async () => {
    const user = userEvent.setup();
    render(<ServiceFormModal onClose={() => {}} />);

    await user.type(screen.getByLabelText("نام خدمت"), "لیزر مو");
    await user.type(screen.getByLabelText("مدت زمان (دقیقه)"), "45");
    await user.type(screen.getByLabelText("قیمت (تومان)"), "5000000");

    const selects = screen.getAllByRole("combobox");
    await user.click(selects[0]);
    await user.click(await screen.findByText("لیزر", undefined, { timeout: 5000 }));
    await user.click(selects[1]);
    await user.click(await screen.findByText("فیشال", undefined, { timeout: 5000 }));

    await user.click(screen.getByRole("button", { name: "ذخیره" }));

    expect(createMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "لیزر مو",
        priceUsd: "50.00",
        categoryId: 3,
        compensationRole: "facial",
      })
    );
  });

  it("adds consumable rows and syncs them after saving the service", async () => {
    const user = userEvent.setup();
    render(<ServiceFormModal onClose={() => {}} />);

    await user.type(screen.getByLabelText("نام خدمت"), "لیزر مو");
    await user.type(screen.getByLabelText("مدت زمان (دقیقه)"), "45");
    await user.type(screen.getByLabelText("قیمت (تومان)"), "5000000");

    await user.click(screen.getByRole("button", { name: "+ افزودن ردیف" }));
    const selects = screen.getAllByRole("combobox");
    await user.click(selects[selects.length - 1]);
    await user.click(await screen.findByText("ژل"));

    await user.click(screen.getByRole("button", { name: "ذخیره" }));

    expect(createMutateAsync).toHaveBeenCalled();
    expect(syncMutateAsync).toHaveBeenCalledWith({
      serviceId: 9,
      items: [{ product: 2, quantity: "1.000" }],
    });
  });
});
