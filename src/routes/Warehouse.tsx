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
import { PriceCell } from "../components/warehouse/PriceCell";
import { PurchaseModal } from "../components/warehouse/PurchaseModal";
import { UsagesTab } from "../components/warehouse/UsagesTab";
import { useAuth } from "../contexts/AuthContext";
import {
  useCreateProduct,
  useCurrentRate,
  useDeleteProduct,
  useProductsList,
  usePurchasesList,
  useUpdateProduct,
} from "../hooks/api";
import { extractApiError } from "../lib/api-error";
import { snapshotToman } from "../lib/currency";
import { formatJalaliDate } from "../lib/date";
import { toLatinDigits } from "../lib/digits";
import { formatPrice } from "../lib/format";
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
];

function Warehouse() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("products");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [purchasePage, setPurchasePage] = useState(1);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WarehouseItem | null>(null);
  const [formError, setFormError] = useState("");

  const [formName, setFormName] = useState("");
  const [formStock, setFormStock] = useState("");
  const [formUnit, setFormUnit] = useState("");
  const [formUnitPrice, setFormUnitPrice] = useState("");
  const [formUnitPriceUsd, setFormUnitPriceUsd] = useState("");
  const [formDescription, setFormDescription] = useState("");

  const pageSize = 8;

  const { data: paginated, isLoading } = useProductsList({
    page: currentPage,
    perPage: pageSize,
    search: searchQuery || undefined,
  });
  const { data: purchasesPaginated, isLoading: purchasesLoading } = usePurchasesList({
    page: purchasePage,
    perPage: pageSize,
  });
  const { data: allProducts } = useProductsList({ perPage: 100 });
  const { data: currentRate } = useCurrentRate();
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();

  const items = paginated?.data ?? [];
  const purchases = purchasesPaginated?.data ?? [];
  const productNames = useMemo(() => {
    const map = new Map<number, string>();
    for (const p of allProducts?.data ?? []) map.set(p.id, p.name);
    return map;
  }, [allProducts?.data]);

  const totalPages = paginated?.totalPages ?? 1;
  const purchaseTotalPages = purchasesPaginated?.totalPages ?? 1;

  const lowStockCount = items.filter((item) => item.stock <= 10).length;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

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
    const priceNum = Number(toLatinDigits(formUnitPrice.replace(/[^\d۰-۹٠-٩]/g, ""))) || 0;
    const usdDigits = toLatinDigits(formUnitPriceUsd).replace(/[^\d.]/g, "");
    const priceUsdRaw = usdDigits ? Number(usdDigits) : NaN;
    const priceUsdNum = Number.isFinite(priceUsdRaw) ? priceUsdRaw : null;

    const payload: Record<string, unknown> = {
      name: formName.trim(),
      stock: stockNum,
      unit: formUnit,
      unitPrice: priceNum,
      unitPriceUsd: priceUsdNum,
      description: formDescription,
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
    { key: "stock", header: "موجودی", width: "70px", align: "center" },
    { key: "unit", header: "واحد", width: "80px", align: "center" },
    {
      key: "unitPrice",
      header: "قیمت واحد",
      width: "140px",
      align: "center",
      render: (item) => <PriceCell toman={item.unitPrice} usd={item.unitPriceUsd} />,
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
      render: (item) => <span>{item.quantity}</span>,
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
      render: (item) => <span>{formatJalaliDate(item.purchaseDate)}</span>,
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
          <div data-tour="wh-alert">
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
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
        {/* Registered purchases history + stock entry */}
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-surface-900 text-sm font-medium">خریدهای ثبت شده</h2>
            <Button
              variant="outline"
              size="sm"
              startIcon={<BiPlus className="size-4" />}
              onClick={() => setPurchaseModalOpen(true)}
            >
              ثبت خرید
            </Button>
          </div>
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
                  currentPage={purchasePage}
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

      <PurchaseModal open={purchaseModalOpen} onClose={() => setPurchaseModalOpen(false)} />

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
            <Input
              label="قیمت واحد (تومان)"
              type="text"
              inputMode="numeric"
              value={
                formUnitPrice && Number(formUnitPrice) > 0 ? formatPrice(Number(formUnitPrice)) : ""
              }
              onChange={(e) => {
                const latin = toLatinDigits(e.target.value.replace(/[^\d۰-۹٠-٩]/g, ""));
                setFormUnitPrice(latin || "");
                // Auto-convert to USD when Toman changes
                if (latin && Number(currentRate?.rateTomanPerUsd ?? currentRate?.rate) > 0) {
                  const rate = Number(currentRate?.rateTomanPerUsd ?? currentRate?.rate);
                  setFormUnitPriceUsd((Number(latin) / rate).toFixed(2));
                }
              }}
              placeholder="مثال: ۳۵۰٬۰۰۰"
            />
            <Input
              label="قیمت واحد (USD)"
              type="text"
              inputMode="numeric"
              value={
                formUnitPriceUsd && Number(formUnitPriceUsd) > 0
                  ? `$${Number(formUnitPriceUsd).toFixed(2)}`
                  : ""
              }
              onChange={(e) => setFormUnitPriceUsd(e.target.value)}
              placeholder="مثال: 100.00"
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
