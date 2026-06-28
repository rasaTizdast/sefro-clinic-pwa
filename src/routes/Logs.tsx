import { useState } from "react";
import { MdHistory } from "react-icons/md";

import { SearchButton } from "../components/SearchButton";
import { Alert } from "../components/ui/Alert";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardTitle } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { Skeleton } from "../components/ui/Skeleton";
import { type Column, Table } from "../components/ui/Table";
import { useLogsList } from "../hooks/api";
import { formatJalaliDate } from "../lib/date";
import type { AuditLog } from "../services/logs";

const actionVariant: Record<AuditLog["action"], "success" | "danger" | "info"> = {
  CREATE: "success",
  UPDATE: "info",
  DELETE: "danger",
};

const actionLabel: Record<AuditLog["action"], string> = {
  CREATE: "ایجاد",
  UPDATE: "ویرایش",
  DELETE: "حذف",
};

const modelLabel: Record<string, string> = {
  customer: "مشتری",
  visit: "ویزیت",
  payment: "پرداخت",
  service: "خدمات",
  product: "کالا",
  employee: "کارمند",
  user: "کاربر",
};

const columns: Column<AuditLog>[] = [
  {
    key: "username",
    header: "کاربر",
    width: "140px",
  },
  {
    key: "action",
    header: "عملیات",
    width: "100px",
    render: (item) => (
      <Badge variant={actionVariant[item.action]} size="sm">
        {actionLabel[item.action]}
      </Badge>
    ),
  },
  {
    key: "modelName",
    header: "مدل",
    width: "110px",
    render: (item) => modelLabel[item.modelName] ?? item.modelName,
  },
  {
    key: "objectRepr",
    header: "محتوا",
  },
  {
    key: "timestamp",
    header: "زمان",
    width: "170px",
    render: (item) => {
      const time = item.timestamp ? item.timestamp.slice(11, 19) : "";
      return `${formatJalaliDate(item.timestamp)} ${time}`;
    },
  },
];

function Logs() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useLogsList({
    page,
    perPage: 30,
    search: search || undefined,
  });

  const logs = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-surface-900 text-2xl font-bold">لاگ سیستم</h1>
          <p className="text-surface-500 mt-1 text-sm">ثبت رویدادهای مهم سیستم</p>
        </div>
        <SearchButton />
      </div>

      <Card variant="outlined" padding="none">
        <div className="border-surface-200 flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>رویدادها</CardTitle>
          <Input
            placeholder="جستجو در لاگ‌ها..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="sm:max-w-xs"
          />
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-3 p-5">
            <Skeleton width="100%" height="3rem" variant="rectangular" />
            <Skeleton width="100%" height="3rem" variant="rectangular" />
            <Skeleton width="100%" height="3rem" variant="rectangular" />
          </div>
        ) : isError ? (
          <div className="p-5">
            <Alert variant="error" title="خطا در بارگذاری لاگ‌ها">
              متأسفانه در دریافت اطلاعات لاگ‌ها مشکلی پیش آمده است.
            </Alert>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={<MdHistory className="size-12" />}
              title="لاگی ثبت نشده"
              description="هنوز هیچ رویدادی در سیستم ثبت نشده است."
            />
          </div>
        ) : (
          <>
            <Table
              columns={columns}
              data={logs}
              rowKey={(item) => item.id}
              className="rounded-none border-0"
            />
            {totalPages > 1 && (
              <div className="border-surface-200 flex items-center justify-between border-t px-5 py-3">
                <span className="text-surface-500 text-sm">
                  صفحه {page} از {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    قبلی
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    بعدی
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}

export default Logs;
