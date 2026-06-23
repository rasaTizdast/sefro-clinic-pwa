import { useMemo, useState } from "react";
import { BiCategory, BiPlus, BiSolidCategory } from "react-icons/bi";
import { CiEdit, CiTrash } from "react-icons/ci";

import { SearchButton } from "../components/SearchButton";
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
import { Toggle } from "../components/ui/Toggle";
import {
  useCreateService,
  useDeleteService,
  useServicesList,
  useUpdateService,
} from "../hooks/api";
import type { Service, ServiceCategory, ServiceFormData } from "../types/service";

const DEFAULT_CATEGORIES: ServiceCategory[] = [
  { id: 1, name: "زیبایی" },
  { id: 2, name: "درمانی" },
  { id: 3, name: "مشاوره" },
  { id: 4, name: "آزمایشگاهی" },
];

const initialForm: ServiceFormData = {
  title: "",
  category: "",
  duration: "",
  price: "",
  description: "",
  isActive: true,
};

const initialCategoryForm = { name: "" };

const PAGE_SIZE = 6;

const statusConfig: Record<string, { label: string; variant: "success" | "warning" }> = {
  active: { label: "فعال", variant: "success" },
  inactive: { label: "غیرفعال", variant: "warning" },
};

function formatPrice(price: number): string {
  return new Intl.NumberFormat("fa-IR").format(price);
}

function Services() {
  const [categories, setCategories] = useState<ServiceCategory[]>(DEFAULT_CATEGORIES);
  const [activeTab, setActiveTab] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [form, setForm] = useState<ServiceFormData>(initialForm);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState(initialCategoryForm);
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null);

  const { data: paginated, isLoading } = useServicesList({ page: currentPage, perPage: PAGE_SIZE });
  const createMutation = useCreateService();
  const updateMutation = useUpdateService();
  const deleteMutation = useDeleteService();

  const services = paginated?.data ?? [];

  const categoryTabs = useMemo(
    () => [{ id: "all", label: "همه" }, ...categories.map((c) => ({ id: c.name, label: c.name }))],
    [categories]
  );

  const CATEGORY_OPTIONS = useMemo(
    () => categories.map((c) => ({ value: c.name, label: c.name })),
    [categories]
  );

  const filteredServices =
    activeTab === "all" ? services : services.filter((s) => s.category === activeTab);

  const totalPages =
    paginated?.totalPages ?? Math.max(1, Math.ceil(filteredServices.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedServices = filteredServices.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  function openAddModal() {
    setEditingService(null);
    setForm(initialForm);
    setModalOpen(true);
  }

  function openEditModal(service: Service) {
    setEditingService(service);
    setForm({
      title: service.title,
      category: service.category,
      duration: String(service.duration),
      price: String(service.price),
      description: service.description,
      isActive: service.isActive,
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingService(null);
  }

  function handleFormChange(field: keyof ServiceFormData, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSave() {
    const payload: Record<string, unknown> = {
      title: form.title,
      duration: Number(form.duration),
      price: Number(form.price),
      description: form.description,
      isActive: form.isActive,
    };

    if (editingService) {
      updateMutation.mutate({ id: editingService.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
    closeModal();
  }

  function handleDelete(service: Service) {
    deleteMutation.mutate(service.id);
  }

  function handleTabChange(tabId: string) {
    setActiveTab(tabId);
    setCurrentPage(1);
  }

  function buildActions(service: Service) {
    return [
      {
        label: "ویرایش",
        icon: <CiEdit className="size-4" />,
        onClick: () => openEditModal(service),
      },
      {
        label: "حذف",
        icon: <CiTrash className="size-4" />,
        danger: true,
        onClick: () => handleDelete(service),
      },
    ];
  }

  function openAddCategoryModal() {
    setEditingCategory(null);
    setCategoryForm(initialCategoryForm);
    setCategoryModalOpen(true);
  }

  function openEditCategoryModal(cat: ServiceCategory) {
    setEditingCategory(cat);
    setCategoryForm({ name: cat.name });
    setCategoryModalOpen(true);
  }

  function closeCategoryModal() {
    setCategoryModalOpen(false);
    setEditingCategory(null);
  }

  function handleSaveCategory() {
    if (!categoryForm.name.trim()) return;
    if (editingCategory) {
      const oldName = editingCategory.name;
      setCategories((prev) =>
        prev.map((c) =>
          c.id === editingCategory.id ? { ...c, name: categoryForm.name.trim() } : c
        )
      );
      if (activeTab === oldName) setActiveTab(categoryForm.name.trim());
    } else {
      const newCat: ServiceCategory = {
        id: Date.now(),
        name: categoryForm.name.trim(),
      };
      setCategories((prev) => [...prev, newCat]);
    }
    closeCategoryModal();
  }

  function handleDeleteCategory(cat: ServiceCategory) {
    const inUse = services.some((s) => s.category === cat.name);
    if (inUse) return;
    setCategories((prev) => prev.filter((c) => c.id !== cat.id));
    if (activeTab === cat.name) setActiveTab("all");
  }

  const columns: Column<Service>[] = [
    { key: "title", header: "عنوان خدمت" },
    {
      key: "category",
      header: "دسته‌بندی",
      render: (item) => (
        <Badge variant="info" size="sm">
          {item.category}
        </Badge>
      ),
    },
    {
      key: "duration",
      header: "مدت (دقیقه)",
      align: "center",
      render: (item) => <span>{new Intl.NumberFormat("fa-IR").format(item.duration)}</span>,
    },
    {
      key: "price",
      header: "قیمت (تومان)",
      align: "end",
      render: (item) => <span className="font-medium">{formatPrice(item.price)}</span>,
    },
    {
      key: "isActive",
      header: "وضعیت",
      align: "center",
      render: (item) => {
        const cfg = item.isActive ? statusConfig.active : statusConfig.inactive;
        return (
          <Toggle
            label={cfg.label}
            checked={item.isActive}
            onChange={() =>
              updateMutation.mutate({ id: item.id, data: { isActive: !item.isActive } })
            }
          />
        );
      },
    },
    {
      key: "actions",
      header: "عملیات",
      align: "center",
      width: "80px",
      render: (item) => (
        <Select
          align="end"
          trigger={
            <Button variant="ghost" size="sm">
              <svg
                className="size-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 5v.01M12 12v.01M12 19v.01"
                />
              </svg>
            </Button>
          }
          items={buildActions(item)}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-surface-900 text-2xl font-bold">خدمات کلینیک</h1>
        </div>
        <div className="mt-3 flex items-center gap-3 sm:mt-0">
          <Button
            variant="outline"
            startIcon={<BiCategory className="size-5" />}
            onClick={openAddCategoryModal}
          >
            دسته‌بندی‌ها
          </Button>
          <Button
            variant="primary"
            startIcon={<BiPlus className="size-5" />}
            onClick={openAddModal}
          >
            خدمت جدید
          </Button>
          <SearchButton />
        </div>
      </div>

      <Card variant="outlined" padding="none">
        <Tabs tabs={categoryTabs} activeTab={activeTab} onChange={handleTabChange} />
        <TabPanel id={activeTab} activeTab={activeTab}>
          <Table
            columns={columns}
            data={paginatedServices}
            rowKey={(item) => item.id}
            className="rounded-none border-0"
            loading={isLoading}
          />
        </TabPanel>
        <div className="border-surface-200 flex items-center justify-center border-t px-5 py-4">
          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      </Card>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingService ? "ویرایش خدمت" : "خدمت جدید"}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={closeModal}>
              انصراف
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={!form.title || !form.category || !form.duration || !form.price}
            >
              ذخیره
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            label="نام خدمت"
            value={form.title}
            onChange={(e) => handleFormChange("title", e.target.value)}
            placeholder="مثال: فیشال صورت"
          />
          <Select
            label="دسته‌بندی"
            options={CATEGORY_OPTIONS}
            placeholder="انتخاب دسته‌بندی"
            value={form.category}
            onChange={(e) => handleFormChange("category", e.target.value)}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="مدت زمان (دقیقه)"
              type="number"
              value={form.duration}
              onChange={(e) => handleFormChange("duration", e.target.value)}
              placeholder="مثال: ۳۰"
            />
            <Input
              label="قیمت (تومان)"
              type="number"
              value={form.price}
              onChange={(e) => handleFormChange("price", e.target.value)}
              placeholder="مثال: ۳۵۰۰۰۰"
            />
          </div>
          <Textarea
            label="توضیحات"
            value={form.description}
            onChange={(e) => handleFormChange("description", e.target.value)}
            placeholder="توضیحات مربوط به خدمت..."
            rows={3}
          />
          <Toggle
            label="وضعیت"
            checked={form.isActive}
            onChange={(e) => handleFormChange("isActive", e.target.checked)}
          />
        </div>
      </Modal>

      <Modal
        open={categoryModalOpen}
        onClose={closeCategoryModal}
        title="مدیریت دسته‌بندی‌ها"
        size="md"
        footer={
          <Button variant="outline" onClick={closeCategoryModal}>
            بستن
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input
                label="نام دسته‌بندی"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="مثال: زیبایی"
              />
            </div>
            <Button
              variant="primary"
              onClick={handleSaveCategory}
              disabled={!categoryForm.name.trim()}
            >
              {editingCategory ? "ویرایش" : "افزودن"}
            </Button>
          </div>
          <div className="border-surface-200 flex flex-col gap-1 rounded-lg border p-2">
            {categories.length === 0 ? (
              <p className="text-surface-400 py-4 text-center text-sm">هیچ دسته‌بندی وجود ندارد</p>
            ) : (
              categories.map((cat) => {
                const inUse = services.some((s) => s.category === cat.name);
                return (
                  <div
                    key={cat.id}
                    className="hover:bg-surface-50 flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <BiSolidCategory className="text-surface-400 size-4" />
                      <span className="text-surface-700 text-sm">{cat.name}</span>
                      {inUse && (
                        <span className="text-surface-400 text-xs">
                          ({services.filter((s) => s.category === cat.name).length} خدمت)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditCategoryModal(cat)}
                        className="text-surface-400 hover:text-primary-600 cursor-pointer rounded p-1 transition-colors"
                        title="ویرایش"
                      >
                        <CiEdit className="size-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat)}
                        disabled={inUse}
                        className={`cursor-pointer rounded p-1 transition-colors ${inUse ? "text-surface-200 cursor-not-allowed" : "text-surface-400 hover:text-danger-600"}`}
                        title={inUse ? "این دسته‌بندی در حال استفاده است" : "حذف"}
                      >
                        <CiTrash className="size-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default Services;
