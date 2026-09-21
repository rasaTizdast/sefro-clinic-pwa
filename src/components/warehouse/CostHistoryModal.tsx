import { useQuery } from "@tanstack/react-query";

import { formatJalaliDate } from "../../lib/date";
import * as inventoryFinanceService from "../../services/inventoryFinance";
import type { ProductCostHistory } from "../../types/finance";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { Pagination } from "../ui/Pagination";
import { type Column, Table } from "../ui/Table";

interface CostHistoryModalProps {
  productId: number;
  productName: string;
  onClose: () => void;
}

const columns: Column<ProductCostHistory>[] = [
  {
    key: "costUsd",
    header: "بها ($)",
    align: "center",
    render: (item) => <span className="text-surface-900 font-medium">${item.costUsd}</span>,
  },
  {
    key: "effectiveFrom",
    header: "شروع اعتبار",
    align: "center",
    width: "110px",
    render: (item) => <span>{formatJalaliDate(item.effectiveFrom)}</span>,
  },
  {
    key: "effectiveTo",
    header: "پایان اعتبار",
    align: "center",
    width: "110px",
    render: (item) => (
      <span>{item.effectiveTo ? formatJalaliDate(item.effectiveTo) : "تا الان"}</span>
    ),
  },
];

export function CostHistoryModal({ productId, productName, onClose }: CostHistoryModalProps) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["finance", "costHistory", productId],
    queryFn: () => inventoryFinanceService.listCostHistory(productId, { perPage: 50 }),
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={`تاریخچه بهای ${productName}`}
      size="md"
      footer={
        <Button variant="outline" onClick={onClose}>
          بستن
        </Button>
      }
    >
      <div className="flex flex-col gap-2">
        {isLoading && <p className="text-surface-400 text-center text-sm">در حال بارگذاری...</p>}
        {data?.data.length === 0 && !isLoading && (
          <p className="text-surface-400 text-center text-sm">بهای این محصول تغییر نکرده است.</p>
        )}
        <Table
          columns={columns}
          data={data?.data ?? []}
          rowKey={(item) => item.id}
          loading={isLoading}
        />
        {data && data.totalPages > 1 && (
          <Pagination
            currentPage={data.page}
            totalPages={data.totalPages}
            onPageChange={() => refetch()}
          />
        )}
      </div>
    </Modal>
  );
}
