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
import {
  useAllCustomers,
  useAllPayments,
  useAllVisits,
  useCreateCustomer,
  useDeleteCustomer,
  useUpdateCustomer,
} from "../hooks/api";
import { useQuickActions } from "../hooks/useQuickActions";
import { useRateValue } from "../hooks/useRateValue";
import { formatUsd, tomanToUsd } from "../lib/currency";
import { formatJalaliDate } from "../lib/date";
import { toLatinDigits, toPersianDigits } from "../lib/digits";
import { exportPatientsToExcel } from "../lib/excel";
import { formatPrice, parseTomanAmount } from "../lib/format";
import { ALL_PER_PAGE } from "../services/fetch-all-pages";
import type { PaymentRow } from "../services/payments";
import type { Patient, PatientFormData, PatientStatus } from "../types/patient";

type StatusVariant = "success" | "warning" | "info";

const statusMap: Record<PatientStatus, { label: string; variant: StatusVariant }> = {
  active: { label: "فعال", variant: "success" },
  inactive: { label: "غیرفعال", variant: "warning" },
  new: { label: "جدید", variant: "info" },
  loyal: { label: "وفادار", variant: "success" },
};

const PAGE_SIZE = ALL_PER_PAGE;

function Patients() {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const { registerAction } = useQuickActions();

  const { data: allPatients, isLoading, isError, refetch } = useAllCustomers();
  const { data: allPayments } = useAllPayments();
  const { data: allVisits } = useAllVisits();
  const rate = useRateValue();

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

  const patients = useMemo(() => allPatients ?? [], [allPatients]);

  const filteredPatients = useMemo(() => {
    if (!search.trim()) return patients;
    const searchLower = search.trim().toLowerCase();
    return patients.filter(
      (p) =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchLower) ||
        p.mobileNumber.includes(search.trim()) ||
        p.nationalId.includes(search.trim()) ||
        (p.fileSysId ?? "").includes(search.trim())
    );
  }, [patients, search]);

  const lastPaymentMap = useMemo(() => {
    const map = new Map<number, PaymentRow>();
    for (const payment of allPayments ?? []) {
      if (!payment.customer || !payment.paidAt) continue;
      const existing = map.get(payment.customer);
      if (!existing || !existing.paidAt || payment.paidAt > existing.paidAt) {
        map.set(payment.customer, payment);
      }
    }
    return map;
  }, [allPayments]);

  /** Earliest booked visit per patient — «عضویت» shows when they first came in. */
  const firstVisitMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const visit of allVisits ?? []) {
      if (!visit.customer || !visit.date) continue;
      const current = map.get(visit.customer);
      if (!current || visit.date < current) map.set(visit.customer, visit.date);
    }
    return map;
  }, [allVisits]);

  const totalPages = Math.max(1, Math.ceil(filteredPatients.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedPatients = filteredPatients.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

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
      render: (item) => {
        if (!(item.totalPayments > 0)) return <span className="text-surface-400">—</span>;
        const usd = tomanToUsd(item.totalPayments, rate);
        return (
          <span className="text-surface-900 font-medium">
            {`${formatPrice(item.totalPayments)} تومان`}
            {usd != null && (
              <span className="text-info-700 block text-xs font-normal">{formatUsd(usd)}</span>
            )}
          </span>
        );
      },
    },
    {
      key: "birthday",
      header: "تاریخ تولد",
      align: "center",
      width: "110px",
      render: (item) => (
        <span className={item.birthday ? "text-surface-700" : "text-surface-400"}>
          {item.birthday ? toPersianDigits(formatJalaliDate(item.birthday)) : "—"}
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
          {item.lastVisit ? toPersianDigits(formatJalaliDate(item.lastVisit)) : "—"}
        </span>
      ),
    },
    {
      key: "lastPayment",
      header: "مبلغ آخرین پرداخت",
      align: "end",
      width: "150px",
      render: (item) => {
        const payment = lastPaymentMap.get(item.id);
        if (!payment) return <span className="text-surface-400">—</span>;
        const toman = parseTomanAmount(payment.amount);
        const usd = Number(toLatinDigits(payment.amountUsd || "0")) || 0;
        return (
          <span className="text-surface-900 font-medium" title={payment.paymentMethod}>
            {toman > 0 ? `${formatPrice(toman)} تومان` : "—"}
            {usd > 0 && (
              <span className="text-info-700 block text-xs font-normal">{formatUsd(usd)}</span>
            )}
          </span>
        );
      },
    },
    {
      key: "firstVisit",
      header: "عضویت",
      align: "center",
      width: "90px",
      render: (item) => {
        // First booked visit (the day they actually came in); record-creation
        // date is only the fallback for patients who have never visited.
        const first = firstVisitMap.get(item.id) ?? item.createdAt;
        return (
          <span className={first ? "text-surface-700" : "text-surface-400"}>
            {first ? toPersianDigits(formatJalaliDate(first)) : "—"}
          </span>
        );
      },
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
            placeholder="جستجوی نام، تلفن، کد ملی یا شماره پرونده..."
            startIcon={<BiSearch className="size-4" />}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
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
                  data-tour="pat-empty-add"
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
              <Table columns={columns} data={paginatedPatients} rowKey={(item) => item.id} />
              <Pagination
                currentPage={safePage}
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
                  birthday: (editingPatient.birthday ?? "").replace(/-/g, "/"),
                  fileSysId: editingPatient.fileSysId ?? "",
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
