import { useMemo, useState } from "react";
import { BiPencil, BiPlus, BiTrash } from "react-icons/bi";

import {
  useAllProducts,
  useAllWelcomePacks,
  useDeleteWelcomePack,
  useSaveWelcomePack,
} from "../../hooks/api";
import { useRateValue } from "../../hooks/useRateValue";
import { extractApiError } from "../../lib/api-error";
import { formatUsd } from "../../lib/currency";
import { toPersianDigits } from "../../lib/digits";
import { ceilUp, formatPrice } from "../../lib/format";
import { type WelcomePackInput } from "../../services/welcomePacks";
import type { WelcomePack } from "../../types/finance";
import { Alert } from "../ui/Alert";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { Select } from "../ui/Select";
import { Skeleton } from "../ui/Skeleton";
import { type Column, Table } from "../ui/Table";
import { useToast } from "../ui/Toast";
import { Toggle } from "../ui/Toggle";

interface ItemRow {
  product: string;
  quantity: string;
}

export function WelcomePacksTab() {
  const { data, isLoading, isError, error } = useAllWelcomePacks();
  const { data: productsData } = useAllProducts();
  const rate = useRateValue();
  const savePack = useSaveWelcomePack();
  const deletePack = useDeleteWelcomePack();
  const toast = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<WelcomePack | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [items, setItems] = useState<ItemRow[]>([{ product: "", quantity: "1" }]);
  const [formError, setFormError] = useState("");

  const packs = useMemo(() => data ?? [], [data]);
  // Same shared Product catalog the انبار/محصولات tab manages — pack items only
  // reference existing products here; finished products are rejected by the
  // backend, so hide them from the picker.
  const productOptions = useMemo(() => {
    const seen = new Set<number>();
    const opts: { value: string; label: string }[] = [];
    for (const p of productsData ?? []) {
      if (p.status === "finished" || seen.has(p.id)) continue;
      seen.add(p.id);
      opts.push({ value: String(p.id), label: p.name });
    }
    return opts;
  }, [productsData]);
  const productNames = useMemo(() => {
    const map = new Map<number, string>();
    for (const p of productsData ?? []) map.set(p.id, p.name);
    return map;
  }, [productsData]);

  // Catalog unit prices — pack prices are always derived from the product in
  // the انبار/محصولات tab, never entered here.
  const productPrices = useMemo(() => {
    const map = new Map<number, string>();
    for (const p of productsData ?? []) {
      map.set(p.id, p.unitPrice);
    }
    return map;
  }, [productsData]);

  function openNew() {
    setEditing(null);
    setName("");
    setDescription("");
    setIsActive(true);
    setItems([{ product: "", quantity: "1" }]);
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(pack: WelcomePack) {
    setEditing(pack);
    setName(pack.name);
    setDescription(pack.description);
    setIsActive(pack.isActive);
    setItems(
      pack.items.length > 0
        ? pack.items.map((i) => ({ product: String(i.product), quantity: i.quantity }))
        : [{ product: "", quantity: "1" }]
    );
    setFormError("");
    setModalOpen(true);
  }

  const validItems = items.filter((r) => r.product && Number(r.quantity) > 0);
  const duplicateProduct = new Set(validItems.map((r) => r.product)).size !== validItems.length;
  const canSave =
    name.trim().length > 0 && validItems.length > 0 && !duplicateProduct && !savePack.isPending;

  // Totals derive from the catalog unit prices (price × quantity per item).
  const totalPriceToman = useMemo(
    () =>
      validItems.reduce((sum, r) => {
        const unit = Number(productPrices.get(Number(r.product)) ?? NaN);
        const qty = Number(r.quantity);
        return Number.isFinite(unit) && Number.isFinite(qty) ? sum + ceilUp(unit * qty) : sum;
      }, 0),
    [validItems, productPrices]
  );
  const totalPriceUsd = rate != null && rate > 0 ? totalPriceToman / rate : 0;

  async function handleSave() {
    setFormError("");
    if (!canSave) {
      if (duplicateProduct) setFormError("هر محصول فقط یک بار در هر پک مجاز است");
      return;
    }
    const input: WelcomePackInput = {
      ...(editing ? { id: editing.id } : {}),
      name: name.trim(),
      description: description.trim(),
      isActive,
      items: validItems.map((r) => ({
        product: Number(r.product),
        quantity: r.quantity,
      })),
    };
    try {
      const saved = await savePack.mutateAsync(input);
      setEditing(saved);
      setModalOpen(false);
    } catch (err: unknown) {
      setFormError(extractApiError(err));
    }
  }

  function handleDelete(pack: WelcomePack) {
    if (!window.confirm(`ولکام‌پک «${pack.name}» حذف شود؟`)) return;
    deletePack.mutate(pack.id, {
      onError: (err: unknown) => toast.error(extractApiError(err)),
    });
  }

  const columns: Column<WelcomePack>[] = [
    { key: "name", header: "نام پک" },
    {
      key: "items",
      header: "اقلام",
      render: (pack) =>
        pack.items.length === 0 ? (
          <span className="text-surface-400">—</span>
        ) : (
          <span className="text-surface-700 text-xs">
            {pack.items
              .map(
                (i) =>
                  `${productNames.get(i.product) ?? `محصول ${i.product}`} × ${toPersianDigits(i.quantity)}`
              )
              .join("، ")}
          </span>
        ),
    },
    {
      key: "cost",
      header: "قیمت اقلام",
      align: "end",
      render: (pack) => {
        if (pack.items.length === 0) return <span className="text-surface-400">—</span>;
        // Backend items carry no price fields — derive each line from the
        // product's unit price in the انبار/محصولات catalog, Persian formatted.
        return (
          <span className="text-surface-600 flex flex-col gap-0.5 text-xs">
            {pack.items.map((item, idx) => {
              const unitPrice = productPrices.get(item.product);
              const qty = Number(item.quantity);
              const unitToman = unitPrice != null ? Number(unitPrice) : NaN;
              if (!Number.isFinite(unitToman) || !Number.isFinite(qty)) {
                return (
                  <span key={idx} className="text-surface-400">
                    —
                  </span>
                );
              }
              const toman = ceilUp(unitToman * qty);
              const usd = rate != null && rate > 0 && toman > 0 ? toman / rate : NaN;
              return (
                <span key={idx}>
                  {formatPrice(toman)} تومان
                  {Number.isFinite(usd) && (
                    <span className="text-info-700"> / {formatUsd(usd)}</span>
                  )}
                </span>
              );
            })}
          </span>
        );
      },
    },
    {
      key: "isActive",
      header: "وضعیت",
      align: "center",
      render: (pack) => (
        <Badge variant={pack.isActive ? "success" : "danger"} size="sm">
          {pack.isActive ? "فعال" : "غیرفعال"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "عملیات",
      align: "center",
      width: "100px",
      render: (pack) => (
        <div className="flex items-center justify-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            startIcon={<BiPencil className="size-4" />}
            onClick={() => openEdit(pack)}
          />
          <Button
            variant="ghost"
            size="sm"
            startIcon={<BiTrash className="text-danger-500 size-4" />}
            onClick={() => handleDelete(pack)}
          />
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton width="100%" height="3rem" variant="rectangular" />
        <Skeleton width="100%" height="3rem" variant="rectangular" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-surface-900 text-sm font-semibold">ولکام‌پک‌ها</h3>
          <p className="text-surface-400 text-xs">
            اقلام هر پک همراه با خود پک در یک درخواست ذخیره می‌شوند و با مواد مصرفی خدمات یکی نیستند
            — محصولات از تب «محصولات» همین انبار انتخاب می‌شوند؛ اگر محصولی در لیست نیست، ابتدا در
            همان تب بسازید؛ صدور پک تراکنش جداگانه است
          </p>
        </div>
        <Button variant="primary" startIcon={<BiPlus className="size-4" />} onClick={openNew}>
          ولکام‌پک جدید
        </Button>
      </div>

      {isError && <Alert variant="error">{extractApiError(error)}</Alert>}

      <Card variant="outlined" padding="none">
        <Table columns={columns} data={packs} rowKey={(p) => p.id} />
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "ویرایش ولکام‌پک" : "ولکام‌پک جدید"}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              انصراف
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={!canSave}
              loading={savePack.isPending}
            >
              ذخیره
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {formError && <Alert variant="error">{formError}</Alert>}
          <Input
            label="نام پک"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثال: پک خوش‌آمد VIP"
          />
          <Input
            label="توضیحات (اختیاری)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="توضیحات..."
          />
          <Toggle
            label={isActive ? "فعال" : "غیرفعال"}
            checked={isActive}
            onChange={() => setIsActive((v) => !v)}
          />

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h4 className="text-surface-700 text-sm font-medium">اقلام پک (محصول + مقدار)</h4>
              <Button
                variant="ghost"
                size="sm"
                startIcon={<BiPlus className="size-4" />}
                onClick={() => setItems((prev) => [...prev, { product: "", quantity: "1" }])}
              >
                افزودن قلم
              </Button>
            </div>
            {items.map((row, idx) => (
              <div key={idx} className="flex items-end gap-2">
                <div className="grow">
                  <Select
                    label={idx === 0 ? "محصول" : undefined}
                    options={[{ value: "", label: "انتخاب محصول" }, ...productOptions]}
                    value={row.product}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((r, i) => (i === idx ? { ...r, product: e.target.value } : r))
                      )
                    }
                  />
                </div>
                <div className="w-28">
                  <Input
                    label={idx === 0 ? "مقدار" : undefined}
                    value={row.quantity}
                    inputMode="decimal"
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((r, i) => (i === idx ? { ...r, quantity: e.target.value } : r))
                      )
                    }
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                  disabled={items.length === 1}
                  aria-label="حذف قلم"
                  className="text-danger-600 hover:bg-danger-50 cursor-pointer rounded-md p-2 transition-colors disabled:opacity-30"
                >
                  <BiTrash className="size-4" />
                </button>
              </div>
            ))}
            {validItems.length === 0 && (
              <p className="text-danger-600 text-xs">
                حداقل یک قلم با محصول و مقدار معتبر وارد کنید
              </p>
            )}
            {validItems.length > 0 && (
              <div className="border-surface-200 bg-surface-50 space-y-1 rounded-lg p-3">
                <h5 className="text-surface-700 text-xs font-medium">مجموع قیمت اقلام:</h5>
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <span className="text-primary-700 font-medium">
                    {formatPrice(totalPriceToman)} تومان
                  </span>
                  {rate != null && rate > 0 && (
                    <span className="text-info-700 font-medium" dir="ltr">
                      {formatUsd(totalPriceUsd)}
                    </span>
                  )}
                </div>
                <p className="text-surface-400 text-xs">
                  قیمت از محصولات انتخاب‌شده در تب «محصولات» محاسبه می‌شود
                </p>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
