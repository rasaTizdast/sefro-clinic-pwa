import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CheckoutModal } from "../CheckoutModal";

const checkoutMutateAsync = vi.fn().mockResolvedValue({ id: 1 });
const recordConsumptionMutateAsync = vi.fn().mockResolvedValue(undefined);

vi.mock("../../../hooks/api", () => ({
  useCurrentRate: () => ({
    data: { rate: "100000.00", rateTomanPerUsd: "100000", effectiveAt: null, source: "manual" },
    isLoading: false,
  }),
  useCheckout: () => ({
    mutateAsync: checkoutMutateAsync,
    isPending: false,
  }),
  useRecordConsumption: () => ({
    mutateAsync: recordConsumptionMutateAsync,
    isPending: false,
  }),
}));

describe("CheckoutModal", () => {
  it("renders the total and defaults cash to the total with card at 0", () => {
    render(
      <CheckoutModal
        open
        onClose={() => {}}
        customerId={1}
        visitId={9}
        defaultTotalToman={1000000}
      />
    );

    expect(screen.getByText("تسویه و ثبت فروش")).toBeInTheDocument();
    expect(screen.getByLabelText("مبلغ کل (تومان)")).toHaveValue("۱٬۰۰۰٬۰۰۰");
    expect(screen.getByLabelText("نقدی (تومان)")).toHaveValue("۱٬۰۰۰٬۰۰۰");
    expect(screen.getByLabelText("کارتی (تومان)")).toHaveValue("");
  });

  it("auto-fills card as total minus cash when cash changes", async () => {
    const user = userEvent.setup();
    render(
      <CheckoutModal
        open
        onClose={() => {}}
        customerId={1}
        visitId={9}
        defaultTotalToman={1000000}
      />
    );

    const cash = screen.getByLabelText("نقدی (تومان)");
    await user.clear(cash);
    await user.type(cash, "400000");

    expect(screen.getByLabelText("کارتی (تومان)")).toHaveValue("۶۰۰٬۰۰۰");
  });

  it("disables submit when the split does not equal the total", async () => {
    const user = userEvent.setup();
    render(<CheckoutModal open onClose={() => {}} customerId={1} defaultTotalToman={1000000} />);

    // cash above the total cannot be absorbed by card, so the split no longer matches
    const cash = screen.getByLabelText("نقدی (تومان)");
    await user.clear(cash);
    await user.type(cash, "3000000");

    expect(screen.getByRole("button", { name: "ثبت فروش" })).toBeDisabled();
    expect(screen.getByText("مجموع نقدی و کارتی باید برابر مبلغ کل باشد")).toBeInTheDocument();
  });

  it("submits a checkout payload built from the split and closes on success", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <CheckoutModal
        open
        onClose={onClose}
        customerId={5}
        visitId={9}
        defaultTotalToman={1000000}
      />
    );

    await user.click(screen.getByRole("button", { name: "ثبت فروش" }));

    expect(checkoutMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: 5,
        amountUsd: "10.00",
        visit: 9,
        components: expect.any(Array),
      })
    );
    expect(onClose).toHaveBeenCalled();
  });

  it("records edited consumption before checkout", async () => {
    const user = userEvent.setup();
    render(
      <CheckoutModal
        open
        onClose={() => {}}
        customerId={1}
        visitId={12}
        defaultTotalToman={500000}
        consumables={{ 4: [{ product: 2, quantity: "1.500" }] }}
        productNames={{ 2: "ژل" }}
      />
    );

    const qty = screen.getByLabelText("ژل");
    await user.clear(qty);
    await user.type(qty, "2.000");
    await user.click(screen.getByRole("button", { name: "ثبت فروش" }));

    expect(recordConsumptionMutateAsync).toHaveBeenCalledWith({
      visitId: 12,
      selection: { 4: [{ product: 2, quantity: "2.000" }] },
    });
    expect(checkoutMutateAsync).toHaveBeenCalled();
  });

  it("does not render when closed", () => {
    render(
      <CheckoutModal open={false} onClose={() => {}} customerId={1} defaultTotalToman={1000000} />
    );

    expect(screen.queryByText("تسویه و ثبت فروش")).not.toBeInTheDocument();
  });
});
