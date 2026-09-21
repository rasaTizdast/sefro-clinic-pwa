import { useState } from "react";
import { BiPencil, BiPlus, BiTrash } from "react-icons/bi";

import {
  useDeleteServiceCategory,
  useSaveServiceCategory,
  useServiceCategories,
} from "../../hooks/api";
import type { ServiceCategory } from "../../types/finance";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { Skeleton } from "../ui/Skeleton";
import { type Column, Table } from "../ui/Table";

interface CategoryForm {
  name: string;
  description: string;
}

export function ServiceCategoriesTab() {
  const { data: categories, isLoading } = useServiceCategories();
  const saveCategory = useSaveServiceCategory();
  const deleteCategory = useDeleteServiceCategory();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CategoryForm>({ name: "", description: "" });

  const categoryList = Array.isArray(categories) ? categories : [];

  function openNew() {
    setEditingId(null);
    setForm({ name: "", description: "" });
    setModalOpen(true);
  }

  function openEdit(cat: ServiceCategory) {
    setEditingId(cat.id);
    setForm({ name: cat.name, description: cat.description });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    await saveCategory.mutateAsync({
      id: editingId ?? undefined,
      payload: { name: form.name.trim(), description: form.description },
    });
    setModalOpen(false);
  }

  function handleDelete(id: number) {
    deleteCategory.mutate(id);
  }

  const columns: Column<ServiceCategory>[] = [
    { key: "name", header: "نام" },
    { key: "description", header: "توضیحات" },
    {
      key: "isActive",
      header: "وضعیت",
      align: "center",
      render: (cat) => (
        <Badge variant={cat.isActive ? "success" : "danger"} size="sm">
          {cat.isActive ? "فعال" : "غیرفعال"}
        </Badge>
      ),
    },
    {
      key: "sortOrder",
      header: "اولویت",
      align: "center",
      width: "60px",
    },
    {
      key: "actions",
      header: "عملیات",
      align: "center",
      width: "100px",
      render: (cat) => (
        <div className="flex items-center justify-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            startIcon={<BiPencil className="size-4" />}
            onClick={() => openEdit(cat)}
          />
          <Button
            variant="ghost"
            size="sm"
            startIcon={<BiTrash className="text-danger-500 size-4" />}
            onClick={() => handleDelete(cat.id)}
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
        <h3 className="text-surface-900 text-sm font-semibold">دسته‌بندی خدمات</h3>
        <Button variant="primary" startIcon={<BiPlus className="size-4" />} onClick={openNew}>
          دسته‌بندی جدید
        </Button>
      </div>

      <Card variant="outlined" padding="none">
        <Table columns={columns} data={categoryList} rowKey={(c) => c.id} />
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "ویرایش دسته‌بندی" : "دسته‌بندی جدید"}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              انصراف
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={!form.name.trim() || saveCategory.isPending}
              loading={saveCategory.isPending}
            >
              ذخیره
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            label="نام"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="نام دسته‌بندی"
          />
          <Input
            label="توضیحات (اختیاری)"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="توضیحات..."
          />
        </div>
      </Modal>
    </div>
  );
}
