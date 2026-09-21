import { useState } from "react";
import { BiLock, BiPencil, BiPlus, BiTrash, BiUser } from "react-icons/bi";

import { SearchButton } from "../components/SearchButton";
import { CompensationRulesTab } from "../components/settings/CompensationRulesTab";
import { ExchangeRatesTab } from "../components/settings/ExchangeRatesTab";
import { ServiceCategoriesTab } from "../components/settings/ServiceCategoriesTab";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import type { Column } from "../components/ui/Table";
import { Table } from "../components/ui/Table";
import { TabPanel, Tabs } from "../components/ui/Tabs";
import { useToast } from "../components/ui/Toast";
import {
  useCreateEmployee,
  useDeleteEmployee,
  useEmployees,
  useUpdateEmployee,
} from "../hooks/api";
import { usePermissions } from "../hooks/usePermissions";
import type { ClinicUser, UserRole } from "../types/settings";

const settingsTabs = [
  { id: "users", label: "کاربران" },
  { id: "exchange-rates", label: "نرخ ارز" },
  { id: "compensation-rules", label: "قوانین تسویه" },
  { id: "service-categories", label: "دسته‌بندی خدمات" },
];

const roleBadgeVariant: Record<UserRole, "success" | "info" | "warning"> = {
  مدیر: "success",
  پزشک: "info",
  منشی: "warning",
};

const statusMap: Record<ClinicUser["status"], { label: string; variant: "success" | "danger" }> = {
  active: { label: "فعال", variant: "success" },
  inactive: { label: "غیرفعال", variant: "danger" },
};

function Settings() {
  const toast = useToast();
  const { canManageUsers, canManageFinance } = usePermissions();
  const [activeTab, setActiveTab] = useState("users");

  const { data: employees, isLoading: employeesLoading } = useEmployees();
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const deleteEmployee = useDeleteEmployee();

  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ClinicUser | null>(null);
  const [userForm, setUserForm] = useState({
    username: "",
    password: "",
    firstName: "",
    lastName: "",
    phoneNumber: "",
  });

  const visibleTabs = canManageFinance
    ? settingsTabs
    : settingsTabs.filter((t) => t.id === "users");

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
              setUserForm({
                username: user.username,
                password: "",
                firstName: "",
                lastName: "",
                phoneNumber: "",
              });
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

  function handleOpenUserModal() {
    setEditingUser(null);
    setUserForm({ username: "", password: "", firstName: "", lastName: "", phoneNumber: "" });
    setUserModalOpen(true);
  }

  async function handleSaveUser() {
    if (!userForm.username.trim()) {
      toast.warning("نام کاربری را وارد کنید.");
      return;
    }
    if (editingUser) {
      const data: Record<string, unknown> = {
        username: userForm.username,
        first_name: userForm.firstName,
        last_name: userForm.lastName,
        phone_number: userForm.phoneNumber,
      };
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
        firstName: userForm.firstName,
        lastName: userForm.lastName,
        phoneNumber: userForm.phoneNumber,
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

      <Tabs tabs={visibleTabs} activeTab={activeTab} onChange={setActiveTab} />

      <TabPanel id="users" activeTab={activeTab}>
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
      </TabPanel>

      <TabPanel id="exchange-rates" activeTab={activeTab}>
        <ExchangeRatesTab />
      </TabPanel>

      <TabPanel id="compensation-rules" activeTab={activeTab}>
        <CompensationRulesTab />
      </TabPanel>

      <TabPanel id="service-categories" activeTab={activeTab}>
        <ServiceCategoriesTab />
      </TabPanel>

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
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="نام"
              value={userForm.firstName}
              onChange={(e) => setUserForm((prev) => ({ ...prev, firstName: e.target.value }))}
              startIcon={<BiUser className="size-4" />}
            />
            <Input
              label="نام خانوادگی"
              value={userForm.lastName}
              onChange={(e) => setUserForm((prev) => ({ ...prev, lastName: e.target.value }))}
              startIcon={<BiUser className="size-4" />}
            />
          </div>
          <Input
            label="شماره تلفن"
            value={userForm.phoneNumber}
            onChange={(e) => setUserForm((prev) => ({ ...prev, phoneNumber: e.target.value }))}
            startIcon={<BiUser className="size-4" />}
          />
          <Input
            label="نام کاربری"
            value={userForm.username}
            onChange={(e) => setUserForm((prev) => ({ ...prev, username: e.target.value }))}
            startIcon={<BiUser className="size-4" />}
          />
          {(!editingUser || editingUser.role !== "مدیر") && (
            <Input
              label={editingUser ? "رمز عبور (خالی بگذارید برای عدم تغییر)" : "رمز عبور"}
              type="password"
              value={userForm.password}
              onChange={(e) => setUserForm((prev) => ({ ...prev, password: e.target.value }))}
              startIcon={<BiLock className="size-4" />}
            />
          )}
        </div>
      </Modal>
    </div>
  );
}

export default Settings;
