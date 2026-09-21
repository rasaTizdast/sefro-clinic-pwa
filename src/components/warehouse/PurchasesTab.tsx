import { useMemo, useState } from "react";
import { BiPlus } from "react-icons/bi";

import {
  useCreatePurchase,
  useCurrentRate,
  useProductsList,
  usePurchasesList,
} from "../../hooks/api";
import { extractApiError } from "../../lib/api-error";
import { tomanToUsd } from "../../lib/currency";
import { formatJalaliDate } from "../../lib/date";
import { toLatinDigits } from "../../lib/digits";
import { formatPrice } from "../../lib/format";
import type { ProductPurchase } from "../../types/finance";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { JalaliDatePicker } from "../ui/JalaliDatePicker";
import { Modal } from "../ui/Modal";
import { Pagination } from "../ui/Pagination";
import { Select } from "../ui/Select";
import { type Column, Table } from "../ui/Table";

const PAGE_SIZE = 20;

const parseToman = (value: string): number => {
  const latin = toLatinDigits(value.replace(/[^\d۰-۹٠-٩]/g, ""));
  return Number(latin) || 0;
};

export function PurchasesTab() {
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitCostToman, setUnitCostToman] = useState("");
  const [supplier, setSupplier] = useState("");
  const [purchaseDate, setPurchaseDate] = useState<string | null>(null);
  const [formError, setFormError] = useState("");

  const { data: paginated, isLoading } = usePurchasesList({ page, perPage: PAGE_SIZE });
  const { data: productsData } = useProductsList({ perPage: 100 });
  const { data: currentRate, isLoading: rateLoading } = useCurrentRate();
  const createPurchase = useCreatePurchase();

  const rate = useMemo(() => {
    const parsed = Number(currentRate?.rateTomanPerUsd ?? currentRate?.rate);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [currentRate]);

  const productNames = useMemo(() => {
    const map = new Map<number, string>();
    for (const p of productsData?.data ?? []) map.set(p.id, p.name);
    return map;
  }, [productsData]);

  const purchases = paginated?.data ?? [];
  const totalPages = paginated?.totalPages ?? 1;

  const unitUsd = tomanToUsd(parseToman(unitCostToman), rate);
  const qty = Number(quantity) || 0;
  const totalUsd = unitUsd !== null ? (Number(unitUsd) * qty).toFixed(2) : null;

  const canSubmit =
    productId !== "" &&
    qty > 0 &&
    parseToman(unitCostToman) > 0 &&
    purchaseDate !== null &&
    rate !== null &&
    !createPurchase.isPending;

  const handleSave = async () => {
    setFormError("");
    if (!purchaseDate) {
      setFormError("تاریخ خرید الزامی است");
      return;
    }
    try {
      await createPurchase.mutateAsync({
        productId: Number(productId),
        quantity,
        unitCostToman: parseToman(unitCostToman),
        rate,
        supplier: supplier.trim(),
        purchaseDateJalali: purchaseDate,
      });
      setModalOpen(false);
      setProductId("");
      setQuantity("1");
      setUnitCostToman("");
      setSupplier("");
      setPurchaseDate(null);
    } catch (err: unknown) {
      setFormError(extractApiError(err));
    }
  };

  const columns: Column<ProductPurchase>[] = [
    {
      key: "product",
      header: "محصول",
      render: (item) => <span>{productNames.get(item.product) ?? `#${item.product}`}</span>,
    },
    {
      key: "quantity",
      header: "مقدار",
      align: "center",
      width: "90px",
      render: (item) => <span>{item.quantity}</span>,
    },
    {
      key: "unitCost",
      header: "بهای واحد ($)",
      align: "end",
      render: (item) => <span className="text-surface-700 text-sm">${item.unitCostUsd}</span>,
    },
    {
      key: "totalCost",
      header: "بهای کل ($)",
      align: "end",
      render: (item) => <span className="text-surface-900 font-medium">${item.totalCostUsd}</span>,
    },
    {
      key: "purchaseDate",
      header: "تاریخ خرید",
      align: "center",
      width: "110px",
      render: (item) => <span>{formatJalaliDate(item.purchaseDate)}</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        <Button
          variant="primary"
          startIcon={<BiPlus className="size-5" />}
          onClick={() => setModalOpen(true)}
        >
          خرید جدید
        </Button>
      </div>

      <Card variant="outlined" padding="none">
        <Table
          columns={columns}
          data={purchases}
          rowKey={(item) => item.id}
          loading={isLoading}
          className="rounded-none border-0"
        />
        {totalPages > 1 && (
          <div className="border-surface-200 flex items-center justify-center border-t px-5 py-4">
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="ثبت خرید"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              انصراف
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={!canSubmit}>
              {createPurchase.isPending ? "در حال ثبت..." : "ثبت خرید"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {formError && <Alert variant="error">{formError}</Alert>}
          {!rateLoading && rate === null && <Alert variant="warning">نرخ ارز در دسترس نیست</Alert>}
          <Select
            label="محصول"
            options={[
              { value: "", label: "انتخاب محصول" },
              ...(productsData?.data ?? []).map((p) => ({ value: String(p.id), label: p.name })),
            ]}
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="مقدار"
              value={quantity}
              inputMode="decimal"
              onChange={(e) => setQuantity(e.target.value)}
            />
            <Input
              label="بهای واحد (تومان)"
              value={unitCostToman}
              inputMode="numeric"
              onChange={(e) => setUnitCostToman(e.target.value)}
            />
          </div>
          {totalUsd !== null && qty > 0 && (
            <p className="text-surface-600 text-sm">
              بهای کل: <span className="text-surface-900 font-medium">${totalUsd}</span>
              <span className="text-surface-400">
                {" "}
                ({formatPrice(parseToman(unitCostToman) * qty)} تومان)
              </span>
            </p>
          )}
          <Input
            label="تأمین‌کننده"
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
          />
          <JalaliDatePicker label="تاریخ خرید" value={purchaseDate} onChange={setPurchaseDate} />
        </div>
      </Modal>
    </div>
  );
}
