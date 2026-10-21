import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ToastProvider } from "../../ui/Toast";
import { CheckoutModal } from "../CheckoutModal";

const checkoutMutateAsync = vi.fn().mockResolvedValue({ id: 1 });
const recordConsumptionMutateAsync = vi.fn().mockResolvedValue(undefined);
const issueWelcomePackMutateAsync = vi.fn().mockResolvedValue(undefined);
const toastWarning = vi.fn();

const state = vi.hoisted(() => ({ recordedUsages: 0 }));

// handleSubmit awaits a proactive token refresh; without a backend that real
// request stalls and leaks between tests, so stub it out.
vi.mock("../../../lib/api-client", () => ({
  ensureFreshToken: vi.fn().mockResolvedValue(undefined),
}));

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
  useIssueWelcomePack: () => ({
    mutateAsync: issueWelcomePackMutateAsync,
    isPending: false,
  }),
  useVisitConsumptionCount: () => ({ data: state.recordedUsages }),
}));

vi.mock("../../ui/Toast", async () => {
  const actual = await vi.importActual<typeof import("../../ui/Toast")>("../../ui/Toast");
  return {
    ...actual,
    useToast: () => ({ warning: toastWarning, success: vi.fn(), error: vi.fn(), info: vi.fn() }),
  };
});

/** The modal raises toasts now, so every render needs the provider. */
const renderModal = (ui: ReactElement) => render(<ToastProvider>{ui}</ToastProvider>);

describe("CheckoutModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.recordedUsages = 0;
    recordConsumptionMutateAsync.mockResolvedValue(undefined);
  });

  it("renders the total and three payment methods", () => {
    renderModal(
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
    expect(screen.getByLabelText("نقدی (تومان)")).toHaveValue("1000000");
    expect(screen.getByLabelText("نقدی (دلار)")).toBeInTheDocument();
    expect(screen.getByLabelText("کارتخوان (تومان)")).toBeInTheDocument();
  });

  it("accepts a three-way split that sums to the total", async () => {
    const user = userEvent.setup();
    renderModal(
      <CheckoutModal
        open
        onClose={() => {}}
        customerId={1}
        visitId={9}
        defaultTotalToman={1000000}
      />
    );

    // total 1,000,000 with rate 100,000: 4000 toman + 20 USD (=2,000? no) — use exact split:
    // cash 400,000 + card 600,000 + 0 USD stays valid
    const cash = screen.getByLabelText("نقدی (تومان)");
    await user.clear(cash);
    await user.type(cash, "400000");

    const card = screen.getByLabelText("کارتخوان (تومان)");
    await user.clear(card);
    await user.type(card, "600000");

    expect(screen.getByRole("button", { name: "ثبت فروش" })).not.toBeDisabled();
  });

  it("disables submit when the split does not equal the total", async () => {
    const user = userEvent.setup();
    renderModal(
      <CheckoutModal open onClose={() => {}} customerId={1} defaultTotalToman={1000000} />
    );

    // cash above the total cannot be absorbed by card, so the split no longer matches
    const cash = screen.getByLabelText("نقدی (تومان)");
    await user.clear(cash);
    await user.type(cash, "3000000");

    expect(screen.getByRole("button", { name: "ثبت فروش" })).toBeDisabled();
    expect(
      screen.getByText("مجموع نقدی (تومان) + نقدی (دلار) + کارتی باید برابر مبلغ کل باشد")
    ).toBeInTheDocument();
  });

  it("submits a checkout payload built from the split and closes on success", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderModal(
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

  it("records the visit's recipe consumption on checkout without any edit", async () => {
    const user = userEvent.setup();
    renderModal(
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

    // Nothing touched in the consumption step — the prefilled quantities still
    // go out explicitly (the backend applies no recipe defaults anymore).
    await user.click(screen.getByRole("button", { name: "ثبت فروش" }));

    expect(recordConsumptionMutateAsync).toHaveBeenCalledWith({
      visitId: 12,
      selection: { 4: [{ product: 2, quantity: "1.500" }] },
      extraProducts: [],
      zeroConsumption: {},
    });
    expect(recordConsumptionMutateAsync.mock.invocationCallOrder[0]).toBeLessThan(
      checkoutMutateAsync.mock.invocationCallOrder[0]
    );
  });

  it("forwards the billed manual extras to the consumption record", async () => {
    const user = userEvent.setup();
    const extras = [
      { product: 99, productName: "آلکاریسا", quantity: "2", priceToman: "100000", priceUsd: "0" },
    ];
    renderModal(
      <CheckoutModal
        open
        onClose={() => {}}
        customerId={1}
        visitId={15}
        defaultTotalToman={500000}
        extraProducts={extras}
      />
    );

    await user.click(screen.getByRole("button", { name: "ثبت فروش" }));

    expect(recordConsumptionMutateAsync).toHaveBeenCalledWith({
      visitId: 15,
      selection: {},
      extraProducts: extras,
      zeroConsumption: {},
    });
  });

  it("does not record consumption when there is nothing to record", async () => {
    const user = userEvent.setup();
    renderModal(
      <CheckoutModal
        open
        onClose={() => {}}
        customerId={1}
        visitId={13}
        defaultTotalToman={500000}
      />
    );

    // An empty body records nothing server-side anymore, so no request is sent.
    await user.click(screen.getByRole("button", { name: "ثبت فروش" }));

    expect(recordConsumptionMutateAsync).not.toHaveBeenCalled();
    expect(checkoutMutateAsync).toHaveBeenCalled();
  });

  it("keeps the quantities the user edited", async () => {
    const user = userEvent.setup();
    renderModal(
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
      extraProducts: [],
      zeroConsumption: {},
    });
  });

  it("routes a service marked «استفاده نشد» to zeroConsumption instead of quantities", async () => {
    const user = userEvent.setup();
    renderModal(
      <CheckoutModal
        open
        onClose={() => {}}
        customerId={1}
        visitId={12}
        defaultTotalToman={500000}
        consumables={{
          4: [{ product: 2, quantity: "1.500" }],
          5: [{ product: 3, quantity: "2" }],
        }}
        productNames={{ 2: "ژل", 3: "ماسک" }}
        serviceNames={{ 4: "لیزر مو", 5: "پاکسازی پوست" }}
      />
    );

    await user.click(screen.getAllByLabelText("استفاده نشد")[0]);

    // Reason input comes pre-filled; the marked service's rows leave the display.
    expect(screen.getByLabelText("دلیل عدم استفاده")).toHaveValue("استفاده نشد");
    expect(screen.queryByLabelText("ژل")).not.toBeInTheDocument();
    expect(screen.getByLabelText("ماسک")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "ثبت فروش" }));

    expect(recordConsumptionMutateAsync).toHaveBeenCalledWith({
      visitId: 12,
      selection: { 5: [{ product: 3, quantity: "2" }] },
      extraProducts: [],
      zeroConsumption: { 4: "استفاده نشد" },
    });
  });

  it("blocks the sale while a «استفاده نشد» reason is empty", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderModal(
      <CheckoutModal
        open
        onClose={onClose}
        customerId={1}
        visitId={12}
        defaultTotalToman={500000}
        consumables={{
          4: [{ product: 2, quantity: "1.500" }],
          5: [{ product: 3, quantity: "2" }],
        }}
        productNames={{ 2: "ژل", 3: "ماسک" }}
      />
    );

    await user.click(screen.getAllByLabelText("استفاده نشد")[0]);
    await user.clear(screen.getByLabelText("دلیل عدم استفاده"));
    await user.click(screen.getByRole("button", { name: "ثبت فروش" }));

    expect(
      screen.getByText("دلیل «استفاده نشد» را برای خدمات علامت‌خورده وارد کنید.")
    ).toBeInTheDocument();
    expect(recordConsumptionMutateAsync).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("does not record twice when the visit already has consumption", async () => {
    const user = userEvent.setup();
    state.recordedUsages = 2;
    renderModal(
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

    await user.click(screen.getByRole("button", { name: "ثبت فروش" }));

    expect(recordConsumptionMutateAsync).not.toHaveBeenCalled();
    expect(checkoutMutateAsync).toHaveBeenCalled();
  });

  it("still records the sale and warns when consumption fails", async () => {
    const user = userEvent.setup();
    recordConsumptionMutateAsync.mockRejectedValue(new Error("موجودی کافی نیست"));
    renderModal(
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

    await user.click(screen.getByRole("button", { name: "ثبت فروش" }));

    expect(checkoutMutateAsync).toHaveBeenCalled();
    expect(toastWarning).toHaveBeenCalledWith(
      "فروش ثبت شد اما مصرف مواد ثبت نشد",
      expect.stringContaining("موجودی کافی نیست")
    );
  });

  it("does not render a discount field", () => {
    renderModal(
      <CheckoutModal open onClose={() => {}} customerId={1} defaultTotalToman={1000000} />
    );

    expect(screen.queryByLabelText(/تخفیف/)).not.toBeInTheDocument();
  });

  it("keeps مبلغ کل editable and prefills نقدی تومان when the total changes", async () => {
    const user = userEvent.setup();
    renderModal(
      <CheckoutModal open onClose={() => {}} customerId={1} defaultTotalToman={1000000} />
    );

    const total = screen.getByLabelText("مبلغ کل (تومان)");
    expect(total).not.toBeDisabled();

    await user.clear(total);
    await user.type(total, "1500000");

    expect(total).toHaveValue("۱٬۵۰۰٬۰۰۰");
    expect(screen.getByLabelText("نقدی (تومان)")).toHaveValue("1500000");
    expect(screen.getByRole("button", { name: "ثبت فروش" })).not.toBeDisabled();
  });

  it("accepts a Persian-digit paste into نقدی (تومان)", async () => {
    const user = userEvent.setup();
    renderModal(
      <CheckoutModal open onClose={() => {}} customerId={1} defaultTotalToman={1000000} />
    );

    const cash = screen.getByLabelText("نقدی (تومان)");
    await user.clear(cash);
    await user.paste("۱٬۰۰۰٬۰۰۰");

    expect(cash).toHaveValue("1000000");
    expect(screen.getByRole("button", { name: "ثبت فروش" })).not.toBeDisabled();
  });

  it("does not render when closed", () => {
    renderModal(
      <CheckoutModal open={false} onClose={() => {}} customerId={1} defaultTotalToman={1000000} />
    );

    expect(screen.queryByText("تسویه و ثبت فروش")).not.toBeInTheDocument();
  });

  it("shows the dollar value of the bill under مبلغ کل", () => {
    renderModal(
      <CheckoutModal open onClose={() => {}} customerId={1} defaultTotalToman={1000000} />
    );

    // rate 100,000 → 1,000,000 تومان = $10.00
    expect(screen.getByText("≈ $۱۰.۰۰ دلار")).toBeInTheDocument();
  });

  it("fills the unpaid remainder into the card field with one click", async () => {
    const user = userEvent.setup();
    renderModal(
      <CheckoutModal open onClose={() => {}} customerId={1} defaultTotalToman={1000000} />
    );

    const cash = screen.getByLabelText("نقدی (تومان)");
    await user.clear(cash);
    await user.type(cash, "400000");

    await user.click(screen.getByRole("button", { name: "ثبت باقیمانده در کارتخوان" }));

    expect(screen.getByLabelText("کارتخوان (تومان)")).toHaveValue("600000");
    expect(screen.getByRole("button", { name: "ثبت فروش" })).not.toBeDisabled();
  });

  describe("booking extras", () => {
    it("keeps the welcome pack out of مبلغ کل and labels it as separate", () => {
      renderModal(
        <CheckoutModal
          open
          onClose={() => {}}
          customerId={1}
          visitId={9}
          defaultTotalToman={1000000}
          welcomePack={{
            packId: 3,
            packName: "پک استقبال",
            totalCostToman: "250000",
            totalCostUsd: "1.02",
          }}
        />
      );

      // the total is whatever the caller computed — the pack is NOT folded in
      expect(screen.getByLabelText("مبلغ کل (تومان)")).toHaveValue("۱٬۰۰۰٬۰۰۰");
      expect(screen.getByText("پک استقبال")).toBeInTheDocument();
      expect(screen.getByText("۲۵۰٬۰۰۰ تومان")).toBeInTheDocument();
      expect(screen.getByText("جدای از مبلغ کل")).toBeInTheDocument();
    });

    it("shows extra warehouse products in the invoice summary", () => {
      renderModal(
        <CheckoutModal
          open
          onClose={() => {}}
          customerId={1}
          visitId={9}
          defaultTotalToman={1150000}
          extraProducts={[
            {
              product: 7,
              productName: "سرم ویتامین",
              quantity: "2",
              priceToman: "75000",
              priceUsd: "0",
            },
          ]}
        />
      );

      expect(screen.getByText(/خلاصه فاکتور/)).toBeInTheDocument();
      expect(screen.getByText(/محصولات اضافه \(1 قلم\)/)).toBeInTheDocument();
      expect(screen.getByText("۱۵۰٬۰۰۰ تومان")).toBeInTheDocument();
    });

    it("issues the welcome pack only after the sale is recorded", async () => {
      const user = userEvent.setup();
      renderModal(
        <CheckoutModal
          open
          onClose={() => {}}
          customerId={5}
          visitId={9}
          defaultTotalToman={1000000}
          welcomePack={{
            packId: 3,
            packName: "پک استقبال",
            totalCostToman: "250000",
            totalCostUsd: "1.02",
          }}
        />
      );

      await user.click(screen.getByRole("button", { name: "ثبت فروش" }));

      expect(checkoutMutateAsync).toHaveBeenCalledTimes(1);
      expect(issueWelcomePackMutateAsync).toHaveBeenCalledWith({
        packId: 3,
        customer: 5,
        visit: 9,
        quantity: "1",
      });
      // sale first, pack second
      expect(issueWelcomePackMutateAsync.mock.invocationCallOrder[0]).toBeGreaterThan(
        checkoutMutateAsync.mock.invocationCallOrder[0]
      );
    });

    it("does not call issue when no pack was selected", async () => {
      const user = userEvent.setup();
      issueWelcomePackMutateAsync.mockClear();
      renderModal(
        <CheckoutModal open onClose={() => {}} customerId={1} defaultTotalToman={1000000} />
      );

      await user.click(screen.getByRole("button", { name: "ثبت فروش" }));

      expect(issueWelcomePackMutateAsync).not.toHaveBeenCalled();
    });

    it("keeps the sale when the pack cannot be issued", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      issueWelcomePackMutateAsync.mockRejectedValue(new Error("موجودی کافی نیست"));
      renderModal(
        <CheckoutModal
          open
          onClose={onClose}
          customerId={5}
          visitId={9}
          defaultTotalToman={1000000}
          welcomePack={{
            packId: 3,
            packName: "پک استقبال",
            totalCostToman: "250000",
            totalCostUsd: "1.02",
          }}
        />
      );

      await user.click(screen.getByRole("button", { name: "ثبت فروش" }));

      expect(checkoutMutateAsync).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
      expect(toastWarning).toHaveBeenCalledWith(
        "فروش ثبت شد اما ولکام‌پک صادر نشد",
        expect.stringContaining("موجودی کافی نیست")
      );
    });
  });
});
