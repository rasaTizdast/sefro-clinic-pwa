import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ToastProvider } from "../../ui/Toast";
import { ServiceFormModal } from "../ServiceFormModal";

const createMutateAsync = vi.fn().mockResolvedValue({ id: 9 });

vi.mock("../../../hooks/api", () => ({
  useCurrentRate: () => ({
    data: { rate: "100000", rateTomanPerUsd: "100000", effectiveAt: null, source: "manual" },
    isLoading: false,
  }),
  useCreateService: () => ({ mutateAsync: createMutateAsync, isPending: false }),
  useUpdateService: () => ({ mutateAsync: vi.fn(), isPending: false }),
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
    await user.click(await screen.findByText("فیشال", undefined, { timeout: 5000 }));

    await user.click(screen.getByRole("button", { name: "ذخیره" }));

    expect(createMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "لیزر مو",
        price: 5000000,
        compensationRole: "facial",
      })
    );
    // price_usd is the backend's job now — the form must not send a client rate conversion.
    expect(createMutateAsync.mock.calls[0][0].priceUsd).toBeUndefined();
  });

  it("offers the none role (no operator) and saves it", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <ServiceFormModal onClose={() => {}} />
      </ToastProvider>
    );

    await user.type(screen.getByLabelText("نام خدمت"), "مشاوره");
    await user.type(screen.getByLabelText("مدت زمان (دقیقه)"), "15");
    await user.type(screen.getByLabelText("قیمت (تومان)"), "50000");

    const selects = screen.getAllByRole("combobox");
    await user.click(selects[0]);
    await user.click(await screen.findByText("بدون اپراتور", undefined, { timeout: 5000 }));

    await user.click(screen.getByRole("button", { name: "ذخیره" }));

    expect(createMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "مشاوره",
        compensationRole: "none",
      })
    );
  });
});
