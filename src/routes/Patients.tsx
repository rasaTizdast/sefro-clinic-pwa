import { useEffect, useMemo, useState } from "react";
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
import type { DropdownItem } from "../components/ui/Dropdown";
import { Dropdown } from "../components/ui/Dropdown";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { Pagination } from "../components/ui/Pagination";
import { type Column, Table } from "../components/ui/Table";
import type { Tab } from "../components/ui/Tabs";
import { Tabs } from "../components/ui/Tabs";
import { useQuickActions } from "../hooks/useQuickActions";
import { normalizeSearch, toPersianDigits } from "../lib/digits";
import type { Patient, PatientStatus } from "../types/patient";

type StatusVariant = "success" | "warning" | "info";

const statusMap: Record<PatientStatus, { label: string; variant: StatusVariant }> = {
  active: { label: "فعال", variant: "success" },
  inactive: { label: "غیرفعال", variant: "warning" },
  new: { label: "جدید", variant: "info" },
};

const filterTabs: Tab[] = [
  { id: "all", label: "همه" },
  { id: "active", label: "فعال" },
  { id: "inactive", label: "غیرفعال" },
  { id: "new", label: "جدید" },
];

const PAGE_SIZE = 10;

const mockPatients: Patient[] = [
  {
    id: 1,
    firstName: "علی",
    lastName: "رضایی",
    phone: "09123456789",
    nationalId: "0012345678",
    bitmojiId: "",
    lastVisit: "۱۴۰۵/۰۳/۰۳",
    visitCount: 24,
    status: "active",
    createdAt: "۱۴۰۴/۱۰/۰۱",
    products: [],
    services: [],
  },
  {
    id: 2,
    firstName: "سارا",
    lastName: "احمدی",
    phone: "09198765432",
    nationalId: "0029876543",
    bitmojiId: "",
    lastVisit: "۱۴۰۵/۰۳/۰۳",
    visitCount: 8,
    status: "new",
    createdAt: "۱۴۰۵/۰۲/۲۸",
    products: [],
    services: [],
  },
  {
    id: 3,
    firstName: "رضا",
    lastName: "کریمی",
    phone: "0933557788",
    nationalId: "0033557788",
    bitmojiId: "",
    lastVisit: "۱۴۰۵/۰۲/۲۸",
    visitCount: 56,
    status: "active",
    createdAt: "۱۴۰۳/۰۶/۱۵",
    products: [],
    services: [],
  },
  {
    id: 4,
    firstName: "مریم",
    lastName: "نوروزی",
    phone: "0912223344",
    nationalId: "0042223344",
    bitmojiId: "",
    lastVisit: "۱۴۰۵/۰۲/۱۵",
    visitCount: 3,
    status: "inactive",
    createdAt: "۱۴۰۵/۰۱/۱۰",
    products: [],
    services: [],
  },
  {
    id: 5,
    firstName: "امیر",
    lastName: "عباسی",
    phone: "0901887766",
    nationalId: "0051887766",
    bitmojiId: "",
    lastVisit: "۱۴۰۵/۰۳/۰۱",
    visitCount: 18,
    status: "active",
    createdAt: "۱۴۰۴/۰۲/۰۵",
    products: [],
    services: [],
  },
  {
    id: 6,
    firstName: "نگین",
    lastName: "صادقی",
    phone: "0936644321",
    nationalId: "0066644321",
    bitmojiId: "",
    lastVisit: "۱۴۰۵/۰۲/۲۰",
    visitCount: 12,
    status: "new",
    createdAt: "۱۴۰۵/۰۲/۱۰",
    products: [],
    services: [],
  },
  {
    id: 7,
    firstName: "محمد",
    lastName: "حسینی",
    phone: "0914455667",
    nationalId: "0074455667",
    bitmojiId: "",
    lastVisit: "۱۴۰۵/۰۱/۱۵",
    visitCount: 42,
    status: "active",
    createdAt: "۱۴۰۲/۰۸/۲۰",
    products: [],
    services: [],
  },
  {
    id: 8,
    firstName: "زهرا",
    lastName: "محمدی",
    phone: "0912778899",
    nationalId: "0082778899",
    bitmojiId: "",
    lastVisit: "۱۴۰۴/۱۲/۲۰",
    visitCount: 1,
    status: "inactive",
    createdAt: "۱۴۰۴/۱۲/۱۰",
    products: [],
    services: [],
  },
  {
    id: 9,
    firstName: "حسین",
    lastName: "رستمی",
    phone: "0930112233",
    nationalId: "0090112233",
    bitmojiId: "",
    lastVisit: "۱۴۰۵/۰۲/۰۵",
    visitCount: 31,
    status: "active",
    createdAt: "۱۴۰۳/۱۲/۰۱",
    products: [],
    services: [],
  },
  {
    id: 10,
    firstName: "فاطمه",
    lastName: "موسوی",
    phone: "09188990011",
    nationalId: "01088990011",
    bitmojiId: "",
    lastVisit: "۱۴۰۴/۱۱/۲۸",
    visitCount: 15,
    status: "active",
    createdAt: "۱۴۰۴/۰۵/۱۵",
    products: [],
    services: [],
  },
  {
    id: 11,
    firstName: "احمد",
    lastName: "کرمی",
    phone: "0903344556",
    nationalId: "0113344556",
    bitmojiId: "",
    lastVisit: "۱۴۰۴/۱۰/۰۸",
    visitCount: 6,
    status: "inactive",
    createdAt: "۱۴۰۴/۰۹/۲۰",
    products: [],
    services: [],
  },
  {
    id: 12,
    firstName: "لیلا",
    lastName: "حیدری",
    phone: "0935566778",
    nationalId: "0125566778",
    bitmojiId: "",
    lastVisit: "۱۴۰۵/۰۳/۰۲",
    visitCount: 4,
    status: "new",
    createdAt: "۱۴۰۵/۰۲/۲۵",
    products: [],
    services: [],
  },
];

function Patients() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [patients, setPatients] = useState<Patient[]>(mockPatients);
  const { registerAction } = useQuickActions();

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const unregister = registerAction({
      id: "newPatient",
      label: "بیمار جدید",
      icon: <MdPersonAdd />,
      perform: () => setModalOpen(true),
    });
    return unregister;
  }, [registerAction]);

  const filteredPatients = useMemo(() => {
    let result = [...patients];

    if (activeTab === "active") {
      result = result.filter((p) => p.status === "active");
    } else if (activeTab === "inactive") {
      result = result.filter((p) => p.status === "inactive");
    } else if (activeTab === "new") {
      result = result.filter((p) => p.status === "new");
    }

    if (search.trim()) {
      const q = normalizeSearch(search);
      result = result.filter(
        (p) =>
          normalizeSearch(p.firstName).includes(q) ||
          normalizeSearch(p.lastName).includes(q) ||
          normalizeSearch(p.phone).includes(q) ||
          normalizeSearch(p.nationalId).includes(q)
      );
    }

    return result;
  }, [activeTab, search, patients]);

  const totalPages = Math.max(1, Math.ceil(filteredPatients.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageData = filteredPatients.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

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

  const handleAddPatient = (patient: Patient) => {
    setPatients((prev) => [patient, ...prev]);
    setModalOpen(false);
  };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    setTimeout(() => setLoading(false), 800);
  };

  const getActionItems = (): DropdownItem[] => [
    {
      label: "ویرایش",
      icon: <BiEdit className="size-4" />,
      onClick: () => {},
    },
    { divider: true },
    {
      label: "حذف",
      icon: <BiTrash className="size-4" />,
      danger: true,
      onClick: () => {},
    },
  ];

  const columns: Column<Patient>[] = [
    {
      key: "name",
      header: "نام بیمار",
      render: (item) => `${item.firstName} ${item.lastName}`,
    },
    {
      key: "phone",
      header: "تلفن",
      width: "130px",
      render: (item) => toPersianDigits(item.phone),
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
      key: "products",
      header: "محصولات",
      align: "center",
      width: "80px",
      render: (item) => item.products.length,
    },
    {
      key: "services",
      header: "خدمات",
      align: "center",
      width: "80px",
      render: (item) => item.services.length,
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
      render: () => (
        <Dropdown
          align="end"
          trigger={
            <Button
              variant="ghost"
              size="sm"
              className="border-surface-200 hover:border-surface-300 hover:bg-surface-50 border"
              startIcon={<PiDotsThreeVertical className="size-4" />}
            />
          }
          items={getActionItems()}
        />
      ),
    },
  ];

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <Alert variant="error" title="خطا در بارگذاری" dismissible onDismiss={() => setError(null)}>
          <p>{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={handleRetry}>
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
            onClick={() => setModalOpen(true)}
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
          {loading ? (
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
                  onClick={() => setModalOpen(true)}
                >
                  ثبت بیمار جدید
                </Button>
              }
            />
          ) : (
            <>
              <Table columns={columns} data={pageData} rowKey={(item) => item.id} />
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
        <PatientFormModal onClose={() => setModalOpen(false)} onSuccess={handleAddPatient} />
      )}
    </div>
  );
}

export default Patients;
