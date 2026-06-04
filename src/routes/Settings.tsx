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
import { Select } from "../components/ui/Select";
import type { Column } from "../components/ui/Table";
import { Table } from "../components/ui/Table";
import type { Tab } from "../components/ui/Tabs";
import { TabPanel, Tabs } from "../components/ui/Tabs";
import { Textarea } from "../components/ui/Textarea";
import { Toggle } from "../components/ui/Toggle";
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

const mockUsers: ClinicUser[] = [
  {
    id: 1,
    username: "dr.mohammadi",
    role: "مدیر",
    email: "dr.mohammadi@clinic.com",
    status: "active",
  },
  {
    id: 2,
    username: "dr.hosseini",
    role: "پزشک",
    email: "dr.hosseini@clinic.com",
    status: "active",
  },
  { id: 3, username: "sara.nik", role: "منشی", email: "sara.nik@clinic.com", status: "active" },
  {
    id: 4,
    username: "ali.ahmadi",
    role: "پزشک",
    email: "ali.ahmadi@clinic.com",
    status: "inactive",
  },
  { id: 5, username: "marjan.gh", role: "منشی", email: "marjan.gh@clinic.com", status: "active" },
];

const defaultWorkingHours: DayHours[] = [
  { day: "شنبه", open: "08:00", close: "20:00" },
  { day: "یکشنبه", open: "08:00", close: "20:00" },
  { day: "دوشنبه", open: "08:00", close: "20:00" },
  { day: "سه‌شنبه", open: "08:00", close: "20:00" },
  { day: "چهارشنبه", open: "08:00", close: "20:00" },
  { day: "پنجشنبه", open: "08:00", close: "14:00" },
];

const roleOptions = [
  { value: "مدیر", label: "مدیر" },
  { value: "پزشک", label: "پزشک" },
  { value: "منشی", label: "منشی" },
];

function Settings() {
  const [activeTab, setActiveTab] = useState("profile");

  const [profile, setProfile] = useState({
    username: "admin",
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

  const tabs: Tab[] = [
    { id: "profile", label: "پروفایل", icon: <BiUser className="size-4" /> },
    { id: "clinic", label: "کلینیک", icon: <BiBuildings className="size-4" /> },
    { id: "users", label: "کاربران", icon: <BiGroup className="size-4" /> },
    { id: "notifications", label: "اعلان‌ها", icon: <BiBell className="size-4" /> },
  ];

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
      render: () => (
        <div className="flex items-center justify-center gap-1">
          <Button variant="ghost" size="sm" startIcon={<BiPencil className="size-4" />} />
          <Button
            variant="ghost"
            size="sm"
            startIcon={<BiTrash className="text-danger-500 size-4" />}
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
              <Avatar name="مدیر کلینیک" size="xl" />
              <div>
                <h2 className="text-surface-900 text-lg font-semibold">مدیر کلینیک</h2>
                <p className="text-surface-500 text-sm">مدیر سیستم</p>
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
                label="رمز فعلی"
                type="password"
                value={password.current}
                onChange={(e) => setPasswordField("current", e.target.value)}
                startIcon={<BiLock className="size-4" />}
              />
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
            </div>
          </Card>

          <div className="flex justify-start">
            <Button variant="primary" startIcon={<BiSave className="size-5" />}>
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
            <Button variant="primary" startIcon={<BiSave className="size-5" />}>
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
              onClick={() => setUserModalOpen(true)}
            >
              کاربر جدید
            </Button>
          </div>

          <Card variant="outlined" padding="none">
            <Table columns={userColumns} data={mockUsers} rowKey={(user) => user.id} />
          </Card>

          <Modal
            open={userModalOpen}
            onClose={() => setUserModalOpen(false)}
            title="افزودن کاربر جدید"
            size="lg"
            footer={
              <>
                <Button variant="ghost" onClick={() => setUserModalOpen(false)}>
                  انصراف
                </Button>
                <Button variant="primary" startIcon={<BiPlus className="size-5" />}>
                  ذخیره
                </Button>
              </>
            }
          >
            <div className="flex flex-col gap-4">
              <Input label="نام کاربری" startIcon={<BiUser className="size-4" />} />
              <Input label="ایمیل" type="email" startIcon={<IoMailOutline className="size-4" />} />
              <Select label="نقش" options={roleOptions} placeholder="انتخاب نقش" />
              <Input label="رمز عبور" type="password" startIcon={<BiLock className="size-4" />} />
              <Input
                label="تکرار رمز عبور"
                type="password"
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
        </div>
      </TabPanel>
    </div>
  );
}

export default Settings;
