import { useMemo, useState } from "react";
import { BiCheck, BiPlus, BiXCircle } from "react-icons/bi";
import { CiWallet } from "react-icons/ci";
import { IoSend } from "react-icons/io5";

import { useAllExpenseCategories, useAllExpenses, useExpenseAction } from "../../hooks/api";
import { usePermissions } from "../../hooks/usePermissions";
import { jalaliToGregorianISO } from "../../lib/date";
import { formatPrice } from "../../lib/format";
import { ALL_PER_PAGE } from "../../services/fetch-all-pages";
import type { Expense, ExpenseStatus } from "../../types/finance";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { EmptyState } from "../ui/EmptyState";
import { Input } from "../ui/Input";
import { JalaliDatePicker } from "../ui/JalaliDatePicker";
import { Pagination } from "../ui/Pagination";
import { Select } from "../ui/Select";
import { type Column, Table } from "../ui/Table";
import { Tooltip } from "../ui/Tooltip";
import { SummaryMetric } from "./FinanceSummary";
import { StaffExpenseFormModal } from "./StaffExpenseFormModal";

const PAGE_SIZE = ALL_PER_PAGE;

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * ISO day for the client-side date range; null while the input is empty or not a
 * full Jalali date. `ExpenseViewSet` takes no date params, so range filtering
 * happens here over the full claim log.
 */
function toIsoDay(value: string | null): string | null {
  if (!value) return null;
  const iso = jalaliToGregorianISO(value);
  return ISO_DAY.test(iso) ? iso : null;
}

const statusLabels: Record<ExpenseStatus, string> = {
  draft: "پیش‌نویس",
  submitted: "ارسال‌شده",
  approved: "تأیید‌شده",
  rejected: "رد‌شده",
  paid: "پرداخت‌شده",
  cancelled: "لغوشده",
};

const statusClasses: Record<ExpenseStatus, string> = {
  draft: "bg-surface-100 text-surface-600",
  submitted: "bg-info-50 text-info-700",
  approved: "bg-success-50 text-success-700",
  rejected: "bg-danger-50 text-danger-700",
  paid: "bg-success-100 text-success-800",
  cancelled: "bg-surface-100 text-surface-500",
};

const statusFilterOptions = [
  { value: "", label: "همه وضعیت‌ها" },
  ...(Object.keys(statusLabels) as ExpenseStatus[]).map((value) => ({
    value,
    label: statusLabels[value],
  })),
];

const orderingOptions = [
  { value: "-expense_date", label: "جدیدترین (تاریخ)" },
  { value: "expense_date", label: "قدیمی‌ترین (تاریخ)" },
  { value: "-amount_usd", label: "بیشترین مبلغ" },
  { value: "amount_usd", label: "کمترین مبلغ" },
];

/** Statuses that reduce net profit — the backend only counts approved + paid. */
const COUNTED_STATUSES: ExpenseStatus[] = ["approved", "paid"];

function StatusBadge({ status }: { status: ExpenseStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusClasses[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}

/**
 * Staff expense claims (مطالبات پرسنل) — money staff spend on the clinic's behalf.
 * Distinct from the clinic's own running costs in «هزینه‌های جاری»: the backend
 * keeps them apart and analytics shows both lines before net profit.
 *
 * Status/category/search/ordering are server filters; the Jalali date range runs
 * client-side because the API has no date params for claims.
 */
export function StaffExpensesTab() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [ordering, setOrdering] = useState("-expense_date");
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [pendingId, setPendingId] = useState<number | null>(null);

  const { canManageFinance } = usePermissions();

  const { data: categoriesData } = useAllExpenseCategories();
  const filters = {
    ...(status ? { status: status as ExpenseStatus } : {}),
    ...(category ? { category: Number(category) } : {}),
    ...(search.trim() ? { search: search.trim() } : {}),
    ...(ordering ? { ordering } : {}),
  };

  // The list endpoint has no period/aggregate of its own, so every view (totals
  // and table) is derived from the full claim log filtered here.
  const { data: allClaims, isLoading } = useAllExpenses(filters);
  const action = useExpenseAction();

  const categories = categoriesData ?? [];

  const fromDay = toIsoDay(dateFrom);
  const toDay = toIsoDay(dateTo);

  const filtered = useMemo(() => {
    return (allClaims ?? []).filter((row) => {
      const day = row.expenseDate.slice(0, 10);
      if (fromDay && day < fromDay) return false;
      if (toDay && day > toDay) return false;
      return true;
    });
  }, [allClaims, fromDay, toDay]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  // The page can point past the end after a filter change or a refetch with fewer rows.
  const currentPage = Math.min(page, totalPages);
  const claims = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage]
  );

  const totals = useMemo(() => {
    const rows = filtered;
    const counted = rows.filter((row) => COUNTED_STATUSES.includes(row.status));
    const pending = rows.filter((row) => row.status === "submitted");
    return {
      count: rows.length,
      countedCount: counted.length,
      countedToman: counted.reduce((sum, row) => sum + Number(row.amountToman), 0),
      countedUsd: counted.reduce((sum, row) => sum + Number(row.amountUsd), 0),
      pendingCount: pending.length,
    };
  }, [filtered]);

  const hasActiveFilters = Boolean(status || category || search.trim() || dateFrom || dateTo);
  const clearFilters = () => {
    setStatus("");
    setCategory("");
    setSearch("");
    setDateFrom(null);
    setDateTo(null);
    setPage(1);
  };

  const runAction = async (id: number, act: "submit" | "approve" | "reject" | "pay") => {
    setPendingId(id);
    try {
      await action.mutateAsync({ id, action: act });
    } finally {
      setPendingId(null);
    }
  };

  const columns: Column<Expense>[] = [
    {
      key: "expenseDate",
      header: "تاریخ",
      render: (item) => <span className="text-surface-700 text-sm">{item.expenseDate}</span>,
    },
    {
      key: "categoryName",
      header: "دسته‌بندی",
      render: (item) => (
        <span className="text-surface-900 text-sm font-medium">{item.categoryName ?? "—"}</span>
      ),
    },
    {
      key: "description",
      header: "شرح",
      render: (item) => (
        <span className="flex flex-col">
          <span className="text-surface-700 text-sm">{item.description || "—"}</span>
          {item.vendor && <span className="text-surface-400 text-xs">{item.vendor}</span>}
        </span>
      ),
    },
    {
      key: "createdByName",
      header: "ثبت‌کننده",
      render: (item) => (
        <span className="text-surface-600 text-sm">{item.createdByName ?? "—"}</span>
      ),
    },
    {
      key: "amountToman",
      header: "مبلغ",
      align: "center",
      render: (item) => (
        <span className="flex flex-col">
          <span className="text-surface-900 text-sm font-semibold">
            {formatPrice(Number(item.amountToman))} تومان
          </span>
          <span className="text-surface-400 text-xs" dir="ltr">
            ${Number(item.amountUsd).toFixed(2)}
          </span>
        </span>
      ),
    },
    {
      key: "status",
      header: "وضعیت",
      align: "center",
      render: (item) => <StatusBadge status={item.status} />,
    },
    {
      key: "actions",
      header: "عملیات",
      align: "center",
      width: "120px",
      render: (item) => {
        const busy = pendingId === item.id || action.isPending;
        if (item.status === "draft") {
          return (
            <Tooltip content="ارسال برای تأیید" side="top">
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                aria-label={`ارسال مطالبه ${item.id}`}
                disabled={busy}
                onClick={() => runAction(item.id, "submit")}
              >
                <IoSend className="size-4" />
              </Button>
            </Tooltip>
          );
        }
        if (item.status === "submitted" && canManageFinance) {
          return (
            <div className="flex justify-center gap-1.5">
              <Tooltip content="تأیید" side="top">
                <Button
                  variant="ghost"
                  size="sm"
                  iconOnly
                  aria-label={`تأیید مطالبه ${item.id}`}
                  disabled={busy}
                  onClick={() => runAction(item.id, "approve")}
                >
                  <BiCheck className="text-success-600 size-4" />
                </Button>
              </Tooltip>
              <Tooltip content="رد" side="top">
                <Button
                  variant="ghost"
                  size="sm"
                  iconOnly
                  aria-label={`رد مطالبه ${item.id}`}
                  disabled={busy}
                  onClick={() => runAction(item.id, "reject")}
                >
                  <BiXCircle className="text-danger-600 size-4" />
                </Button>
              </Tooltip>
            </div>
          );
        }
        if (item.status === "approved" && canManageFinance) {
          return (
            <Tooltip content="ثبت پرداخت" side="top">
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                aria-label={`پرداخت مطالبه ${item.id}`}
                disabled={busy}
                onClick={() => runAction(item.id, "pay")}
              >
                <CiWallet className="text-primary-600 size-4" />
              </Button>
            </Tooltip>
          );
        }
        return <span className="text-surface-300">—</span>;
      },
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Card variant="outlined" padding="lg">
        <div className="flex flex-col gap-1">
          <p className="text-surface-500 text-sm">جمع مطالبات تأیید/پرداخت‌شده (کاهش سود خالص)</p>
          <p className="text-surface-900 text-2xl font-bold">
            {formatPrice(totals.countedToman)} تومان
          </p>
          <p className="text-surface-400 text-sm" dir="ltr">
            ${totals.countedUsd.toFixed(2)}
          </p>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryMetric label="کل مطالبات" value={formatPrice(totals.count)} />
          <SummaryMetric
            label="مؤثر بر سود"
            value={formatPrice(totals.countedCount)}
            hint="تأیید یا پرداخت‌شده"
          />
          <SummaryMetric
            label="در انتظار تأیید"
            value={formatPrice(totals.pendingCount)}
            hint={totals.pendingCount > 0 ? "نیاز به بررسی مدیر" : undefined}
          />
          <SummaryMetric
            label="میانگین هر مطالبه"
            value={
              totals.countedCount > 0
                ? formatPrice(Math.round(totals.countedToman / totals.countedCount))
                : "—"
            }
            hint="تومان"
          />
        </div>
      </Card>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-surface-900 text-base font-semibold">لیست مطالبات</h3>
          <p className="text-surface-400 text-xs">
            {`${formatPrice(filtered.length)} ردیف`} بر اساس فیلترهای زیر
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              حذف فیلترها
            </Button>
          )}
          <Button
            variant="primary"
            startIcon={<BiPlus className="size-5" />}
            onClick={() => setFormOpen(true)}
          >
            مطالبه جدید
          </Button>
        </div>
      </div>

      <Card variant="outlined" padding="lg">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            label="جستجو"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="شرح یا فروشنده"
          />
          <Select
            label="وضعیت"
            options={statusFilterOptions}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          />
          <Select
            label="دسته‌بندی"
            options={[
              { value: "", label: "همه دسته‌ها" },
              ...categories.map((c) => ({ value: String(c.id), label: c.name })),
            ]}
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
          />
          <Select
            label="ترتیب"
            options={orderingOptions}
            value={ordering}
            onChange={(e) => {
              setOrdering(e.target.value);
              setPage(1);
            }}
          />
          <JalaliDatePicker
            label="از تاریخ"
            value={dateFrom}
            onChange={(value) => {
              setDateFrom(value);
              setPage(1);
            }}
          />
          <JalaliDatePicker
            label="تا تاریخ"
            value={dateTo}
            onChange={(value) => {
              setDateTo(value);
              setPage(1);
            }}
          />
        </div>
      </Card>

      {isLoading ? (
        <Card variant="outlined" padding="none">
          <EmptyState title="در حال بارگذاری..." />
        </Card>
      ) : filtered.length === 0 ? (
        <Card variant="outlined" padding="none">
          <EmptyState
            title="مطالبه‌ای ثبت نشده است"
            description="هزینه‌ای که پرسنل برای کلینیک پرداخت کرده‌اند را اینجا ثبت کنید تا پس از تأیید از سود خالص کم شود."
          />
        </Card>
      ) : (
        <Card variant="outlined" padding="none">
          <Table columns={columns} data={claims} rowKey={(item) => item.id} />
        </Card>
      )}

      {totalPages > 1 && (
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />
      )}

      <StaffExpenseFormModal open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  );
}
