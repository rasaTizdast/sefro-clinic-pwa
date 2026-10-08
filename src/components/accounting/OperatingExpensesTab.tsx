import { useMemo, useState } from "react";
import { BiPlus, BiTrash } from "react-icons/bi";
import { CiMoneyBill } from "react-icons/ci";
import { FiEdit2 } from "react-icons/fi";

import {
  useAllOperatingExpenseCategories,
  useDeleteOperatingExpense,
  useOperatingExpensesList,
  useOperatingExpenseSummary,
} from "../../hooks/api";
import { usePermissions } from "../../hooks/usePermissions";
import { formatJalaliDate, jalaliToGregorianISO } from "../../lib/date";
import { formatPrice } from "../../lib/format";
import { REPORT_PERIOD_OPTIONS, reportPeriodLabel } from "../../lib/report-period";
import type {
  OperatingExpense,
  OperatingExpensePaymentMethod,
  ReportPeriod,
} from "../../types/finance";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { EmptyState } from "../ui/EmptyState";
import { Input } from "../ui/Input";
import { JalaliDatePicker } from "../ui/JalaliDatePicker";
import { Modal } from "../ui/Modal";
import { Pagination } from "../ui/Pagination";
import { Select } from "../ui/Select";
import { type Column, Table } from "../ui/Table";
import { Tooltip } from "../ui/Tooltip";
import { FinanceContext, SummaryMetric } from "./FinanceSummary";
import { OperatingExpenseCategoryModal } from "./OperatingExpenseCategoryModal";
import { OperatingExpenseFormModal } from "./OperatingExpenseFormModal";

const PAGE_SIZE = 20;

const paymentMethodLabels: Record<OperatingExpensePaymentMethod, string> = {
  cash: "نقدی",
  card: "کارت",
  bank_transfer: "انتقال بانکی",
  other: "سایر",
};

const paymentMethodFilterOptions = [
  { value: "", label: "همه روش‌ها" },
  { value: "cash", label: "نقدی" },
  { value: "card", label: "کارت" },
  { value: "bank_transfer", label: "انتقال بانکی" },
  { value: "other", label: "سایر" },
];

const orderingOptions = [
  { value: "-expense_date", label: "جدیدترین (تاریخ)" },
  { value: "expense_date", label: "قدیمی‌ترین (تاریخ)" },
  { value: "-amount_usd", label: "بیشترین مبلغ" },
  { value: "amount_usd", label: "کمترین مبلغ" },
  { value: "-created_at", label: "آخرین ثبت" },
  { value: "created_at", label: "اولین ثبت" },
];

export function OperatingExpensesTab() {
  const [period, setPeriod] = useState<ReportPeriod>("this_month");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [ordering, setOrdering] = useState("-expense_date");

  const [formOpen, setFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<OperatingExpense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<OperatingExpense | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  const { canManageFinance } = usePermissions();

  const { data: categoriesData } = useAllOperatingExpenseCategories();

  const { data: paginated, isLoading } = useOperatingExpensesList({
    page,
    perPage: PAGE_SIZE,
    ordering: ordering as NonNullable<Parameters<typeof useOperatingExpensesList>[0]>["ordering"],
    ...(search.trim() ? { search: search.trim() } : {}),
    ...(category ? { category: Number(category) } : {}),
    ...(paymentMethod ? { paymentMethod: paymentMethod as OperatingExpensePaymentMethod } : {}),
    ...(dateFrom ? { dateFrom: jalaliToGregorianISO(dateFrom) } : {}),
    ...(dateTo ? { dateTo: jalaliToGregorianISO(dateTo) } : {}),
  });

  const { data: summary } = useOperatingExpenseSummary({ period });

  const deleteExpense = useDeleteOperatingExpense();

  const expenses = paginated?.data ?? [];
  const totalPages = paginated?.totalPages ?? 1;
  const categories = categoriesData ?? [];
  const periodText = reportPeriodLabel(period);

  const topCategory = useMemo(
    () => summary?.byCategory?.slice().sort((a, b) => b.count - a.count)[0],
    [summary?.byCategory]
  );

  const topPaymentMethod = useMemo(
    () =>
      summary?.byPaymentMethod?.slice().sort((a, b) => Number(b.totalUsd) - Number(a.totalUsd))[0],
    [summary?.byPaymentMethod]
  );

  const averageToman = useMemo(() => {
    if (!summary || summary.count <= 0) return 0;
    return Math.round(Number(summary.totalToman) / summary.count);
  }, [summary]);

  const hasActiveFilters = Boolean(search || category || paymentMethod || dateFrom || dateTo);

  const clearFilters = () => {
    setSearch("");
    setCategory("");
    setPaymentMethod("");
    setDateFrom(null);
    setDateTo(null);
    setPage(1);
  };

  const columns: Column<OperatingExpense>[] = [
    {
      key: "title",
      header: "عنوان",
      render: (item) => (
        <span className="flex flex-col">
          <span className="text-surface-900 font-medium">{item.title}</span>
          {item.vendor && <span className="text-surface-400 text-xs">{item.vendor}</span>}
        </span>
      ),
    },
    {
      key: "category",
      header: "دسته‌بندی",
      render: (item) => <span>{item.categoryName ?? "—"}</span>,
    },
    {
      key: "paymentMethod",
      header: "روش پرداخت",
      align: "center",
      width: "120px",
      render: (item) => <span>{paymentMethodLabels[item.paymentMethod]}</span>,
    },
    {
      key: "expenseDate",
      header: "تاریخ",
      align: "center",
      width: "110px",
      render: (item) => <span>{formatJalaliDate(item.expenseDate)}</span>,
    },
    {
      key: "amount",
      header: "مبلغ",
      align: "end",
      render: (item) => (
        <span>
          <span className="text-surface-900 font-medium">
            {formatPrice(Number(item.amountToman))} تومان
          </span>{" "}
          <span className="text-surface-400 text-xs">${item.amountUsd}</span>
        </span>
      ),
    },
    {
      key: "createdBy",
      header: "ثبت‌کننده",
      align: "center",
      width: "110px",
      render: (item) => <span>{item.createdByName ?? "—"}</span>,
    },
    {
      key: "receipt",
      header: "رسید",
      align: "center",
      width: "80px",
      render: (item) =>
        item.receipt ? (
          <a
            href={item.receipt}
            target="_blank"
            rel="noreferrer"
            className="text-primary-600 hover:underline"
          >
            مشاهده
          </a>
        ) : (
          <span className="text-surface-300">—</span>
        ),
    },
    ...(canManageFinance
      ? [
          {
            key: "actions",
            header: "عملیات",
            align: "center" as const,
            width: "90px",
            render: (item: OperatingExpense) => (
              <div className="flex justify-center gap-1.5">
                <Tooltip content="ویرایش" side="top">
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    aria-label={`ویرایش هزینه ${item.title}`}
                    onClick={() => setEditingExpense(item)}
                  >
                    <FiEdit2 className="size-4" />
                  </Button>
                </Tooltip>
                <Tooltip content="حذف" side="top">
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    aria-label={`حذف هزینه ${item.title}`}
                    onClick={() => setDeletingExpense(item)}
                  >
                    <BiTrash className="text-danger-600 size-4" />
                  </Button>
                </Tooltip>
              </div>
            ),
          },
        ]
      : []),
  ];

  const openCreate = () => {
    setEditingExpense(null);
    setFormOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingExpense) return;
    await deleteExpense.mutateAsync(deletingExpense.id);
    setDeletingExpense(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <Card variant="outlined" padding="none" className="overflow-hidden">
        <div className="flex flex-col gap-5 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-surface-500 text-sm">جمع تومان ({periodText})</p>
              <p className="text-surface-900 mt-1 text-3xl font-bold">
                {summary ? `${formatPrice(Number(summary.totalToman))} تومان` : "—"}
              </p>
              <p className="text-surface-400 mt-1 text-sm" dir="ltr">
                {summary ? `$${summary.totalUsd}` : "—"}
              </p>
            </div>
            <div className="w-full sm:w-52">
              <Select
                label="بازه زمانی"
                options={REPORT_PERIOD_OPTIONS}
                value={period}
                onChange={(e) => setPeriod(e.target.value as ReportPeriod)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryMetric
              label="تعداد هزینه‌ها"
              value={summary ? String(summary.count) : "—"}
              hint={`در ${periodText}`}
            />
            <SummaryMetric
              label="بیشترین دسته‌بندی"
              value={topCategory ? `${topCategory.categoryName} (${topCategory.count})` : "—"}
            />
            <SummaryMetric
              label="غالب‌ترین روش پرداخت"
              value={topPaymentMethod ? paymentMethodLabels[topPaymentMethod.paymentMethod] : "—"}
              hint={topPaymentMethod ? `${topPaymentMethod.count} ردیف` : undefined}
            />
            <SummaryMetric
              label="میانگین هر هزینه"
              value={summary && summary.count > 0 ? formatPrice(averageToman) : "—"}
              hint="تومان"
            />
          </div>
        </div>

        <FinanceContext
          period={period}
          primaryLabel="هزینه‌های جاری"
          primaryToman={Number(summary?.totalToman ?? 0)}
          tone="danger"
        />
      </Card>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-surface-900 text-base font-semibold">لیست هزینه‌ها</h3>
          <p className="text-surface-400 text-xs">
            {paginated ? `${formatPrice(paginated.total)} ردیف` : "—"} بر اساس فیلترهای زیر
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              حذف فیلترها
            </Button>
          )}
          <Button variant="outline" onClick={() => setCategoriesOpen(true)}>
            دسته‌بندی‌ها
          </Button>
          <Button variant="primary" startIcon={<BiPlus className="size-5" />} onClick={openCreate}>
            هزینه جدید
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Input
          label="جستجو"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
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
          label="روش پرداخت"
          options={paymentMethodFilterOptions}
          value={paymentMethod}
          onChange={(e) => {
            setPaymentMethod(e.target.value);
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
        <Select
          label="ترتیب"
          options={orderingOptions}
          value={ordering}
          onChange={(e) => {
            setOrdering(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <Card variant="outlined" padding="none">
        <Table
          columns={columns}
          data={expenses}
          rowKey={(item) => item.id}
          loading={isLoading}
          emptyMessage="هزینه جاری‌ای ثبت نشده است"
          className="rounded-none border-0"
          caption="لیست هزینه‌های جاری"
        />
        {totalPages > 1 && (
          <div className="border-surface-200 flex items-center justify-center border-t px-5 py-4">
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </Card>

      {!isLoading && expenses.length === 0 && !search && !category && !paymentMethod && (
        <EmptyState
          icon={<CiMoneyBill className="size-16" />}
          title="هزینه جاری‌ای ثبت نشده است"
          description="هزینه‌های مستقیم کلینیک مانند اجاره و قبوض را اینجا ثبت کنید."
          action={
            <Button
              variant="primary"
              startIcon={<BiPlus className="size-5" />}
              onClick={openCreate}
            >
              ثبت اولین هزینه
            </Button>
          }
        />
      )}

      {formOpen && (
        <OperatingExpenseFormModal
          open
          onClose={() => setFormOpen(false)}
          categories={categories}
          expense={editingExpense}
        />
      )}

      <OperatingExpenseCategoryModal
        open={categoriesOpen}
        onClose={() => setCategoriesOpen(false)}
      />

      {deletingExpense && (
        <Modal
          open
          onClose={() => setDeletingExpense(null)}
          title="حذف هزینه"
          size="sm"
          footer={
            <>
              <Button variant="outline" onClick={() => setDeletingExpense(null)}>
                انصراف
              </Button>
              <Button variant="danger" onClick={confirmDelete} disabled={deleteExpense.isPending}>
                حذف
              </Button>
            </>
          }
        >
          <p className="text-surface-700 text-sm">
            آیا از حذف «{deletingExpense.title}» مطمئن هستید؟ این عمل قابل بازگشت نیست.
          </p>
        </Modal>
      )}
    </div>
  );
}
