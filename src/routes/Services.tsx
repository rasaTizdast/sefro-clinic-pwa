import { useState } from "react";
import { BiPlus } from "react-icons/bi";
import { CiEdit, CiTrash } from "react-icons/ci";

import { SearchButton } from "../components/SearchButton";
import { PackagesTab } from "../components/services/PackagesTab";
import { ServiceDetailModal } from "../components/services/ServiceDetailModal";
import { ServiceFormModal } from "../components/services/ServiceFormModal";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Pagination } from "../components/ui/Pagination";
import { Select } from "../components/ui/Select";
import { type Column, Table } from "../components/ui/Table";
import { TabPanel, Tabs } from "../components/ui/Tabs";
import { Toggle } from "../components/ui/Toggle";
import { useAuth } from "../contexts/AuthContext";
import {
  useDeleteService,
  useServiceCategories,
  useServicesList,
  useUpdateService,
} from "../hooks/api";
import { formatPrice } from "../lib/format";
import type { CompensationRole } from "../types/finance";
import type { Service } from "../types/service";

const PAGE_SIZE = 6;

const statusConfig: Record<string, { label: string; variant: "success" | "warning" }> = {
  active: { label: "فعال", variant: "success" },
  inactive: { label: "غیرفعال", variant: "warning" },
};

const roleLabels: Record<CompensationRole, string> = {
  doctor: "پزشک",
  facial: "فیشال",
  laser: "لیزر",
  none: "بدون پورسانت",
};

function Services() {
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("services");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [detailService, setDetailService] = useState<Service | null>(null);

  const { user } = useAuth();
  const { data: paginated, isLoading } = useServicesList({ page: currentPage, perPage: PAGE_SIZE });
  const { data: categories } = useServiceCategories();
  const updateMutation = useUpdateService();
  const deleteMutation = useDeleteService();

  const isAdmin = user?.role === "admin";

  const services = paginated?.data ?? [];
  const filtered = categoryFilter
    ? services.filter((s) => s.category && String(s.category.id) === categoryFilter)
    : services;

  const totalPages = paginated?.totalPages ?? Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
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

  function handleDelete(service: Service) {
    deleteMutation.mutate(service.id);
  }

  function buildActions(service: Service) {
    const items: Record<string, unknown>[] = [
      {
        label: "جزئیات",
        onClick: () => setDetailService(service),
      },
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
        <span>
          <span className="font-medium">
            {formatPrice(item.priceToman != null ? Number(item.priceToman) : item.price)} تومان
          </span>{" "}
          <span className="text-surface-400 text-xs">${item.priceUsd}</span>
        </span>
      ),
    },
    {
      key: "role",
      header: "پورسانت",
      align: "center",
      render: (item) => (
        <Badge variant={item.compensationRole === "none" ? "default" : "success"} size="sm">
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

      <Tabs
        tabs={[
          { id: "services", label: "خدمات" },
          { id: "packages", label: "پکیج‌ها" },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      <TabPanel id="services" activeTab={activeTab}>
        <div className="mb-4 w-full sm:w-64">
          <Select
            label="دسته‌بندی"
            options={[
              { value: "", label: "همه دسته‌ها" },
              ...(categories ?? []).map((c) => ({ value: String(c.id), label: c.name })),
            ]}
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
          />
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
      </TabPanel>

      <TabPanel id="packages" activeTab={activeTab}>
        <PackagesTab />
      </TabPanel>

      {modalOpen && <ServiceFormModal service={editingService} onClose={closeModal} />}
      {detailService && (
        <ServiceDetailModal service={detailService} onClose={() => setDetailService(null)} />
      )}
    </div>
  );
}

export default Services;
