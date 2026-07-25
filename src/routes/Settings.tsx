import { useState } from "react";
import { BiLock, BiPencil, BiPlus, BiSave, BiTrash, BiUser } from "react-icons/bi";

import { SearchButton } from "../components/SearchButton";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardTitle } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import type { Column } from "../components/ui/Table";
import { Table } from "../components/ui/Table";
import { useToast } from "../components/ui/Toast";
import {
  useCreateEmployee,
  useCurrentUser,
  useDeleteEmployee,
  useEmployees,
  useSaveWorkTime,
  useUpdateEmployee,
  useWorkTime,
} from "../hooks/api";
import { usePermissions } from "../hooks/usePermissions";
import type { ClinicUser, UserRole } from "../types/settings";

const roleBadgeVariant: Record<UserRole, "success" | "info" | "warning"> = {
  مدیر: "success",
  پزشک: "info",
  منشی: "warning",
};

const statusMap: Record<ClinicUser["status"], { label: string; variant: "success" | "danger" }> = {
  active: { label: "فعال", variant: "success" },
  inactive: { label: "غیرفعال", variant: "danger" },
};

const DAYS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];

function Settings() {
  const toast = useToast();

  const { data: currentUser } = useCurrentUser();
  const { data: employees, isLoading: employeesLoading } = useEmployees();
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const deleteEmployee = useDeleteEmployee();
  const { data: workTimeRecord, isLoading: workTimeLoading } = useWorkTime();
  const saveWorkTime = useSaveWorkTime();

  const [password, setPassword] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  const [draft, setDraft] = useState<{ startTime: string; endTime: string } | null>(null);

  const startTime = draft?.startTime ?? workTimeRecord?.startTime ?? "08:00";
  const endTime = draft?.endTime ?? workTimeRecord?.endTime ?? "20:00";

  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ClinicUser | null>(null);
  const [userForm, setUserForm] = useState({ username: "", password: "" });

  const { canManageUsers } = usePermissions();

  const users: ClinicUser[] = Array.isArray(employees)
    ? employees.map((emp) => ({
        id: emp.id,
        username: emp.username,
        role: emp.role === "admin" ? "مدیر" : emp.role === "employee" ? "پزشک" : "منشی",
        email: "",
        status: "active" as const,
      }))
    : [];

  const userColumns: Column<ClinicUser>[] = [
    { key: "username", header: "نام کاربری" },
    {
      key: "role",
      header: "نقش",
      align: "center",
      render: (user) => (
        <Badge variant={roleBadgeVariant[user.role]} size="sm">
          {user.role}
        </Badge>
      ),
    },
    { key: "email", header: "ایمیل" },
    {
      key: "status",
      header: "وضعیت",
      align: "center",
      render: (user) => {
        const s = statusMap[user.status];
        return (
          <Badge variant={s.variant} size="sm" dot>
            {s.label}
          </Badge>
        );
      },
    },
    {
      key: "actions",
      header: "عملیات",
      align: "center",
      render: (user) => (
        <div className="flex items-center justify-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            startIcon={<BiPencil className="size-4" />}
            onClick={() => {
              setEditingUser(user);
              setUserForm({ username: user.username, password: "" });
              setUserModalOpen(true);
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            startIcon={<BiTrash className="text-danger-500 size-4" />}
            onClick={() => deleteEmployee.mutate(user.id)}
          />
        </div>
      ),
    },
  ];

  function setPasswordField(field: keyof typeof password, value: string) {
    setPassword((prev) => ({ ...prev, [field]: value }));
  }

  async function handleChangePassword() {
    if (!password.new || password.new.length < 6) {
      toast.warning("رمز عبور جدید باید حداقل ۶ کاراکتر باشد.");
      return;
    }
    if (password.new !== password.confirm) {
      toast.warning("رمز عبور و تکرار آن مطابقت ندارند.");
      return;
    }
    if (!currentUser) return;
    try {
      await updateEmployee.mutateAsync({ id: currentUser.id, data: { password: password.new } });
      setPassword({ current: "", new: "", confirm: "" });
    } catch {
      // Toast handled in mutation
    }
  }

  async function handleSaveWorkingHours() {
    await saveWorkTime.mutateAsync({
      id: workTimeRecord?.id,
      data: { startTime, endTime },
    });
  }

  function handleOpenUserModal() {
    setEditingUser(null);
    setUserForm({ username: "", password: "" });
    setUserModalOpen(true);
  }

  async function handleSaveUser() {
    if (!userForm.username.trim()) {
      toast.warning("نام کاربری را وارد کنید.");
      return;
    }
    if (editingUser) {
      const data: Record<string, unknown> = { username: userForm.username };
      if (userForm.password) data.password = userForm.password;
      await updateEmployee.mutateAsync({ id: editingUser.id, data });
    } else {
      if (!userForm.password) {
        toast.warning("رمز عبور را وارد کنید.");
        return;
      }
      await createEmployee.mutateAsync({
        username: userForm.username,
        password: userForm.password,
      });
    }
    setUserModalOpen(false);
    setEditingUser(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-surface-900 text-2xl font-bold" data-tour="set-header">
            تنظیمات
          </h1>
          <p className="text-surface-500 mt-1 text-sm">تنظیمات حساب کاربری و سیستم</p>
        </div>
        <SearchButton />
      </div>

      <Card variant="outlined" padding="lg" data-tour="set-password">
        <CardTitle className="mb-4">تغییر رمز عبور</CardTitle>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="رمز جدید"
            type="password"
            value={password.new}
            onChange={(e) => setPasswordField("new", e.target.value)}
            startIcon={<BiLock className="size-4" />}
          />
          <Input
            label="تکرار رمز جدید"
            type="password"
            value={password.confirm}
            onChange={(e) => setPasswordField("confirm", e.target.value)}
            startIcon={<BiLock className="size-4" />}
          />
          <div className="flex items-end">
            <Button
              variant="primary"
              startIcon={<BiSave className="size-5" />}
              onClick={handleChangePassword}
              disabled={!password.new || !password.confirm || updateEmployee.isPending}
              loading={updateEmployee.isPending}
            >
              تغییر رمز
            </Button>
          </div>
        </div>
      </Card>

      <Card variant="outlined" padding="lg" data-tour="set-hours">
        <div className="mb-4 flex items-center justify-between">
          <CardTitle>ساعات کاری هفتگی</CardTitle>
          <Button
            variant="primary"
            startIcon={<BiSave className="size-5" />}
            onClick={handleSaveWorkingHours}
            loading={saveWorkTime.isPending}
            disabled={workTimeLoading}
          >
            ذخیره
          </Button>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <span className="text-surface-700 w-24 shrink-0 text-sm font-medium">از ساعت</span>
            <Input
              type="time"
              value={startTime}
              onChange={(e) =>
                setDraft((prev) => ({
                  startTime: e.target.value,
                  endTime: prev?.endTime ?? endTime,
                }))
              }
              onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
              containerClassName="flex-1"
            />
            <span className="text-surface-400 text-sm">تا</span>
            <Input
              type="time"
              value={endTime}
              onChange={(e) =>
                setDraft((prev) => ({
                  startTime: prev?.startTime ?? startTime,
                  endTime: e.target.value,
                }))
              }
              onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
              containerClassName="flex-1"
            />
          </div>
          <div className="text-surface-500 flex flex-wrap items-center gap-1 text-sm">
            <span>اعمال برای روزهای:</span>
            {DAYS.map((d, i) => (
              <span key={d}>
                <span className="text-surface-700 font-medium">{d}</span>
                {i < DAYS.length - 1 && <span className="mx-0.5">,</span>}
              </span>
            ))}
          </div>
        </div>
      </Card>

      <div className="flex flex-col gap-4" data-tour="set-users">
        {canManageUsers && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-surface-900 text-lg font-semibold">مدیریت کاربران</h2>
              <Button
                variant="primary"
                startIcon={<BiPlus className="size-5" />}
                onClick={handleOpenUserModal}
              >
                کاربر جدید
              </Button>
            </div>

            <Card variant="outlined" padding="none">
              <Table
                columns={userColumns}
                data={users}
                rowKey={(user) => user.id}
                loading={employeesLoading}
              />
            </Card>
          </>
        )}
      </div>

      <Modal
        open={userModalOpen}
        onClose={() => {
          setUserModalOpen(false);
          setEditingUser(null);
        }}
        title={editingUser ? "ویرایش کاربر" : "افزودن کاربر جدید"}
        size="lg"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setUserModalOpen(false);
                setEditingUser(null);
              }}
            >
              انصراف
            </Button>
            <Button
              variant="primary"
              startIcon={<BiPlus className="size-5" />}
              onClick={handleSaveUser}
              disabled={
                !userForm.username.trim() ||
                (!editingUser && !userForm.password) ||
                createEmployee.isPending ||
                updateEmployee.isPending
              }
              loading={createEmployee.isPending || updateEmployee.isPending}
            >
              ذخیره
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            label="نام کاربری"
            value={userForm.username}
            onChange={(e) => setUserForm((prev) => ({ ...prev, username: e.target.value }))}
            startIcon={<BiUser className="size-4" />}
          />
          <Input
            label={editingUser ? "رمز عبور (خالی بگذارید برای عدم تغییر)" : "رمز عبور"}
            type="password"
            value={userForm.password}
            onChange={(e) => setUserForm((prev) => ({ ...prev, password: e.target.value }))}
            startIcon={<BiLock className="size-4" />}
          />
        </div>
      </Modal>
    </div>
  );
}

export default Settings;
