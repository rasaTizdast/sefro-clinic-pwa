import { useState } from "react";
import { BiPlus, BiTrash } from "react-icons/bi";
import { FiEdit2 } from "react-icons/fi";

import {
  useCreateOperatingExpenseCategory,
  useDeleteOperatingExpenseCategory,
  useOperatingExpenseCategories,
  useUpdateOperatingExpenseCategory,
} from "../../hooks/api";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { Spinner } from "../ui/Spinner";
import { useToast } from "../ui/Toast";
import { Toggle } from "../ui/Toggle";

interface CategoryModalProps {
  open: boolean;
  onClose: () => void;
}

export function OperatingExpenseCategoryModal({ open, onClose }: CategoryModalProps) {
  const toast = useToast();
  const { data, isLoading } = useOperatingExpenseCategories({ perPage: 100 });
  const createCategory = useCreateOperatingExpenseCategory();
  const updateCategory = useUpdateOperatingExpenseCategory();
  const deleteCategory = useDeleteOperatingExpenseCategory();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editActive, setEditActive] = useState(true);

  const startEdit = (id: number, currentName: string, currentSlug: string, isActive: boolean) => {
    setEditingId(id);
    setEditName(currentName);
    setEditSlug(currentSlug);
    setEditActive(isActive);
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    await updateCategory.mutateAsync({
      id: editingId,
      payload: {
        name: editName.trim(),
        ...(editSlug.trim() ? { slug: editSlug.trim() } : {}),
        isActive: editActive,
      },
    });
    setEditingId(null);
  };

  const removeCategory = async (id: number) => {
    try {
      await deleteCategory.mutateAsync(id);
    } catch {
      // useDeleteOperatingExpenseCategory already surfaces the backend message
      // (e.g. "این دسته‌بندی دارای هزینه ثبت‌شده است؛ به‌جای حذف، آن را غیرفعال کنید.")
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      await createCategory.mutateAsync({
        name: name.trim(),
        ...(slug.trim() ? { slug: slug.trim() } : {}),
        isActive: true,
      });
      toast.success("دسته‌بندی ثبت شد");
      setName("");
      setSlug("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "خطا در ثبت دسته‌بندی");
    }
  };

  const categories = data?.data ?? [];

  return (
    <Modal open={open} onClose={onClose} title="مدیریت دسته‌بندی هزینه‌ها" size="lg">
      <div className="flex flex-col gap-4">
        <div className="border-surface-200 flex flex-col gap-2 rounded-lg border p-3">
          <Input
            label="نام دسته‌بندی جدید"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            label="شناسه لاتین (اختیاری)"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
          <Button
            variant="primary"
            size="sm"
            startIcon={<BiPlus className="size-4" />}
            onClick={handleCreate}
            disabled={!name.trim() || createCategory.isPending}
            className="self-start"
          >
            افزودن دسته‌بندی
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : (
          <ul className="border-surface-200 divide-surface-200 divide-y rounded-lg border">
            {categories.map((c) =>
              editingId === c.id ? (
                <li key={c.id} className="flex flex-col gap-2 p-3">
                  <Input
                    label="نام"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                  <Input
                    label="شناسه لاتین"
                    value={editSlug}
                    onChange={(e) => setEditSlug(e.target.value)}
                  />
                  <div className="flex items-center justify-between">
                    <Toggle
                      checked={editActive}
                      onChange={(e) => setEditActive(e.target.checked)}
                      label="فعال"
                    />
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>
                        انصراف
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={saveEdit}
                        disabled={!editName.trim() || updateCategory.isPending}
                      >
                        ذخیره
                      </Button>
                    </div>
                  </div>
                </li>
              ) : (
                <li key={c.id} className="flex items-center justify-between gap-2 p-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-surface-900 text-sm font-medium">{c.name}</span>
                    <span className="text-surface-400 text-xs" dir="ltr">
                      {c.slug}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={c.isActive ? "success" : "default"} size="sm">
                      {c.isActive ? "فعال" : "غیرفعال"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEdit(c.id, c.name, c.slug, c.isActive)}
                    >
                      <FiEdit2 className="size-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => removeCategory(c.id)}>
                      <BiTrash className="text-danger-600 size-4" />
                    </Button>
                  </div>
                </li>
              )
            )}
          </ul>
        )}
      </div>
    </Modal>
  );
}
