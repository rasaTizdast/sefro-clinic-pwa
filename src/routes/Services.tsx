import { useState } from "react";
import { BiPlus } from "react-icons/bi";
import { CiEdit, CiTrash } from "react-icons/ci";

import { SearchButton } from "../components/SearchButton";
import { Alert } from "../components/ui/Alert";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { Pagination } from "../components/ui/Pagination";
import { Select } from "../components/ui/Select";
import { type Column, Table } from "../components/ui/Table";
import { Textarea } from "../components/ui/Textarea";
import { Toggle } from "../components/ui/Toggle";
import { useAuth } from "../contexts/AuthContext";
import {
  useCreateService,
  useDeleteService,
  useServicesList,
  useUpdateService,
} from "../hooks/api";
import { extractApiError } from "../lib/api-error";
import { toLatinDigits } from "../lib/digits";
import { formatPrice } from "../lib/format";
import type { Service, ServiceFormData } from "../types/service";

const initialForm: ServiceFormData = {
  title: "",
  duration: 0,
  price: 0,
  description: "",
  isActive: true,
};

const PAGE_SIZE = 6;

const statusConfig: Record<string, { label: string; variant: "success" | "warning" }> = {
  active: { label: "فعال", variant: "success" },
  inactive: { label: "غیرفعال", variant: "warning" },
};

function Services() {
  const [currentPage, setCurrentPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [form, setForm] = useState<ServiceFormData>(initialForm);
  const [formError, setFormError] = useState("");

  const { user } = useAuth();
  const { data: paginated, isLoading } = useServicesList({ page: currentPage, perPage: PAGE_SIZE });
  const createMutation = useCreateService();
  const updateMutation = useUpdateService();
  const deleteMutation = useDeleteService();

  const isAdmin = user?.role === "admin";

  const services = paginated?.data ?? [];

  const totalPages = paginated?.totalPages ?? Math.max(1, Math.ceil(services.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedServices = services.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function openAddModal() {
    setEditingService(null);
    setForm(initialForm);
    setFormError("");
    setModalOpen(true);
  }

  function openEditModal(service: Service) {
    setEditingService(service);
    setForm({
      title: service.title,
      duration: service.duration,
      price: service.price,
      description: service.description,
      isActive: service.isActive,
    });
    setFormError("");
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingService(null);
    setFormError("");
  }

  function handleFormChange(field: keyof ServiceFormData, value: string | number | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    const payload: Record<string, unknown> = {
      title: form.title,
      duration: Number(form.duration),
      price: Number(form.price),
      description: form.description,
      isActive: form.isActive,
    };

    try {
      if (editingService) {
        await updateMutation.mutateAsync({ id: editingService.id, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      closeModal();
    } catch (err: unknown) {
      setFormError(extractApiError(err));
    }
  }

  function handleDelete(service: Service) {
    deleteMutation.mutate(service.id);
  }

  function buildActions(service: Service) {
    const items: Record<string, unknown>[] = [
      {
        label: "ویرایش",
        icon: <CiEdit className="size-4" />,
        onClick: () => openEditModal(service),
      },
    ];
    if (isAdmin) {
      items.push({
        label: "حذف",
        icon: <CiTrash className="size-4" />,
        danger: true,
        onClick: () => handleDelete(service),
      });
    }
    return items;
  }

  const columns: Column<Service>[] = [
    { key: "title", header: "عنوان خدمت" },
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
          align="start"
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
          <h1 className="text-surface-900 text-2xl font-bold" data-tour="srv-header">
            خدمات کلینیک
          </h1>
        </div>
        <div className="mt-3 flex items-center gap-3 sm:mt-0" data-tour="srv-add">
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

      <Card variant="outlined" padding="none" data-tour="srv-table">
        <Table
          columns={columns}
          data={paginatedServices}
          rowKey={(item) => item.id}
          className="rounded-none border-0"
          loading={isLoading}
        />
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
              disabled={!form.title || !form.duration || !form.price}
            >
              ذخیره
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {formError && <Alert variant="error">{formError}</Alert>}
          <Input
            label="نام خدمت"
            value={form.title}
            onChange={(e) => handleFormChange("title", e.target.value)}
            placeholder="مثال: فیشال صورت"
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
              type="text"
              inputMode="numeric"
              value={form.price ? formatPrice(Number(form.price)) : ""}
              onChange={(e) => {
                const latin = toLatinDigits(e.target.value.replace(/[^\d۰-۹٠-٩]/g, ""));
                handleFormChange("price", Number(latin) || 0);
              }}
              placeholder="مثال: ۳۵۰٬۰۰۰"
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
    </div>
  );
}

export default Services;
