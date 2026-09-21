import { useState } from "react";
import { BiPlus } from "react-icons/bi";

import { useDeletePackage, usePackagesList } from "../../hooks/api";
import { formatPrice } from "../../lib/format";
import type { Package } from "../../types/finance";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Modal } from "../ui/Modal";
import { Pagination } from "../ui/Pagination";
import { type Column, Table } from "../ui/Table";
import { PackageFormModal } from "./PackageFormModal";

const PAGE_SIZE = 20;

export function PackagesTab() {
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Package | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Package | null>(null);

  const { data: paginated, isLoading } = usePackagesList({ page, perPage: PAGE_SIZE });
  const deletePackage = useDeletePackage();

  const packages = paginated?.data ?? [];
  const totalPages = paginated?.totalPages ?? 1;

  const columns: Column<Package>[] = [
    { key: "name", header: "نام پکیج" },
    {
      key: "price",
      header: "قیمت",
      align: "end",
      render: (item) => (
        <span>
          <span className="text-surface-900 font-medium">
            {item.priceToman != null ? `${formatPrice(Number(item.priceToman))} تومان` : "—"}
          </span>{" "}
          <span className="text-surface-400 text-xs">${item.priceUsd}</span>
        </span>
      ),
    },
    {
      key: "services",
      header: "خدمات",
      align: "center",
      width: "90px",
      render: (item) => <span className="text-surface-600">{item.services.length}</span>,
    },
    {
      key: "actions",
      header: "عملیات",
      align: "center",
      width: "160px",
      render: (item) => (
        <div className="flex items-center justify-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setEditing(item)}>
            ویرایش
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-danger-600 hover:text-danger-700 hover:bg-danger-50"
            onClick={() => setDeleting(item)}
          >
            حذف
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        <Button
          variant="primary"
          startIcon={<BiPlus className="size-5" />}
          onClick={() => setCreating(true)}
        >
          پکیج جدید
        </Button>
      </div>

      <Card variant="outlined" padding="none">
        <Table
          columns={columns}
          data={packages}
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

      {(creating || editing) && (
        <PackageFormModal
          pkg={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="حذف پکیج"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              انصراف
            </Button>
            <Button
              variant="danger"
              loading={deletePackage.isPending}
              onClick={async () => {
                if (deleting) await deletePackage.mutateAsync(deleting.id);
                setDeleting(null);
              }}
            >
              حذف پکیج
            </Button>
          </>
        }
      >
        <p className="text-surface-600 text-sm leading-relaxed">
          آیا از حذف پکیج «{deleting?.name}» مطمئن هستید؟ این عمل قابل بازگشت نیست.
        </p>
      </Modal>
    </div>
  );
}
