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
import { Tabs } from "../components/ui/Tabs";
import { Textarea } from "../components/ui/Textarea";
import type { WarehouseItem } from "../types/warehouse";

const categoryTabs = [
  { id: "all", label: "همه" },
  { id: "medicines", label: "داروها" },
  { id: "consumables", label: "مواد مصرفی" },
  { id: "equipment", label: "تجهیزات" },
  { id: "office", label: "لوازم اداری" },
];

const unitOptions = [
  { value: "عدد", label: "عدد" },
  { value: "بسته", label: "بسته" },
  { value: "کیلوگرم", label: "کیلوگرم" },
  { value: "لیتر", label: "لیتر" },
];

const categoryOptions = [
  { value: "medicines", label: "داروها" },
  { value: "consumables", label: "مواد مصرفی" },
  { value: "equipment", label: "تجهیزات" },
  { value: "office", label: "لوازم اداری" },
];

const initialItems: WarehouseItem[] = [
  {
    id: 1,
    name: "آمپول سفتریاکسون ۵۰۰mg",
    category: "medicines",
    categoryLabel: "داروها",
    stock: 50,
    unit: "عدد",
    unitPrice: "۴۵,۰۰۰",
    expiryDate: "۱۴۰۵/۰۹/۱۵",
    description: "",
  },
  {
    id: 2,
    name: "سرم رینگر",
    category: "medicines",
    categoryLabel: "داروها",
    stock: 3,
    unit: "عدد",
    unitPrice: "۲۸,۰۰۰",
    expiryDate: "۱۴۰۵/۱۲/۲۰",
    description: "نیاز به تامین مجدد",
  },
  {
    id: 3,
    name: "پانسمان استریل",
    category: "consumables",
    categoryLabel: "مواد مصرفی",
    stock: 20,
    unit: "عدد",
    unitPrice: "۱۲,۰۰۰",
    expiryDate: "۱۴۰۶/۰۳/۱۰",
    description: "",
  },
  {
    id: 4,
    name: "دستکش معاینه",
    category: "consumables",
    categoryLabel: "مواد مصرفی",
    stock: 0,
    unit: "عدد",
    unitPrice: "۸,۵۰۰",
    expiryDate: "۱۴۰۵/۰۸/۰۱",
    description: "کاملاً تمام شده",
  },
  {
    id: 5,
    name: "چسب زخم",
    category: "consumables",
    categoryLabel: "مواد مصرفی",
    stock: 100,
    unit: "عدد",
    unitPrice: "۳,۵۰۰",
    expiryDate: "۱۴۰۶/۰۶/۳۰",
    description: "",
  },
  {
    id: 6,
    name: "فشارسنج عقربه‌ای",
    category: "equipment",
    categoryLabel: "تجهیزات",
    stock: 8,
    unit: "عدد",
    unitPrice: "۱,۸۰۰,۰۰۰",
    expiryDate: "—",
    description: "",
  },
  {
    id: 7,
    name: "گوشی پزشکی",
    category: "equipment",
    categoryLabel: "تجهیزات",
    stock: 15,
    unit: "عدد",
    unitPrice: "۲,۵۰۰,۰۰۰",
    expiryDate: "—",
    description: "مدل جدید",
  },
  {
    id: 8,
    name: "صندلی اداری",
    category: "office",
    categoryLabel: "لوازم اداری",
    stock: 12,
    unit: "عدد",
    unitPrice: "۴,۵۰۰,۰۰۰",
    expiryDate: "—",
    description: "",
  },
  {
    id: 9,
    name: "کاغذ A4",
    category: "office",
    categoryLabel: "لوازم اداری",
    stock: 0,
    unit: "بسته",
    unitPrice: "۱۵۰,۰۰۰",
    expiryDate: "—",
    description: "نیاز به سفارش فوری",
  },
  {
    id: 10,
    name: "سرنگ ۵cc",
    category: "consumables",
    categoryLabel: "مواد مصرفی",
    stock: 200,
    unit: "عدد",
    unitPrice: "۳,۰۰۰",
    expiryDate: "۱۴۰۶/۰۸/۱۵",
    description: "",
  },
  {
    id: 11,
    name: "آنتی‌بیوتیک سفکسیم",
    category: "medicines",
    categoryLabel: "داروها",
    stock: 40,
    unit: "عدد",
    unitPrice: "۳۵,۰۰۰",
    expiryDate: "۱۴۰۵/۱۱/۰۵",
    description: "",
  },
  {
    id: 12,
    name: "شربت دیفن‌هیدرامین",
    category: "medicines",
    categoryLabel: "داروها",
    stock: 18,
    unit: "عدد",
    unitPrice: "۲۲,۰۰۰",
    expiryDate: "۱۴۰۶/۰۲/۲۰",
    description: "",
  },
  {
    id: 13,
    name: "ترازو دیجیتال",
    category: "equipment",
    categoryLabel: "تجهیزات",
    stock: 3,
    unit: "عدد",
    unitPrice: "۳,۲۰۰,۰۰۰",
    expiryDate: "—",
    description: "کمبود موجودی",
  },
  {
    id: 14,
    name: "پرونده پزشکی",
    category: "office",
    categoryLabel: "لوازم اداری",
    stock: 60,
    unit: "عدد",
    unitPrice: "۲۵,۰۰۰",
    expiryDate: "—",
    description: "",
  },
  {
    id: 15,
    name: "ماسک سه‌لایه",
    category: "consumables",
    categoryLabel: "مواد مصرفی",
    stock: 0,
    unit: "بسته",
    unitPrice: "۲۵۰,۰۰۰",
    expiryDate: "۱۴۰۶/۰۵/۱۵",
    description: "اتمام موجودی",
  },
];

function getStatus(stock: number): { label: string; variant: "success" | "warning" | "danger" } {
  if (stock === 0) return { label: "تمام شده", variant: "danger" };
  if (stock <= 10) return { label: "کم", variant: "warning" };
  return { label: "موجود", variant: "success" };
}

function Warehouse() {
  const [items, setItems] = useState(initialItems);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WarehouseItem | null>(null);

  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formStock, setFormStock] = useState("");
  const [formUnit, setFormUnit] = useState("");
  const [formUnitPrice, setFormUnitPrice] = useState("");
  const [formExpiryDate, setFormExpiryDate] = useState("");
  const [formDescription, setFormDescription] = useState("");

  const pageSize = 8;

  const filteredData = useMemo(() => {
    let data = items;
    if (activeTab !== "all") {
      data = data.filter((item) => item.category === activeTab);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim();
      data = data.filter((item) => item.name.includes(q));
    }
    return data;
  }, [items, activeTab, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const pagedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const lowStockCount = items.filter((item) => item.stock <= 10).length;

  const handleTabChange = (id: string) => {
    setActiveTab(id);
    setCurrentPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const resetForm = () => {
    setFormName("");
    setFormCategory("");
    setFormStock("");
    setFormUnit("");
    setFormUnitPrice("");
    setFormExpiryDate("");
    setFormDescription("");
  };

  const openNewModal = () => {
    setEditingItem(null);
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (item: WarehouseItem) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormCategory(item.category);
    setFormStock(String(item.stock));
    setFormUnit(item.unit);
    setFormUnitPrice(item.unitPrice);
    setFormExpiryDate(item.expiryDate);
    setFormDescription(item.description);
    setModalOpen(true);
  };

  const handleDelete = (id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSave = () => {
    if (!formName.trim()) return;

    const categoryLabel = categoryOptions.find((o) => o.value === formCategory)?.label || "";

    if (editingItem) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === editingItem.id
            ? {
                ...item,
                name: formName,
                category: formCategory,
                categoryLabel,
                stock: Number(formStock) || 0,
                unit: formUnit,
                unitPrice: formUnitPrice,
                expiryDate: formExpiryDate,
                description: formDescription,
              }
            : item
        )
      );
    } else {
      const newId = Math.max(...items.map((i) => i.id), 0) + 1;
      const newItem: WarehouseItem = {
        id: newId,
        name: formName,
        category: formCategory,
        categoryLabel,
        stock: Number(formStock) || 0,
        unit: formUnit,
        unitPrice: formUnitPrice,
        expiryDate: formExpiryDate,
        description: formDescription,
      };
      setItems((prev) => [...prev, newItem]);
    }

    setModalOpen(false);
    resetForm();
  };

  const columns: Column<WarehouseItem>[] = [
    { key: "name", header: "نام محصول" },
    { key: "categoryLabel", header: "دسته‌بندی", width: "100px", align: "center" },
    { key: "stock", header: "موجودی", width: "70px", align: "center" },
    { key: "unit", header: "واحد", width: "80px", align: "center" },
    { key: "unitPrice", header: "قیمت واحد", width: "110px", align: "center" },
    { key: "expiryDate", header: "تاریخ انقضا", width: "120px", align: "center" },
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
          <button
            onClick={() => handleDelete(item.id)}
            className="text-surface-400 hover:text-danger-600 hover:bg-danger-50 cursor-pointer rounded-md p-1.5 transition-colors"
            aria-label="حذف"
          >
            <BiTrash className="size-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-surface-900 text-2xl font-bold">مدیریت انبار</h1>
        <div className="mt-3 flex items-center gap-3 sm:mt-0">
          <Button
            variant="primary"
            startIcon={<BiPlus className="size-5" />}
            onClick={openNewModal}
          >
            محصول جدید
          </Button>
          <SearchButton />
        </div>
      </div>

      {lowStockCount > 0 && (
        <Alert variant="warning" title="هشدار موجودی">
          {lowStockCount} محصول در انبار دارای موجودی کم یا صفر هستند. لطفاً نسبت به تامین آنها
          اقدام کنید.
        </Alert>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs tabs={categoryTabs} activeTab={activeTab} onChange={handleTabChange} />
        <div className="w-full shrink-0 sm:w-64">
          <Input
            placeholder="جستجوی محصول..."
            startIcon={<BiSearch className="size-4" />}
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>
      </div>

      <Card variant="outlined" padding="none">
        <Table columns={columns} data={pagedData} rowKey={(item) => item.id} />
      </Card>

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          resetForm();
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
          <Input
            label="نام محصول"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="نام محصول را وارد کنید"
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="دسته‌بندی"
              options={categoryOptions}
              placeholder="انتخاب دسته‌بندی"
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
            />
            <Select
              label="واحد"
              options={unitOptions}
              placeholder="انتخاب واحد"
              value={formUnit}
              onChange={(e) => setFormUnit(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="تعداد موجودی"
              type="number"
              value={formStock}
              onChange={(e) => setFormStock(e.target.value)}
              placeholder="۰"
            />
            <Input
              label="قیمت واحد"
              value={formUnitPrice}
              onChange={(e) => setFormUnitPrice(e.target.value)}
              placeholder="قیمت را وارد کنید"
            />
          </div>
          <Input
            label="تاریخ انقضا"
            value={formExpiryDate}
            onChange={(e) => setFormExpiryDate(e.target.value)}
            placeholder="مثال: ۱۴۰۵/۱۲/۲۰"
          />
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
