import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ToastProvider } from "../../ui/Toast";
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
  useAllProducts: () => ({
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
    isLoading: false,
  }),
  useServiceItems: () => ({ data: undefined, isLoading: false }),
  useCreateService: () => ({ mutateAsync: createMutateAsync, isPending: false }),
  useUpdateService: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSyncServiceItems: () => ({ mutateAsync: syncMutateAsync, isPending: false }),
}));

describe("ServiceFormModal", () => {
  it("saves the Toman price and lets the backend derive price_usd", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <ServiceFormModal onClose={() => {}} />
      </ToastProvider>
    );

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
        price: 5000000,
        categoryId: 3,
        compensationRole: "facial",
      })
    );
    // price_usd is the backend's job now — the form must not send a client rate conversion.
    expect(createMutateAsync.mock.calls[0][0].priceUsd).toBeUndefined();
  });

  it("adds consumable rows and syncs them after saving the service", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <ServiceFormModal onClose={() => {}} />
      </ToastProvider>
    );

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
