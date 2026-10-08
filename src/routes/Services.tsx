import { useMemo, useState } from "react";
import { BiPlus } from "react-icons/bi";
import { CiEdit, CiTrash } from "react-icons/ci";

import { SearchButton } from "../components/SearchButton";
import { PackagesTab } from "../components/services/PackagesTab";
import { ServiceDetailModal } from "../components/services/ServiceDetailModal";
import { ServiceFormModal } from "../components/services/ServiceFormModal";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Modal } from "../components/ui/Modal";
import { Pagination } from "../components/ui/Pagination";
import { type Column, Table } from "../components/ui/Table";
import { TabPanel, Tabs } from "../components/ui/Tabs";
import { Toggle } from "../components/ui/Toggle";
import { PriceCell } from "../components/warehouse/PriceCell";
import { useAuth } from "../contexts/AuthContext";
import { useAllServices, useCurrentRate, useDeleteService, useUpdateService } from "../hooks/api";
import { extractApiError } from "../lib/api-error";
import { serviceDisplayToman } from "../lib/format";
import { ALL_PER_PAGE } from "../services/fetch-all-pages";
import type { CompensationRole } from "../types/finance";
import type { Service } from "../types/service";

const PAGE_SIZE = ALL_PER_PAGE;

const statusConfig: Record<string, { label: string; variant: "success" | "warning" }> = {
  active: { label: "فعال", variant: "success" },
  inactive: { label: "غیرفعال", variant: "warning" },
};

const roleLabels: Record<CompensationRole, string> = {
  doctor: "پزشک",
  facial: "فیشال",
  laser: "لیزر",
  none: "بدون اپراتور",
};

function Services() {
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("services");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [detailService, setDetailService] = useState<Service | null>(null);
  const [deletingService, setDeletingService] = useState<Service | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const { user } = useAuth();
  const { data: allServices, isLoading } = useAllServices();
  const { data: currentRate } = useCurrentRate();
  const updateMutation = useUpdateService();
  const deleteMutation = useDeleteService();

  const isAdmin = user?.role === "admin";

  const rateValue = useMemo(() => {
    const parsed = Number(currentRate?.rateTomanPerUsd ?? currentRate?.rate);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [currentRate]);

  const filtered = useMemo(() => allServices ?? [], [allServices]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedServices = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function openAddModal() {
    setEditingService(null);
    setModalOpen(true);
  }

  function openEditModal(service: Service) {
    setEditingService(service);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingService(null);
  }

  function openDeleteModal(service: Service) {
    setDeleteError("");
    setDeletingService(service);
  }

  async function confirmDelete() {
    if (!deletingService) return;
    setDeleteError("");
    try {
      await deleteMutation.mutateAsync(deletingService.id);
      setDeletingService(null);
    } catch (err: unknown) {
      setDeleteError(extractApiError(err));
    }
  }

  const columns: Column<Service>[] = [
    { key: "title", header: "عنوان خدمت" },
    {
      key: "category",
      header: "دسته‌بندی",
      align: "center",
      render: (item) =>
        item.category ? (
          <Badge variant="info" size="sm">
            {item.category.name}
          </Badge>
        ) : (
          <span className="text-surface-400">—</span>
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
      header: "قیمت",
      align: "end",
      render: (item) => (
        <PriceCell
          // Laser pays a static salary → its price must NOT float with the dollar.
          usd={item.compensationRole === "laser" ? null : item.priceUsd}
          toman={serviceDisplayToman(item)}
          rate={rateValue}
        />
      ),
    },
    {
      key: "role",
      header: "اپراتور",
      align: "center",
      render: (item) => (
        <Badge variant="success" size="sm">
          {roleLabels[item.compensationRole]}
        </Badge>
      ),
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
            onChange={() => {
              if (!window.confirm("آیا تغییر وضعیت خدمت را تأیید می‌کنید؟")) return;
              updateMutation.mutate({ id: item.id, data: { isActive: !item.isActive } });
            }}
            disabled={updateMutation.isPending}
          />
        );
      },
    },
    {
      key: "actions",
      header: "عملیات",
      align: "center",
      width: "200px",
      render: (item) => (
        <div className="flex items-center justify-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setDetailService(item)}>
            جزئیات
          </Button>
          <Button
            variant="ghost"
            size="sm"
            startIcon={<CiEdit className="size-4" />}
            onClick={() => openEditModal(item)}
          >
            ویرایش
          </Button>
          {isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              className="text-danger-600 hover:text-danger-700 hover:bg-danger-50"
              startIcon={<CiTrash className="size-4" />}
              onClick={() => openDeleteModal(item)}
            >
              حذف
            </Button>
          )}
        </div>
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

      <Tabs
        tabs={[
          { id: "services", label: "خدمات" },
          { id: "packages", label: "پکیج‌ها" },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      <TabPanel id="services" activeTab={activeTab}>
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
      </TabPanel>

      <TabPanel id="packages" activeTab={activeTab}>
        <PackagesTab />
      </TabPanel>

      {modalOpen && <ServiceFormModal service={editingService} onClose={closeModal} />}
      {detailService && (
        <ServiceDetailModal service={detailService} onClose={() => setDetailService(null)} />
      )}

      <Modal
        open={deletingService !== null}
        onClose={() => {
          setDeletingService(null);
          setDeleteError("");
        }}
        title="حذف خدمت"
        size="sm"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setDeletingService(null);
                setDeleteError("");
              }}
              disabled={deleteMutation.isPending}
            >
              انصراف
            </Button>
            <Button variant="danger" loading={deleteMutation.isPending} onClick={confirmDelete}>
              حذف خدمت
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-surface-600 text-sm leading-relaxed">
            آیا از حذف خدمت «{deletingService?.title}» مطمئن هستید؟ این عمل قابل بازگشت نیست.
          </p>
          {deleteError && (
            <div className="bg-danger-50 text-danger-700 border-danger-200 rounded-lg border p-3 text-sm">
              {deleteError}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

export default Services;
