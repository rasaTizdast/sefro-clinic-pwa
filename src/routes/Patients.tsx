import { useCallback, useEffect, useMemo, useState } from "react";
import { BiDownload, BiEdit, BiPlus, BiSearch, BiTrash } from "react-icons/bi";
import { MdPersonAdd } from "react-icons/md";
import { MdOutlinePeople } from "react-icons/md";
import { PiDotsThreeVertical } from "react-icons/pi";

import PatientFormModal from "../components/patients/PatientFormModal";
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
import { toPersianDigits } from "../lib/digits";
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

  const getActionItems = (patient: Patient) => [
    {
      label: "ویرایش",
      icon: <BiEdit className="size-4" />,
      onClick: () => {
        setEditingPatient(patient);
        setModalOpen(true);
      },
    },
    { divider: true },
    {
      label: "حذف",
      icon: <BiTrash className="size-4" />,
      danger: true,
      onClick: () => handleDeletePatient(patient.id),
    },
  ];

  const columns: Column<Patient>[] = [
    {
      key: "name",
      header: "نام بیمار",
      render: (item) => `${item.firstName} ${item.lastName}`,
    },
    {
      key: "mobileNumber",
      header: "تلفن",
      width: "130px",
      render: (item) => toPersianDigits(item.mobileNumber),
    },
    {
      key: "nationalId",
      header: "کد ملی",
      render: (item) => toPersianDigits(item.nationalId),
    },
    { key: "lastVisit", header: "آخرین مراجعه", align: "center", width: "130px" },
    {
      key: "visitCount",
      header: "تعداد مراجعات",
      align: "center",
      width: "90px",
      render: (item) => new Intl.NumberFormat("fa-IR").format(item.visitCount),
    },
    {
      key: "status",
      header: "وضعیت",
      align: "center",
      width: "90px",
      render: (item) => {
        const s = statusMap[item.status];
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
      align: "center",
      width: "80px",
      render: (item) => (
        <Select
          align="end"
          trigger={
            <Button
              variant="ghost"
              size="sm"
              className="border-surface-200 hover:border-surface-300 hover:bg-surface-50 border"
              startIcon={<PiDotsThreeVertical className="size-4" />}
            />
          }
          items={getActionItems(item)}
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
          <h1 className="text-surface-900 text-2xl font-bold">لیست بیماران</h1>
          <p className="text-surface-500 mt-1 text-sm">مدیریت بیماران کلینیک</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" startIcon={<BiDownload className="size-4" />}>
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

      <Card variant="outlined" padding="none">
        <div className="p-4 pb-3">
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

        <Tabs
          tabs={tabsWithBadges}
          activeTab={activeTab}
          onChange={(id) => {
            setActiveTab(id);
            setCurrentPage(1);
          }}
        />

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
            <>
              <Table columns={columns} data={filteredPatients} rowKey={(item) => item.id} />
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                className="mt-4"
              />
            </>
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
