import { useMemo, useState } from "react";
import { BiDownload, BiFilter, BiSearch, BiX } from "react-icons/bi";
import { MdDateRange } from "react-icons/md";

import { useAllProducts, useAllServices, useAllUsages, useAllVisits } from "../../hooks/api";
import { extractApiError } from "../../lib/api-error";
import { snapshotToman } from "../../lib/currency";
import { formatJalaliDate, jalaliToGregorianISO } from "../../lib/date";
import { toPersianDigits } from "../../lib/digits";
import { formatPrice } from "../../lib/format";
import { ALL_PER_PAGE } from "../../services/fetch-all-pages";
import type { ProductUsage } from "../../types/finance";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { JalaliDatePicker } from "../ui/JalaliDatePicker";
import { Pagination } from "../ui/Pagination";
import { Select } from "../ui/Select";
import { type Column, Table } from "../ui/Table";
import { PriceCell } from "./PriceCell";

const PAGE_SIZE = ALL_PER_PAGE;

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * ISO day for the client-side date range; null while the input is empty or not a full
 * Jalali date (the API ignores `date_from`/`date_to`, so range filtering happens here).
 */
function toIsoDay(value: string | null): string | null {
  if (!value) return null;
  const iso = jalaliToGregorianISO(value);
  return ISO_DAY.test(iso) ? iso : null;
}

export function UsagesTab() {
  const [page, setPage] = useState(1);
  const [productFilter, setProductFilter] = useState("");
  const [visitFilter, setVisitFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const { data: allUsages, isLoading, isError, error } = useAllUsages();

  const { data: productsData } = useAllProducts();
  const { data: servicesData } = useAllServices();
  const { data: visitsData } = useAllVisits({ status: "completed" });

  const productOptions = useMemo(
    () => [
      { value: "", label: "همه محصولات" },
      ...(productsData ?? []).map((p) => ({ value: String(p.id), label: p.name })),
    ],
    [productsData]
  );

  const serviceOptions = useMemo(
    () => [
      { value: "", label: "همه خدمات" },
      ...(servicesData ?? []).map((s) => ({ value: String(s.id), label: s.title })),
    ],
    [servicesData]
  );

  const visitOptions = useMemo(
    () => [
      { value: "", label: "همه مراجعات" },
      ...(visitsData ?? []).map((v) => ({
        value: String(v.id),
        label: `#${v.id} — ${v.customerName} (${v.time})`,
      })),
    ],
    [visitsData]
  );

  const productNames = useMemo(() => {
    const map = new Map<number, string>();
    for (const p of productsData ?? []) map.set(p.id, p.name);
    return map;
  }, [productsData]);

  const serviceNames = useMemo(() => {
    const map = new Map<number, string>();
    for (const s of servicesData ?? []) map.set(s.id, s.title);
    return map;
  }, [servicesData]);

  const visitNames = useMemo(() => {
    const map = new Map<number, string>();
    for (const v of visitsData ?? []) map.set(v.id, `${v.customerName} (${v.time})`);
    return map;
  }, [visitsData]);

  const usages = useMemo(() => allUsages ?? [], [allUsages]);

  // The API ignores date params and paginates at a fixed size, so every filter (dates
  // included) runs client-side over the full log — totals then cover all matching rows.
  const fromDay = toIsoDay(dateFrom);
  const toDay = toIsoDay(dateTo);

  const filtered = useMemo(() => {
    return usages.filter((u) => {
      if (productFilter && u.product !== Number(productFilter)) return false;
      if (visitFilter && u.visit !== Number(visitFilter)) return false;
      if (serviceFilter && u.service !== Number(serviceFilter)) return false;
      const day = u.createdAt.slice(0, 10);
      if (fromDay && day < fromDay) return false;
      if (toDay && day > toDay) return false;
      return true;
    });
  }, [usages, productFilter, visitFilter, serviceFilter, fromDay, toDay]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  // The page can point past the end after a filter change or a refetch with fewer rows.
  const currentPage = Math.min(page, totalPages);
  const pageRows = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage]
  );

  const hasActiveFilters = productFilter || visitFilter || serviceFilter || dateFrom || dateTo;

  const totals = useMemo(() => {
    let totalQuantity = 0;
    let totalCostUsd = 0;
    let totalCostToman = 0;

    for (const u of filtered) {
      totalQuantity += Number(u.quantity) || 0;
      totalCostUsd += Number(u.totalCostUsdSnapshot) || 0;
      const toman = snapshotToman(u.totalCostUsdSnapshot, u.exchangeRateSnapshot);
      if (toman) totalCostToman += toman;
    }

    return { totalQuantity, totalCostUsd, totalCostToman };
  }, [filtered]);

  const clearAllFilters = () => {
    setProductFilter("");
    setVisitFilter("");
    setServiceFilter("");
    setDateFrom(null);
    setDateTo(null);
    setPage(1);
  };

  const columns: Column<ProductUsage>[] = [
    {
      key: "product",
      header: "محصول",
      width: "180px",
      render: (item) => (
        <span className="text-surface-800 font-medium">
          {productNames.get(item.product) ?? `#${item.product}`}
        </span>
      ),
    },
    {
      key: "visit",
      header: "مراجعه",
      align: "center",
      width: "140px",
      render: (item) =>
        item.visit ? (
          <span
            className="text-surface-700 hover:text-primary-600 cursor-pointer"
            title={visitNames.get(item.visit) ?? ""}
          >
            #{item.visit}
          </span>
        ) : (
          <span className="text-surface-400">—</span>
        ),
    },
    {
      key: "service",
      header: "خدمت",
      align: "center",
      width: "160px",
      render: (item) =>
        item.service ? (
          <span className="text-surface-700" title={serviceNames.get(item.service) ?? ""}>
            {serviceNames.get(item.service) ?? `#${item.service}`}
          </span>
        ) : (
          <span className="text-surface-400">—</span>
        ),
    },
    {
      key: "quantity",
      header: "مقدار",
      align: "center",
      width: "90px",
      render: (item) => <span className="text-surface-900 font-medium">{item.quantity}</span>,
    },
    {
      key: "unitCost",
      header: "بهای واحد",
      align: "center",
      width: "130px",
      render: (item) => (
        <PriceCell
          toman={snapshotToman(item.unitCostUsdSnapshot, item.exchangeRateSnapshot)}
          usd={item.unitCostUsdSnapshot}
        />
      ),
    },
    {
      key: "totalCost",
      header: "بهای کل",
      align: "center",
      width: "130px",
      render: (item) => (
        <PriceCell
          toman={snapshotToman(item.totalCostUsdSnapshot, item.exchangeRateSnapshot)}
          usd={item.totalCostUsdSnapshot}
        />
      ),
    },
    {
      key: "createdAt",
      header: "تاریخ و ساعت",
      align: "center",
      width: "150px",
      render: (item) => (
        <span className="text-surface-700">{formatJalaliDate(item.createdAt)}</span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Summary Cards */}
      <Card variant="outlined" padding="md" className="bg-surface-50/50">
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="border-surface-200 flex items-center gap-3 rounded-lg border bg-white p-3">
            <div className="bg-primary-100 text-primary-700 flex size-10 items-center justify-center rounded-lg">
              <BiSearch className="size-5" />
            </div>
            <div>
              <p className="text-surface-500 text-xs">مجموع موارد</p>
              <p className="text-surface-900 text-lg font-bold">
                {toPersianDigits(String(filtered.length))}
              </p>
            </div>
          </div>
          <div className="border-surface-200 flex items-center gap-3 rounded-lg border bg-white p-3">
            <div className="bg-success-100 text-success-700 flex size-10 items-center justify-center rounded-lg">
              <BiDownload className="size-5" />
            </div>
            <div>
              <p className="text-surface-500 text-xs">مجموع مقدار</p>
              <p className="text-surface-900 text-lg font-bold">
                {toPersianDigits(totals.totalQuantity.toFixed(3))}
              </p>
            </div>
          </div>
          <div className="border-surface-200 flex items-center gap-3 rounded-lg border bg-white p-3">
            <div className="bg-warning-100 text-warning-700 flex size-10 items-center justify-center rounded-lg">
              <MdDateRange className="size-5" />
            </div>
            <div>
              <p className="text-surface-500 text-xs">بهای کل (USD)</p>
              <p className="text-surface-900 text-lg font-bold">
                ${totals.totalCostUsd.toFixed(2)}
              </p>
            </div>
          </div>
          <div className="border-surface-200 flex items-center gap-3 rounded-lg border bg-white p-3">
            <div className="bg-info-100 text-info-700 flex size-10 items-center justify-center rounded-lg">
              <BiFilter className="size-5" />
            </div>
            <div>
              <p className="text-surface-500 text-xs">بهای کل (تومان)</p>
              <p className="text-surface-900 text-lg font-bold">
                {formatPrice(totals.totalCostToman)} تومان
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Filters */}
      <Card variant="outlined" padding="md">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-surface-900 flex items-center gap-2 text-sm font-medium">
            <BiFilter className="text-primary-600 size-4" />
            فیلترها
          </h3>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters} className="gap-1.5">
              <BiX className="size-3.5" />
              پاک کردن همه
            </Button>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Select
            label="محصول"
            options={productOptions}
            value={productFilter}
            onChange={(e) => {
              setProductFilter(e.target.value);
              setPage(1);
            }}
          />
          <Select
            label="خدمت"
            options={serviceOptions}
            value={serviceFilter}
            onChange={(e) => {
              setServiceFilter(e.target.value);
              setPage(1);
            }}
          />
          <Select
            label="مراجعه"
            options={visitOptions}
            value={visitFilter}
            onChange={(e) => {
              setVisitFilter(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <Button
          variant={showAdvancedFilters ? "primary" : "outline"}
          size="sm"
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className="mt-2 flex items-center gap-1.5"
          startIcon={<BiFilter className="size-4" />}
        >
          {showAdvancedFilters ? "مخفی کردن فیلترهای پیشرفته" : "نمایش فیلترهای پیشرفته"}
        </Button>

        {showAdvancedFilters && (
          <div className="animate-in slide-in-from-top-2 mt-3 grid gap-3 duration-200 sm:grid-cols-2">
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
        )}
      </Card>

      {/* Table */}
      <Card variant="outlined" padding="none" className="overflow-hidden">
        {isLoading ? (
          <Table
            columns={columns}
            data={[]}
            loading
            rowKey={() => ""}
            className="rounded-none border-0"
          />
        ) : isError ? (
          <div className="px-5 py-4">
            <Alert variant="error" title="خطا در دریافت مصرف‌ها">
              {extractApiError(error)}
            </Alert>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
            <BiSearch className="text-surface-300 mb-3 size-16" />
            <h4 className="text-surface-700 mb-1 text-lg font-medium">مصرفی یافت نشد</h4>
            <p className="text-surface-400 text-sm">
              {hasActiveFilters
                ? "با فیلترهای دیگر تلاش کنید."
                : "هنوز مصرفی در سیستم ثبت نشده است."}
            </p>
          </div>
        ) : (
          <>
            <Table
              columns={columns}
              data={pageRows}
              rowKey={(item) => item.id}
              className="rounded-none border-0"
              caption="لیست مصرف مواد"
            />
            {totalPages > 1 && (
              <div className="border-surface-200 flex items-center justify-center border-t px-5 py-4">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
