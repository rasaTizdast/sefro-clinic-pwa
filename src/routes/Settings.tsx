import { useState } from "react";
import {
  BiBell,
  BiBuildings,
  BiGroup,
  BiLock,
  BiPencil,
  BiPhone,
  BiPlus,
  BiSave,
  BiTrash,
  BiUser,
} from "react-icons/bi";
import { IoMailOutline } from "react-icons/io5";

import { SearchButton } from "../components/SearchButton";
import { Alert } from "../components/ui/Alert";
import { Avatar } from "../components/ui/Avatar";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardTitle } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import type { Column } from "../components/ui/Table";
import { Table } from "../components/ui/Table";
import type { Tab } from "../components/ui/Tabs";
import { TabPanel, Tabs } from "../components/ui/Tabs";
import { Textarea } from "../components/ui/Textarea";
import { useToast } from "../components/ui/Toast";
import { Toggle } from "../components/ui/Toggle";
import {
  useCreateEmployee,
  useCurrentUser,
  useDeleteEmployee,
  useEmployees,
  useUpdateEmployee,
} from "../hooks/api";
import type { ClinicUser, DayHours, UserRole } from "../types/settings";

const roleBadgeVariant: Record<UserRole, "success" | "info" | "warning"> = {
  مدیر: "success",
  پزشک: "info",
  منشی: "warning",
};

const statusMap: Record<ClinicUser["status"], { label: string; variant: "success" | "danger" }> = {
  active: { label: "فعال", variant: "success" },
  inactive: { label: "غیرفعال", variant: "danger" },
};

const defaultWorkingHours: DayHours[] = [
  { day: "شنبه", open: "08:00", close: "20:00" },
  { day: "یکشنبه", open: "08:00", close: "20:00" },
  { day: "دوشنبه", open: "08:00", close: "20:00" },
  { day: "سه‌شنبه", open: "08:00", close: "20:00" },
  { day: "چهارشنبه", open: "08:00", close: "20:00" },
  { day: "پنجشنبه", open: "08:00", close: "14:00" },
];

function Settings() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState("profile");

  const { data: currentUser } = useCurrentUser();
  const { data: employees, isLoading: employeesLoading } = useEmployees();
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const deleteEmployee = useDeleteEmployee();

  const [profile, setProfile] = useState({
    username: currentUser?.username ?? "admin",
    fullName: "مدیر کلینیک",
    email: "info@clinic.com",
    phone: "۰۲۱۱۲۳۴۵۶۷۸",
  });

  const [password, setPassword] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  const [clinic, setClinic] = useState({
    name: "کلینیک سرو",
    address: "تهران، خیابان انقلاب، پلاک ۱۲۳",
    phone: "۰۲۱۱۲۳۴۵۶۷۸",
    postalCode: "۱۲۳۴۵۶۷۸۹۰",
  });

  const [workingHours, setWorkingHours] = useState<DayHours[]>(defaultWorkingHours);

  const [notifications, setNotifications] = useState({
    appointmentReminder: true,
    smsReminder: false,
    stockAlert: true,
    dailyReport: false,
    systemNotifications: true,
  });

  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ClinicUser | null>(null);
  const [userForm, setUserForm] = useState({ username: "", password: "" });

  const tabs: Tab[] = [
    { id: "profile", label: "پروفایل", icon: <BiUser className="size-4" /> },
    { id: "clinic", label: "کلینیک", icon: <BiBuildings className="size-4" /> },
    { id: "users", label: "کاربران", icon: <BiGroup className="size-4" /> },
    { id: "notifications", label: "اعلان‌ها", icon: <BiBell className="size-4" /> },
  ];

  const users: ClinicUser[] = employees
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

  function setProfileField(field: keyof typeof profile, value: string) {
    setProfile((prev) => ({ ...prev, [field]: value }));
  }

  function setPasswordField(field: keyof typeof password, value: string) {
    setPassword((prev) => ({ ...prev, [field]: value }));
  }

  function setClinicField(field: keyof typeof clinic, value: string) {
    setClinic((prev) => ({ ...prev, [field]: value }));
  }

  function handleHourChange(index: number, field: "open" | "close", value: string) {
    setWorkingHours((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function handleSaveProfile() {
    toast.success("پروفایل به‌روزرسانی شد", "تغییرات با موفقیت ذخیره شدند.");
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

  function handleSaveClinic() {
    toast.success("اطلاعات کلینیک ذخیره شد", "تغییرات با موفقیت ذخیره شدند.");
  }

  function handleSaveNotifications() {
    toast.success("تنظیمات اعلان‌ها ذخیره شد", "تغییرات با موفقیت ذخیره شدند.");
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
          <h1 className="text-surface-900 text-2xl font-bold">تنظیمات</h1>
          <p className="text-surface-500 mt-1 text-sm">مدیریت تنظیمات سیستم</p>
        </div>
        <SearchButton />
      </div>

      <Card variant="outlined" padding="none">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} className="px-6 pt-2" />
      </Card>

      <TabPanel id="profile" activeTab={activeTab}>
        <div className="flex flex-col gap-6">
          <Card variant="outlined" padding="lg">
            <div className="border-surface-200 mb-6 flex items-center gap-4 border-b pb-6">
              <Avatar name={currentUser?.username ?? "کاربر"} size="xl" />
              <div>
                <h2 className="text-surface-900 text-lg font-semibold">
                  {currentUser?.username ?? "کاربر"}
                </h2>
                <p className="text-surface-500 text-sm">
                  {currentUser?.role === "admin" ? "مدیر" : "کارمند"}
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="نام کاربری"
                value={profile.username}
                onChange={(e) => setProfileField("username", e.target.value)}
                startIcon={<BiUser className="size-4" />}
              />
              <Input
                label="نام و نام خانوادگی"
                value={profile.fullName}
                onChange={(e) => setProfileField("fullName", e.target.value)}
              />
              <Input
                label="ایمیل"
                type="email"
                value={profile.email}
                onChange={(e) => setProfileField("email", e.target.value)}
                startIcon={<IoMailOutline className="size-4" />}
              />
              <Input
                label="شماره تماس"
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfileField("phone", e.target.value)}
                startIcon={<BiPhone className="size-4" />}
              />
            </div>
          </Card>

          <Card variant="outlined" padding="lg">
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

          <div className="flex justify-start">
            <Button
              variant="primary"
              startIcon={<BiSave className="size-5" />}
              onClick={handleSaveProfile}
            >
              ذخیره تغییرات
            </Button>
          </div>
        </div>
      </TabPanel>

      <TabPanel id="clinic" activeTab={activeTab}>
        <div className="flex flex-col gap-6">
          <Card variant="outlined" padding="lg">
            <CardTitle className="mb-4">اطلاعات کلینیک</CardTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="نام کلینیک"
                value={clinic.name}
                onChange={(e) => setClinicField("name", e.target.value)}
                startIcon={<BiBuildings className="size-4" />}
              />
              <Input
                label="تلفن"
                type="tel"
                value={clinic.phone}
                onChange={(e) => setClinicField("phone", e.target.value)}
                startIcon={<BiPhone className="size-4" />}
              />
              <div className="sm:col-span-2">
                <Textarea
                  label="آدرس"
                  value={clinic.address}
                  onChange={(e) => setClinicField("address", e.target.value)}
                />
              </div>
              <Input
                label="کد پستی"
                value={clinic.postalCode}
                onChange={(e) => setClinicField("postalCode", e.target.value)}
              />
            </div>
          </Card>

          <Card variant="outlined" padding="lg">
            <CardTitle className="mb-4">ساعات کاری</CardTitle>
            <div className="flex flex-col gap-3">
              {workingHours.map((day, index) => (
                <div
                  key={day.day}
                  className="border-surface-100 flex items-center gap-4 border-b pb-3 last:border-b-0 last:pb-0"
                >
                  <span className="text-surface-700 w-24 shrink-0 text-sm font-medium">
                    {day.day}
                  </span>
                  <Input
                    type="time"
                    value={day.open}
                    onChange={(e) => handleHourChange(index, "open", e.target.value)}
                    containerClassName="flex-1"
                  />
                  <span className="text-surface-400 text-sm">تا</span>
                  <Input
                    type="time"
                    value={day.close}
                    onChange={(e) => handleHourChange(index, "close", e.target.value)}
                    containerClassName="flex-1"
                  />
                </div>
              ))}
            </div>
          </Card>

          <div className="flex justify-start">
            <Button
              variant="primary"
              startIcon={<BiSave className="size-5" />}
              onClick={handleSaveClinic}
            >
              ذخیره تغییرات
            </Button>
          </div>
        </div>
      </TabPanel>

      <TabPanel id="users" activeTab={activeTab}>
        <div className="flex flex-col gap-6">
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
      </TabPanel>

      <TabPanel id="notifications" activeTab={activeTab}>
        <div className="flex flex-col gap-6">
          <Alert variant="info" title="مدیریت اعلان‌ها">
            در این بخش می‌توانید اعلان‌های سیستم را مدیریت کنید. با فعال یا غیرفعال کردن هر گزینه،
            اعلان‌های مربوطه برای شما ارسال خواهد شد.
          </Alert>

          <Card variant="outlined" padding="lg">
            <CardTitle className="mb-4">تنظیمات اعلان‌ها</CardTitle>
            <div className="flex flex-col gap-4">
              <Toggle
                label="یادآوری نوبت"
                checked={notifications.appointmentReminder}
                onChange={(e) =>
                  setNotifications((prev) => ({
                    ...prev,
                    appointmentReminder: (e.target as HTMLInputElement).checked,
                  }))
                }
              />
              <Toggle
                label="پیامک یادآوری"
                checked={notifications.smsReminder}
                onChange={(e) =>
                  setNotifications((prev) => ({
                    ...prev,
                    smsReminder: (e.target as HTMLInputElement).checked,
                  }))
                }
              />
              <Toggle
                label="هشدار موجودی انبار"
                checked={notifications.stockAlert}
                onChange={(e) =>
                  setNotifications((prev) => ({
                    ...prev,
                    stockAlert: (e.target as HTMLInputElement).checked,
                  }))
                }
              />
              <Toggle
                label="گزارش روزانه"
                checked={notifications.dailyReport}
                onChange={(e) =>
                  setNotifications((prev) => ({
                    ...prev,
                    dailyReport: (e.target as HTMLInputElement).checked,
                  }))
                }
              />
              <div className="border-surface-200 border-t pt-4">
                <Toggle
                  label="اعلان‌های سیستم"
                  checked={notifications.systemNotifications}
                  onChange={(e) =>
                    setNotifications((prev) => ({
                      ...prev,
                      systemNotifications: (e.target as HTMLInputElement).checked,
                    }))
                  }
                />
              </div>
            </div>
          </Card>

          <div className="flex justify-start">
            <Button
              variant="primary"
              startIcon={<BiSave className="size-5" />}
              onClick={handleSaveNotifications}
            >
              ذخیره تغییرات
            </Button>
          </div>
        </div>
      </TabPanel>
    </div>
  );
}

export default Settings;
