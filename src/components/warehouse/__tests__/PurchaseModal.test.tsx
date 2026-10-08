import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ToastProvider } from "../../ui/Toast";
import { PurchaseModal } from "../PurchaseModal";

const createPurchase = vi.fn().mockResolvedValue({ id: 5 });
const createProduct = vi.fn().mockResolvedValue({ id: 77 });
const updatePurchase = vi.fn().mockResolvedValue({ id: 3 });

vi.mock("../../../hooks/api", () => ({
  useCurrentRate: () => ({
    data: { rate: "100000", rateTomanPerUsd: "100000", effectiveAt: null, source: "manual" },
    isLoading: false,
  }),
  useAllProducts: () => ({
    data: [
      {
        id: 11,
        name: "بوتاکس دیستون",
        stock: 0,
        unit: "عدد",
        unitPrice: "800000",
        description: "usd:3.392154|orig:800000",
        status: "available",
      },
    ],
    isLoading: false,
  }),
  useCreatePurchase: () => ({ mutateAsync: createPurchase, isPending: false }),
  useCreateProduct: () => ({ mutateAsync: createProduct, isPending: false }),
  useUpdatePurchase: () => ({ mutateAsync: updatePurchase, isPending: false }),
}));

// `react-calendar-datetime-picker` is a CJS bundle that cannot be transformed in
// the test environment, and JalaliDatePicker only wraps it — so stand in a
// trigger that hands back a fixed Jalali date. The date maths itself is covered
// by src/lib/__tests__/toman-input.test.ts.
vi.mock("../../ui/JalaliDatePicker", () => ({
  JalaliDatePicker: ({
    label,
    value,
    onChange,
  }: {
    label?: string;
    value: string | null;
    onChange: (value: string) => void;
  }) => (
    <div>
      <span>{label}</span>
      <span data-testid="picked-date">{value ?? ""}</span>
      <button type="button" onClick={() => onChange("۱۴۰۵/۰۷/۰۸")}>
        انتخاب تاریخ
      </button>
    </div>
  ),
}));

async function fillPurchaseFields(user: ReturnType<typeof userEvent.setup>) {
  const quantity = screen.getByLabelText("مقدار");
  await user.clear(quantity);
  await user.type(quantity, "3");
  const price = screen.getByLabelText("بهای واحد (تومان)");
  await user.clear(price);
  await user.type(price, "800000");
  await user.click(screen.getByRole("button", { name: "انتخاب تاریخ" }));
}

describe("PurchaseModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("groups the Toman price with separators and accepts Persian digits", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <PurchaseModal open onClose={() => {}} />
      </ToastProvider>
    );

    const price = screen.getByLabelText("بهای واحد (تومان)");
    await user.type(price, "۸۰۰۰۰۰");

    await waitFor(() => expect(price).toHaveValue("۸۰۰٬۰۰۰"));
  });

  it("shows the total in both currencies from the entered price and quantity", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <PurchaseModal open onClose={() => {}} />
      </ToastProvider>
    );

    await fillPurchaseFields(user);

    // 800,000 × 3 = 2,400,000 تومان = $24.00 at 100,000 Toman/USD
    expect(await screen.findByText(/\$۲۴\.۰۰/)).toBeInTheDocument();
    expect(screen.getByText(/۲٬۴۰۰٬۰۰۰ تومان/)).toBeInTheDocument();
  });

  it("refuses to create a product whose name already exists and offers the existing one", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <PurchaseModal open onClose={() => {}} />
      </ToastProvider>
    );

    await user.click(screen.getByRole("button", { name: /محصول جدید بساز/ }));
    await user.type(screen.getByLabelText("نام محصول جدید"), "بوتاکس دیستون");

    expect(
      await screen.findByText(
        "«بوتاکس دیستون» از قبل ثبت شده — به‌جای ساخت دوباره، همان را انتخاب کنید"
      )
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /انتخاب «بوتاکس دیستون» موجود/ }));

    expect(screen.getByRole("combobox", { name: "محصول" })).toBeInTheDocument();
    expect(screen.queryByLabelText("نام محصول جدید")).not.toBeInTheDocument();
  });

  it("creates the product first, anchored to the entered price, then records the purchase", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <PurchaseModal open onClose={() => {}} />
      </ToastProvider>
    );

    await user.click(screen.getByRole("button", { name: /محصول جدید بساز/ }));
    await user.type(screen.getByLabelText("نام محصول جدید"), "ماسک پارچه‌ای");
    await fillPurchaseFields(user);
    await user.click(screen.getByRole("button", { name: "ثبت خرید" }));

    await waitFor(() => expect(createProduct).toHaveBeenCalled());
    expect(createProduct).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "ماسک پارچه‌ای",
        stock: 0,
        unit: "عدد",
        unitPrice: 800000,
        unitPriceUsd: "8.00",
        // anchor pinned to the entered price, so orig equals exactly what was typed
        description: expect.stringMatching(/^usd:8(\.0+)?\|orig:800000$/),
      })
    );

    await waitFor(() => expect(createPurchase).toHaveBeenCalled());
    expect(createPurchase).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 77,
        unitCostToman: 800000,
        supplier: "",
        purchaseDateJalali: "۱۴۰۵/۰۷/۰۸",
      })
    );
  });

  it("buys an existing product without creating a new one", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <PurchaseModal open onClose={() => {}} />
      </ToastProvider>
    );

    const select = screen.getByRole("combobox", { name: "محصول" });
    await user.click(select);
    await user.click(await screen.findByText("بوتاکس دیستون"));

    await fillPurchaseFields(user);
    await user.click(screen.getByRole("button", { name: "ثبت خرید" }));

    await waitFor(() => expect(createPurchase).toHaveBeenCalled());
    expect(createProduct).not.toHaveBeenCalled();
    expect(createPurchase).toHaveBeenCalledWith(
      expect.objectContaining({ productId: 11, unitCostToman: 800000 })
    );
  });

  describe("edit mode", () => {
    // 3.00 USD × 100,000 = 300,000 Toman at the snapshotted rate
    const existing = {
      id: 3,
      product: 11,
      quantity: "2.000",
      unitCostUsd: "3.00",
      totalCostUsd: "6.00",
      supplier: "دیجی میکس",
      purchaseDate: "2026-09-20",
      exchangeRateSnapshot: "100000.00",
      createdAt: "2026-09-20T08:00:00Z",
    };

    it("opens on the stored figures and does not offer to create a product", async () => {
      render(
        <ToastProvider>
          <PurchaseModal open purchase={existing} productName="بوتاکس دیستون" onClose={() => {}} />
        </ToastProvider>
      );

      expect(screen.getByText("ویرایش خرید")).toBeInTheDocument();
      expect(screen.getByLabelText("مقدار")).toHaveValue("2");
      expect(screen.getByLabelText("بهای واحد (تومان)")).toHaveValue("۳۰۰٬۰۰۰");
      expect(screen.getByLabelText("تأمین‌کننده")).toHaveValue("دیجی میکس");
      // Gregorian 2026-09-20 is Jalali 1405/06/29 — the conversion must be real,
      // not a separator swap that would save the Gregorian year as a Jalali one.
      expect(screen.getByTestId("picked-date")).toHaveTextContent("۱۴۰۵/۰۶/۲۹");
      // the product is fixed while editing, so no catalogue picker
      expect(screen.queryByRole("combobox", { name: "محصول" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /محصول جدید بساز/ })).not.toBeInTheDocument();
    });

    it("saves the new quantity and unit cost without touching the product", async () => {
      const user = userEvent.setup();
      render(
        <ToastProvider>
          <PurchaseModal open purchase={existing} productName="بوتاکس دیستون" onClose={() => {}} />
        </ToastProvider>
      );

      const qty = screen.getByLabelText("مقدار");
      await user.clear(qty);
      await user.type(qty, "4");
      const price = screen.getByLabelText("بهای واحد (تومان)");
      await user.clear(price);
      await user.type(price, "500000");
      await user.click(screen.getByRole("button", { name: "ذخیره تغییرات" }));

      await waitFor(() => expect(updatePurchase).toHaveBeenCalled());
      expect(updatePurchase).toHaveBeenCalledWith({
        id: 3,
        input: expect.objectContaining({
          quantity: "4",
          unitCostToman: 500000,
          purchaseDateJalali: "۱۴۰۵/۰۶/۲۹",
        }),
      });
      expect(createPurchase).not.toHaveBeenCalled();
      expect(createProduct).not.toHaveBeenCalled();
    });
  });
});
