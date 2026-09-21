import { useState } from "react";

import { useProductsList, useUsagesList } from "../../hooks/api";
import { formatJalaliDate } from "../../lib/date";
import type { ProductUsage } from "../../types/finance";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { Pagination } from "../ui/Pagination";
import { Select } from "../ui/Select";
import { type Column, Table } from "../ui/Table";

const PAGE_SIZE = 20;

export function UsagesTab() {
  const [page, setPage] = useState(1);
  const [productFilter, setProductFilter] = useState("");
  const [visitFilter, setVisitFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");

  const { data: paginated, isLoading } = useUsagesList({
    page,
    perPage: PAGE_SIZE,
    product: productFilter ? Number(productFilter) : undefined,
    visit: visitFilter ? Number(visitFilter) : undefined,
    service: serviceFilter ? Number(serviceFilter) : undefined,
  });
  const { data: productsData } = useProductsList({ perPage: 100 });

  const productNames = new Map<number, string>();
  for (const p of productsData?.data ?? []) productNames.set(p.id, p.name);

  const usages = paginated?.data ?? [];
  const totalPages = paginated?.totalPages ?? 1;

  const columns: Column<ProductUsage>[] = [
    {
      key: "product",
      header: "محصول",
      render: (item) => <span>{productNames.get(item.product) ?? `#${item.product}`}</span>,
    },
    {
      key: "visit",
      header: "مراجعه",
      align: "center",
      width: "80px",
      render: (item) => (item.visit ? `#${item.visit}` : "—"),
    },
    {
      key: "service",
      header: "خدمت",
      align: "center",
      width: "80px",
      render: (item) => (item.service ? `#${item.service}` : "—"),
    },
    {
      key: "quantity",
      header: "مقدار",
      align: "center",
      width: "90px",
      render: (item) => <span>{item.quantity}</span>,
    },
    {
      key: "unitCost",
      header: "بهای واحد ($)",
      align: "end",
      render: (item) => (
        <span className="text-surface-700 text-sm">${item.unitCostUsdSnapshot}</span>
      ),
    },
    {
      key: "totalCost",
      header: "بهای کل ($)",
      align: "end",
      render: (item) => (
        <span className="text-surface-900 font-medium">${item.totalCostUsdSnapshot}</span>
      ),
    },
    {
      key: "createdAt",
      header: "تاریخ",
      align: "center",
      width: "110px",
      render: (item) => <span>{formatJalaliDate(item.createdAt)}</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2 sm:grid-cols-4">
        <Select
          label="محصول"
          options={[
            { value: "", label: "همه" },
            ...(productsData?.data ?? []).map((p) => ({ value: String(p.id), label: p.name })),
          ]}
          value={productFilter}
          onChange={(e) => {
            setProductFilter(e.target.value);
            setPage(1);
          }}
        />
        <Input
          placeholder="شناسه مراجعه"
          value={visitFilter}
          onChange={(e) => {
            setVisitFilter(e.target.value);
            setPage(1);
          }}
        />
        <Input
          placeholder="شناسه خدمت"
          value={serviceFilter}
          onChange={(e) => {
            setServiceFilter(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <Card variant="outlined" padding="none">
        <Table
          columns={columns}
          data={usages}
          rowKey={(item) => item.id}
          loading={isLoading}
          className="rounded-none border-0"
        />
        {totalPages > 1 && (
          <div className="border-surface-200 flex items-center justify-center border-t px-5 py-4">
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </Card>
    </div>
  );
}
