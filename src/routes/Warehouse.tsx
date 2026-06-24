import { useState } from "react";
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
import { Textarea } from "../components/ui/Textarea";
import {
  useCreateProduct,
  useDeleteProduct,
  useProductsList,
  useUpdateProduct,
} from "../hooks/api";
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

function Warehouse() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WarehouseItem | null>(null);

  const [formName, setFormName] = useState("");
  const [formStock, setFormStock] = useState("");
  const [formUnit, setFormUnit] = useState("");
  const [formUnitPrice, setFormUnitPrice] = useState("");
  const [formDescription, setFormDescription] = useState("");

  const pageSize = 8;

  const { data: paginated, isLoading } = useProductsList({
    page: currentPage,
    perPage: pageSize,
    search: searchQuery || undefined,
  });
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();

  const items = paginated?.data ?? [];

  const totalPages = paginated?.totalPages ?? 1;
  const pagedData = items.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
    setFormStock(String(item.stock));
    setFormUnit(item.unit);
    setFormUnitPrice(item.unitPrice);
    setFormDescription(item.description);
    setModalOpen(true);
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const handleSave = () => {
    if (!formName.trim()) return;

    const payload: Record<string, unknown> = {
      name: formName,
      stock: Number(formStock) || 0,
      unit: formUnit,
      unitPrice: formUnitPrice,
      description: formDescription,
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }

    setModalOpen(false);
    resetForm();
  };

  const columns: Column<WarehouseItem>[] = [
    { key: "name", header: "نام محصول" },
    { key: "stock", header: "موجودی", width: "70px", align: "center" },
    { key: "unit", header: "واحد", width: "80px", align: "center" },
    { key: "unitPrice", header: "قیمت واحد", width: "110px", align: "center" },
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
        <Table columns={columns} data={pagedData} rowKey={(item) => item.id} loading={isLoading} />
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
