import { useMemo, useState } from "react";
import { BiEdit, BiPlus, BiSearch, BiTrash } from "react-icons/bi";

import { SearchButton } from "../components/SearchButton";
import { Alert } from "../components/ui/Alert";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { Pagination } from "../components/ui/Pagination";
import { Select } from "../components/ui/Select";
import { type Column, Table } from "../components/ui/Table";
import { TabPanel, Tabs } from "../components/ui/Tabs";
import { Textarea } from "../components/ui/Textarea";
import { TomanInput } from "../components/ui/TomanInput";
import { PriceCell } from "../components/warehouse/PriceCell";
import { PurchaseModal } from "../components/warehouse/PurchaseModal";
import { UsagesTab } from "../components/warehouse/UsagesTab";
import { WelcomePacksTab } from "../components/warehouse/WelcomePacksTab";
import { useAuth } from "../contexts/AuthContext";
import {
  useAllProducts,
  useCreateProduct,
  useCurrentRate,
  useDeleteProduct,
  useDeletePurchase,
  useProductsList,
  usePurchasesList,
  useUpdateProduct,
} from "../hooks/api";
import { extractApiError } from "../lib/api-error";
import { formatUsd, snapshotToman, usdToToman } from "../lib/currency";
import { formatJalaliDate } from "../lib/date";
import { toLatinDigits, toPersianDigits } from "../lib/digits";
import { formatPrice, parseTomanAmount } from "../lib/format";
import { SERVER_PAGE_SIZE } from "../lib/pagination";
import { withAnchor } from "../lib/priceAnchor";
import { formatQuantity } from "../lib/toman-input";
import type { ProductPurchase } from "../types/finance";
import type { WarehouseItem } from "../types/warehouse";

const unitOptions = [
  { value: "عدد", label: "عدد" },
  { value: "بسته", label: "بسته" },
  { value: "کیلوگرم", label: "کیلوگرم" },
  { value: "لیتر", label: "لیتر" },
];

function getStatus(stock: number): { label: string; variant: "success" | "warning" | "danger" } {
  if (stock === 0) return { label: "تمام شده", variant: "danger" };
  if (stock <= 10) return { label: "کم", variant: "warning" };
  return { label: "موجود", variant: "success" };
}

const warehouseTabs = [
  { id: "products", label: "محصولات" },
  { id: "usages", label: "مصرف" },
  { id: "welcome-packs", label: "ولکام‌پک" },
];

function Warehouse() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("products");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [purchasePage, setPurchasePage] = useState(1);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<ProductPurchase | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WarehouseItem | null>(null);
  const [formError, setFormError] = useState("");

  const [formName, setFormName] = useState("");
  const [formStock, setFormStock] = useState("");
  const [formUnit, setFormUnit] = useState("");
  const [formUnitPrice, setFormUnitPrice] = useState("");
  const [formUnitPriceUsd, setFormUnitPriceUsd] = useState("");
  const [formDescription, setFormDescription] = useState("");

  const pageSize = SERVER_PAGE_SIZE;

  const {
    data: paginated,
    isLoading,
    isError: productsError,
    refetch: refetchProducts,
  } = useProductsList({
    page: currentPage,
    perPage: pageSize,
    search: searchQuery || undefined,
  });
  const {
    data: purchasesPaginated,
    isLoading: purchasesLoading,
    isError: purchasesError,
    refetch: refetchPurchases,
  } = usePurchasesList({
    page: purchasePage,
    perPage: pageSize,
  });
  const { data: allProducts } = useAllProducts();
  const { data: currentRate } = useCurrentRate();
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();
  const deletePurchaseMutation = useDeletePurchase();

  const items = paginated?.data ?? [];
  const purchases = purchasesPaginated?.data ?? [];
  const productNames = useMemo(() => {
    const map = new Map<number, string>();
    for (const p of allProducts ?? []) map.set(p.id, p.name);
    return map;
  }, [allProducts]);

  const totalPages = paginated?.totalPages ?? 1;
  const purchaseTotalPages = purchasesPaginated?.totalPages ?? 1;
  const safePage = Math.min(currentPage, totalPages);
  const safePurchasePage = Math.min(purchasePage, purchaseTotalPages);

  const lowStockCount = items.filter((item) => item.stock <= 10).length;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const rateValue = useMemo(() => {
    const parsed = Number(currentRate?.rateTomanPerUsd ?? currentRate?.rate);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [currentRate]);

  const resetForm = () => {
    setFormName("");
    setFormStock("");
    setFormUnit("");
    setFormUnitPrice("");
    setFormUnitPriceUsd("");
    setFormDescription("");
  };

  const openNewModal = () => {
    setEditingItem(null);
    resetForm();
    setFormError("");
    setModalOpen(true);
  };

  const openEditModal = (item: WarehouseItem) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormStock(String(item.stock));
    setFormUnit(item.unit);
    setFormUnitPrice(item.unitPrice);
    setFormUnitPriceUsd(item.unitPriceUsd ?? "");
    setFormDescription(item.description);
    setFormError("");
    setModalOpen(true);
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const openPurchaseCreate = () => {
    setEditingPurchase(null);
    setPurchaseModalOpen(true);
  };

  const openPurchaseEdit = (purchase: ProductPurchase) => {
    setEditingPurchase(purchase);
    setPurchaseModalOpen(true);
  };

  const closePurchaseModal = () => {
    setPurchaseModalOpen(false);
    setEditingPurchase(null);
  };

  /**
   * Deleting a purchase gives the stock back, so it is admin-only (the endpoint
   * enforces this too) and confirmed explicitly — the warehouse quantity and cost
   * history both move.
   */
  const handleDeletePurchase = (purchase: ProductPurchase) => {
    const name = productNames.get(purchase.product) ?? `#${purchase.product}`;
    if (
      !window.confirm(
        `خرید «${name}» به مقدار ${formatQuantity(purchase.quantity)} حذف شود؟\nموجودی و قیمت این کالا اصلاح می‌شود.`
      )
    ) {
      return;
    }
    deletePurchaseMutation.mutate(purchase.id, {
      onSuccess: () => {
        // The deleted row is the most recent one on page 1; a shorter list can
        // leave the viewer past the end, so pull them back to the first page.
        setPurchasePage(1);
      },
    });
  };

  async function handleSave() {
    setFormError("");
    if (!formName.trim()) {
      setFormError("نام محصول الزامی است");
      return;
    }
    if (!formUnit) {
      setFormError("واحد محصول الزامی است");
      return;
    }

    const stockNum = Number(formStock) || 0;
    // parseTomanAmount keeps decimal cents from the backend ("350000.00" → 350000)
    // instead of stripping the dot and inflating the integer past max_digits=10.
    const priceNum = parseTomanAmount(formUnitPrice);
    const usdDigits = toLatinDigits(formUnitPriceUsd).replace(/[^\d.]/g, "");
    const usdParts = usdDigits.split(".");
    const usdNormalized =
      usdParts.length > 1 ? `${usdParts[0]}.${usdParts.slice(1).join("").slice(0, 2)}` : usdDigits;
    const priceUsdRaw = usdNormalized ? Number(usdNormalized) : NaN;
    const priceUsdNum = Number.isFinite(priceUsdRaw) && priceUsdRaw >= 0 ? priceUsdRaw : null;

    // Pin the selling price to a USD anchor so it floats with the exchange rate.
    // Re-anchor only when the price actually changed (or on create) — saving an
    // unrelated edit must not silently reset the anchor to today's rate.
    const priceChanged = !editingItem || parseTomanAmount(editingItem.unitPrice) !== priceNum;
    const description = priceChanged
      ? withAnchor(formDescription, priceNum, rateValue)
      : formDescription;

    const payload: Record<string, unknown> = {
      name: formName.trim(),
      stock: stockNum,
      unit: formUnit,
      unitPrice: priceNum,
      unitPriceUsd: priceUsdNum,
      description,
    };

    try {
      if (editingItem) {
        await updateMutation.mutateAsync({ id: editingItem.id, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      setModalOpen(false);
      resetForm();
    } catch (err: unknown) {
      setFormError(extractApiError(err));
    }
  }

  const columns: Column<WarehouseItem>[] = [
    { key: "name", header: "نام محصول" },
    {
      key: "stock",
      header: "موجودی",
      width: "70px",
      align: "center",
      render: (item) => <span>{formatQuantity(item.stock)}</span>,
    },
    { key: "unit", header: "واحد", width: "80px", align: "center" },
    {
      key: "unitPrice",
      header: "قیمت واحد",
      width: "150px",
      align: "center",
      render: (item) => (
        <PriceCell toman={item.unitPrice} rate={rateValue} description={item.description} />
      ),
    },
    {
      key: "status",
      header: "وضعیت",
      width: "100px",
      align: "center",
      render: (item) => {
        const s = getStatus(item.stock);
        return (
          <Badge variant={s.variant} size="sm">
            {s.label}
          </Badge>
        );
      },
    },
    {
      key: "actions",
      header: "عملیات",
      width: "90px",
      align: "center",
      render: (item) => (
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() => openEditModal(item)}
            className="text-surface-400 hover:text-primary-600 hover:bg-primary-50 cursor-pointer rounded-md p-1.5 transition-colors"
            aria-label="ویرایش"
          >
            <BiEdit className="size-4" />
          </button>
          {user?.role === "admin" && (
            <button
              onClick={() => handleDelete(item.id)}
              className="text-surface-400 hover:text-danger-600 hover:bg-danger-50 cursor-pointer rounded-md p-1.5 transition-colors"
              aria-label="حذف"
            >
              <BiTrash className="size-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const purchaseColumns: Column<ProductPurchase>[] = [
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
      render: (item) => <span>{formatQuantity(item.quantity)}</span>,
    },
    {
      key: "unitCost",
      header: "بهای واحد",
      align: "center",
      width: "130px",
      render: (item) => (
        <PriceCell
          toman={snapshotToman(item.unitCostUsd, item.exchangeRateSnapshot)}
          usd={item.unitCostUsd}
        />
      ),
    },
    {
      key: "totalCost",
      header: "بهای کل",
      align: "center",
      width: "130px",
      render: (item) => (
        <PriceCell
          toman={snapshotToman(item.totalCostUsd, item.exchangeRateSnapshot)}
          usd={item.totalCostUsd}
        />
      ),
    },
    {
      key: "purchaseDate",
      header: "تاریخ خرید",
      align: "center",
      width: "110px",
      // formatJalaliDate emits Latin digits; the rest of the UI is Persian.
      render: (item) => <span>{toPersianDigits(formatJalaliDate(item.purchaseDate))}</span>,
    },
    {
      key: "purchaseActions",
      header: "عملیات",
      align: "center",
      width: "100px",
      render: (item) => (
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() => openPurchaseEdit(item)}
            className="text-surface-400 hover:text-primary-600 hover:bg-primary-50 cursor-pointer rounded-md p-1.5 transition-colors"
            aria-label="ویرایش خرید"
            title="ویرایش خرید"
          >
            <BiEdit className="size-4" />
          </button>
          {user?.role === "admin" && (
            <button
              onClick={() => handleDeletePurchase(item)}
              className="text-surface-400 hover:text-danger-600 hover:bg-danger-50 cursor-pointer rounded-md p-1.5 transition-colors"
              aria-label="حذف خرید"
              title="حذف خرید"
            >
              <BiTrash className="size-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-surface-900 text-2xl font-bold" data-tour="wh-header">
          مدیریت انبار
        </h1>
        <div className="mt-3 flex items-center gap-3 sm:mt-0">
          {activeTab === "products" && (
            <Button
              variant="primary"
              startIcon={<BiPlus className="size-5" />}
              onClick={openNewModal}
            >
              محصول جدید
            </Button>
          )}
          <SearchButton />
        </div>
      </div>

      <Tabs tabs={warehouseTabs} activeTab={activeTab} onChange={setActiveTab} />

      <TabPanel id="products" activeTab={activeTab}>
        <div className="flex flex-col gap-6">
          <div data-tour="wh-alert" className="flex flex-col gap-3">
            {productsError && (
              <Alert variant="error" title="خطا در بارگذاری محصولات">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span>این صفحه از فهرست محصولات در دسترس نیست یا ارتباط با سرور برقرار نشد.</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => refetchProducts()}>
                      تلاش دوباره
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(1)}>
                      بازگشت به صفحه اول
                    </Button>
                  </div>
                </div>
              </Alert>
            )}
            {lowStockCount > 0 && (
              <Alert variant="warning" title="هشدار موجودی">
                {lowStockCount} محصول در انبار دارای موجودی کم یا صفر هستند. لطفاً نسبت به تامین
                آنها اقدام کنید.
              </Alert>
            )}
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full shrink-0 sm:w-64" data-tour="wh-search">
              <Input
                placeholder="جستجوی محصول..."
                startIcon={<BiSearch className="size-4" />}
                value={searchQuery}
                onChange={handleSearchChange}
              />
            </div>
          </div>

          <Card variant="outlined" padding="none" data-tour="wh-table">
            <Table columns={columns} data={items} rowKey={(item) => item.id} loading={isLoading} />
          </Card>

          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
        {/* Registered purchases history + stock entry */}
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-surface-900 text-sm font-medium">خریدهای ثبت شده</h2>
            <Button
              variant="primary"
              size="sm"
              startIcon={<BiPlus className="size-5" />}
              onClick={openPurchaseCreate}
            >
              ثبت خرید
            </Button>
          </div>
          {purchasesError && (
            <Alert variant="error" title="خطا در بارگذاری خریدهای ثبت‌شده">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span>این صفحه از خریدها در دسترس نیست یا ارتباط با سرور برقرار نشد.</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => refetchPurchases()}>
                    تلاش دوباره
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setPurchasePage(1)}>
                    بازگشت به صفحه اول
                  </Button>
                </div>
              </div>
            </Alert>
          )}
          <Card variant="outlined" padding="none">
            <Table
              columns={purchaseColumns}
              data={purchases}
              rowKey={(item) => item.id}
              loading={purchasesLoading}
            />
            {purchaseTotalPages > 1 && (
              <div className="border-surface-200 flex items-center justify-center border-t px-5 py-4">
                <Pagination
                  currentPage={safePurchasePage}
                  totalPages={purchaseTotalPages}
                  onPageChange={setPurchasePage}
                />
              </div>
            )}
          </Card>
        </div>
      </TabPanel>

      <TabPanel id="usages" activeTab={activeTab}>
        <UsagesTab />
      </TabPanel>

      <TabPanel id="welcome-packs" activeTab={activeTab}>
        <WelcomePacksTab />
      </TabPanel>

      <PurchaseModal
        // Remount per purchase so the edit form always opens on the stored
        // figures instead of syncing them in through an effect.
        key={editingPurchase?.id ?? "new-purchase"}
        open={purchaseModalOpen}
        purchase={editingPurchase}
        productName={editingPurchase ? (productNames.get(editingPurchase.product) ?? "") : ""}
        onClose={closePurchaseModal}
        onSaved={({ name }) => {
          // A brand-new product is appended at the end of the catalogue, so filter
          // the table down to the one just bought — otherwise it lands on a later
          // page and the stock increase looks like it did not happen.
          setSearchQuery(name);
          setCurrentPage(1);
          setPurchasePage(1);
        }}
      />

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          resetForm();
          setFormError("");
        }}
        title={editingItem ? "ویرایش محصول" : "محصول جدید"}
        size="lg"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setModalOpen(false);
                resetForm();
                setFormError("");
              }}
            >
              انصراف
            </Button>
            <Button variant="primary" onClick={handleSave}>
              ذخیره
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {formError && <Alert variant="error">{formError}</Alert>}
          <Input
            label="نام محصول"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="نام محصول را وارد کنید"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="تعداد موجودی"
              type="number"
              value={formStock}
              onChange={(e) => setFormStock(e.target.value)}
              placeholder="۰"
            />
            <TomanInput
              label="قیمت واحد (تومان)"
              value={formUnitPrice}
              onChange={(amount) => setFormUnitPrice(String(amount))}
              helperText={
                rateValue && Number(formUnitPrice) > 0
                  ? `معادل ${formatUsd(Number(formUnitPrice) / rateValue)} با نرخ امروز`
                  : undefined
              }
            />
            <Input
              label="بهای خرید (USD)"
              type="text"
              inputMode="decimal"
              dir="ltr"
              value={formUnitPriceUsd}
              onChange={(e) => {
                // Raw digits + single decimal point while typing — no mid-keystroke reformat.
                // Acquisition cost only: editing it must never overwrite the selling price.
                const v = e.target.value.replace(/[^\d.]/g, "");
                const parts = v.split(".");
                const normalized = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join("")}` : v;
                setFormUnitPriceUsd(normalized);
              }}
              onBlur={() => {
                if (formUnitPriceUsd && Number(formUnitPriceUsd) > 0) {
                  setFormUnitPriceUsd(Number(formUnitPriceUsd).toFixed(2));
                }
              }}
              placeholder="مثال: 10.00"
              helperText={
                rateValue && formUnitPriceUsd && Number(formUnitPriceUsd) > 0
                  ? `≈ ${formatPrice(usdToToman(formUnitPriceUsd, rateValue))} تومان (نرخ ${formatPrice(rateValue)})`
                  : "بهای خرید به دلار — برای محاسبه سود استفاده می‌شود"
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="واحد"
              options={unitOptions}
              placeholder="انتخاب واحد"
              value={formUnit}
              onChange={(e) => setFormUnit(e.target.value)}
            />
          </div>
          <Textarea
            label="توضیحات"
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            placeholder="توضیحات اضافی..."
          />
        </div>
      </Modal>
    </div>
  );
}

export default Warehouse;
