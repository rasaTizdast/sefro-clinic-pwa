import { useMemo, useState } from "react";
import { BiPlus, BiTrash } from "react-icons/bi";
import { CiMoneyBill } from "react-icons/ci";
import { FiEdit2 } from "react-icons/fi";

import {
  useDeleteOperatingExpense,
  useOperatingExpenseCategories,
  useOperatingExpensesList,
  useOperatingExpenseSummary,
} from "../../hooks/api";
import { usePermissions } from "../../hooks/usePermissions";
import { formatJalaliDate, jalaliToGregorianISO } from "../../lib/date";
import { formatPrice } from "../../lib/format";
import type { OperatingExpense, OperatingExpensePaymentMethod } from "../../types/finance";
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

  const { data: categoriesData } = useOperatingExpenseCategories({ perPage: 100 });

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

  const { data: summary } = useOperatingExpenseSummary({ period: "this_month" });

  const deleteExpense = useDeleteOperatingExpense();

  const expenses = paginated?.data ?? [];
  const totalPages = paginated?.totalPages ?? 1;
  const categories = categoriesData?.data ?? [];

  const topCategory = useMemo(
    () => summary?.byCategory?.slice().sort((a, b) => b.count - a.count)[0],
    [summary?.byCategory]
  );

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
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card variant="outlined" padding="sm">
          <p className="text-surface-400 text-xs">جمع تومان (این ماه)</p>
          <p className="text-surface-900 text-lg font-bold">
            {summary ? `${formatPrice(Number(summary.totalToman))} تومان` : "—"}
          </p>
        </Card>
        <Card variant="outlined" padding="sm">
          <p className="text-surface-400 text-xs">جمع دلار (این ماه)</p>
          <p className="text-surface-900 text-lg font-bold">
            {summary ? `$${summary.totalUsd}` : "—"}
          </p>
        </Card>
        <Card variant="outlined" padding="sm">
          <p className="text-surface-400 text-xs">تعداد هزینه‌ها</p>
          <p className="text-surface-900 text-lg font-bold">{summary ? summary.count : "—"}</p>
        </Card>
        <Card variant="outlined" padding="sm">
          <p className="text-surface-400 text-xs">بیشترین دسته‌بندی</p>
          <p className="text-surface-900 text-sm font-bold">
            {topCategory ? `${topCategory.categoryName} (${topCategory.count})` : "—"}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-3 lg:justify-end">
          <Button variant="outline" onClick={() => setCategoriesOpen(true)}>
            دسته‌بندی‌ها
          </Button>
          <Button variant="primary" startIcon={<BiPlus className="size-5" />} onClick={openCreate}>
            هزینه جدید
          </Button>
        </div>
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
          description="هزینه‌های مستقیم کلینیک مانند اجاره و مصرفی‌ها را اینجا ثبت کنید."
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
