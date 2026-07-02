import { useCallback, useEffect, useMemo, useState } from "react";
import { BiDownload, BiEdit, BiPlus, BiSearch, BiTrash } from "react-icons/bi";
import { MdPersonAdd } from "react-icons/md";
import { MdOutlinePeople } from "react-icons/md";
import { PiDotsThreeVertical } from "react-icons/pi";

import { PatientFormModal } from "../components/patients/PatientFormModal";
import { SearchButton } from "../components/SearchButton";
import { Alert } from "../components/ui/Alert";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { Pagination } from "../components/ui/Pagination";
import { Select } from "../components/ui/Select";
import { type Column, Table } from "../components/ui/Table";
import type { Tab } from "../components/ui/Tabs";
import { Tabs } from "../components/ui/Tabs";
import {
  useCreateCustomer,
  useCustomersList,
  useDeleteCustomer,
  useUpdateCustomer,
} from "../hooks/api";
import { useQuickActions } from "../hooks/useQuickActions";
import { formatJalaliDate } from "../lib/date";
import { toPersianDigits } from "../lib/digits";
import { exportPatientsToExcel } from "../lib/excel";
import { formatPrice } from "../lib/format";
import type { Patient, PatientFormData, PatientStatus } from "../types/patient";

type StatusVariant = "success" | "warning" | "info";

const statusMap: Record<PatientStatus, { label: string; variant: StatusVariant }> = {
  active: { label: "فعال", variant: "success" },
  inactive: { label: "غیرفعال", variant: "warning" },
  new: { label: "جدید", variant: "info" },
  loyal: { label: "وفادار", variant: "success" },
};

const filterTabs: Tab[] = [
  { id: "all", label: "همه" },
  { id: "active", label: "فعال" },
  { id: "inactive", label: "غیرفعال" },
  { id: "new", label: "جدید" },
];

const PAGE_SIZE = 10;

function Patients() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const { registerAction } = useQuickActions();

  const searchValue = search.trim() || undefined;

  const {
    data: paginated,
    isLoading,
    isError,
    refetch,
  } = useCustomersList({
    page: currentPage,
    perPage: PAGE_SIZE,
    search: searchValue,
  });

  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();
  const deleteMutation = useDeleteCustomer();

  useEffect(() => {
    const unregister = registerAction({
      id: "newPatient",
      label: "بیمار جدید",
      icon: <MdPersonAdd />,
      perform: () => {
        setEditingPatient(null);
        setModalOpen(true);
      },
    });
    return unregister;
  }, [registerAction]);

  const patients = paginated?.data ?? [];
  const totalPages = paginated?.totalPages ?? 1;

  const tabCounts = useMemo(() => {
    const all = patients.length;
    const active = patients.filter((p) => p.status === "active").length;
    const inactive = patients.filter((p) => p.status === "inactive").length;
    const newP = patients.filter((p) => p.status === "new").length;
    return { all, active, inactive, new: newP };
  }, [patients]);

  const tabsWithBadges: Tab[] = filterTabs.map((tab) => ({
    ...tab,
    badge: tabCounts[tab.id as keyof typeof tabCounts],
  }));

  const filteredPatients = useMemo(() => {
    if (activeTab === "all") return patients;
    return patients.filter((p) => p.status === activeTab);
  }, [activeTab, patients]);

  const handleSavePatient = useCallback(
    async (data: PatientFormData) => {
      if (editingPatient) {
        await updateMutation.mutateAsync({ id: editingPatient.id, data });
        setEditingPatient(null);
      } else {
        await createMutation.mutateAsync(data);
      }
    },
    [editingPatient, createMutation, updateMutation]
  );

  const handleDeletePatient = (id: number) => {
    deleteMutation.mutate(id);
  };

  const handleExport = async () => {
    exportPatientsToExcel(patients);
  };

  const statusLabel = (status: PatientStatus) => statusMap[status].label;
  const statusVariant = (status: PatientStatus) => statusMap[status].variant;

  const satisfactionStars = (value: number) => {
    if (!value) return "—";
    return "★".repeat(Math.max(1, Math.min(5, Math.round(value))));
  };

  const columns: Column<Patient>[] = [
    {
      key: "name",
      header: "نام بیمار",
      render: (item) => `${item.firstName} ${item.lastName}`,
    },
    {
      key: "mobileNumber",
      header: "تلفن",
      width: "120px",
      render: (item) => toPersianDigits(item.mobileNumber),
    },
    {
      key: "satisfaction",
      header: "رضایت",
      align: "center",
      width: "80px",
      render: (item) => (
        <span
          className={`text-sm ${item.satisfaction >= 4 ? "text-success-500" : item.satisfaction >= 3 ? "text-warning-500" : "text-surface-400"}`}
        >
          {item.satisfaction ? satisfactionStars(item.satisfaction) : "—"}
        </span>
      ),
    },
    {
      key: "visitCount",
      header: "مراجعات",
      align: "center",
      width: "70px",
      render: (item) => new Intl.NumberFormat("fa-IR").format(item.visitCount),
    },
    {
      key: "totalPayments",
      header: "کل پرداختی",
      align: "end",
      width: "100px",
      render: (item) => (
        <span
          className={item.totalPayments > 0 ? "text-surface-900 font-medium" : "text-surface-400"}
        >
          {item.totalPayments > 0 ? `${formatPrice(item.totalPayments)} تومان` : "—"}
        </span>
      ),
    },
    {
      key: "lastVisit",
      header: "آخرین مراجعه",
      align: "center",
      width: "110px",
      render: (item) => (
        <span className={item.lastVisit ? "text-surface-700" : "text-surface-400"}>
          {formatJalaliDate(item.lastVisit)}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "عضویت",
      align: "center",
      width: "90px",
      render: (item) => (
        <span className={item.createdAt ? "text-surface-700" : "text-surface-400"}>
          {formatJalaliDate(item.createdAt)}
        </span>
      ),
    },
    {
      key: "status",
      header: "وضعیت",
      align: "center",
      width: "80px",
      render: (item) => (
        <Badge variant={statusVariant(item.status)} size="sm">
          {statusLabel(item.status)}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "عملیات",
      align: "center",
      width: "70px",
      render: (item) => (
        <Select
          align="start"
          trigger={
            <Button
              variant="ghost"
              size="sm"
              className="border-surface-200 hover:border-surface-300 hover:bg-surface-50 border"
              startIcon={<PiDotsThreeVertical className="size-4" />}
            />
          }
          items={[
            {
              label: "ویرایش",
              icon: <BiEdit className="size-4" />,
              onClick: () => {
                setEditingPatient(item);
                setModalOpen(true);
              },
            },
            { divider: true },
            {
              label: "حذف",
              icon: <BiTrash className="size-4" />,
              danger: true,
              onClick: () => handleDeletePatient(item.id),
            },
          ]}
        />
      ),
    },
  ];

  if (isError) {
    return (
      <div className="flex flex-col gap-6">
        <Alert variant="error" title="خطا در بارگذاری" dismissible onDismiss={() => {}}>
          <p>خطا در دریافت لیست بیماران.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
            تلاش مجدد
          </Button>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-surface-900 text-2xl font-bold" data-tour="pat-header">
            لیست بیماران
          </h1>
          <p className="text-surface-500 mt-1 text-sm">مدیریت بیماران کلینیک</p>
        </div>
        <div className="flex items-center gap-2" data-tour="pat-actions">
          <Button
            variant="outline"
            startIcon={<BiDownload className="size-4" />}
            onClick={handleExport}
          >
            خروجی
          </Button>
          <Button
            variant="primary"
            startIcon={<BiPlus className="size-5" />}
            onClick={() => {
              setEditingPatient(null);
              setModalOpen(true);
            }}
          >
            بیمار جدید
          </Button>
          <SearchButton />
        </div>
      </div>

      <Card variant="outlined" padding="none" data-tour="pat-table">
        <div className="p-4 pb-3" data-tour="pat-search">
          <Input
            placeholder="جستجوی نام، تلفن یا کد ملی..."
            startIcon={<BiSearch className="size-4" />}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div data-tour="pat-tabs">
          <Tabs
            tabs={tabsWithBadges}
            activeTab={activeTab}
            onChange={(id) => {
              setActiveTab(id);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="p-4">
          {isLoading ? (
            <Table columns={columns} data={[]} loading rowKey={() => ""} />
          ) : filteredPatients.length === 0 ? (
            <EmptyState
              icon={<MdOutlinePeople className="size-16" />}
              title={search ? "نتیجه‌ای یافت نشد" : "بیماری وجود ندارد"}
              description={
                search ? "با عبارت دیگری جستجو کنید." : "هنوز بیماری در این دسته ثبت نشده است."
              }
              action={
                <Button
                  variant="primary"
                  startIcon={<BiPlus className="size-5" />}
                  onClick={() => {
                    setEditingPatient(null);
                    setModalOpen(true);
                  }}
                >
                  ثبت بیمار جدید
                </Button>
              }
            />
          ) : (
            <div>
              <Table columns={columns} data={filteredPatients} rowKey={(item) => item.id} />
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                className="mt-4"
              />
            </div>
          )}
        </div>
      </Card>

      {modalOpen && (
        <PatientFormModal
          onClose={() => {
            setModalOpen(false);
            setEditingPatient(null);
          }}
          onSave={handleSavePatient}
          initialData={
            editingPatient
              ? {
                  firstName: editingPatient.firstName,
                  lastName: editingPatient.lastName,
                  mobileNumber: editingPatient.mobileNumber,
                  nationalId: editingPatient.nationalId,
                  bitmojiCode: editingPatient.bitmojiCode,
                  notes: editingPatient.notes,
                }
              : undefined
          }
          isPending={createMutation.isPending || updateMutation.isPending}
        />
      )}
    </div>
  );
}

export default Patients;
