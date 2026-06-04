import { useState, useMemo } from "react";
import {
  BiChevronLeft,
  BiChevronRight,
  BiPlus,
  BiCalendar,
  BiTime,
  BiUser,
  BiNote,
} from "react-icons/bi";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Textarea } from "../components/ui/Textarea";
import { EmptyState } from "../components/ui/EmptyState";
import type {
  Appointment,
  DayCell,
  NewAppointmentFormData,
  AppointmentStatus,
} from "../types/appointment";
const PERSIAN_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

const WEEKDAYS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];

const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
const latinDigits = "0123456789";

function toPersianDigits(num: number): string {
  return num.toString().replace(/\d/g, (d) => persianDigits[parseInt(d)]);
}

function parseFaNumber(str: string): number {
  const cleaned = str.replace(/[^\d۰-۹]/g, "");
  const latin = cleaned.replace(/[۰-۹]/g, (d) => latinDigits[persianDigits.indexOf(d)]);
  return parseInt(latin, 10);
}

const persianDateFormatter = new Intl.DateTimeFormat("fa-IR", {
  calendar: "persian",
  year: "numeric",
  month: "numeric",
  day: "numeric",
});

function getPersianDate(date: Date) {
  const parts = persianDateFormatter.formatToParts(date);
  return {
    year: parseFaNumber(parts.find((p) => p.type === "year")!.value),
    month: parseFaNumber(parts.find((p) => p.type === "month")!.value),
    day: parseFaNumber(parts.find((p) => p.type === "day")!.value),
  };
}

function isLeapPersianYear(year: number): boolean {
  return [1, 5, 9, 13, 17, 22, 26, 30].includes(year % 33);
}

function getPersianMonthDays(month: number, year: number): number {
  if (month <= 6) return 31;
  if (month <= 11) return 30;
  return isLeapPersianYear(year) ? 30 : 29;
}

function getFirstOfPersianMonth(date: Date): Date {
  const d = new Date(date);
  while (getPersianDate(d).day !== 1) {
    d.setDate(d.getDate() - 1);
  }
  return d;
}

function navigateMonth(date: Date, direction: -1 | 1): Date {
  const p = getPersianDate(date);
  const first = getFirstOfPersianMonth(date);
  if (direction === 1) {
    const next = new Date(first);
    next.setDate(next.getDate() + getPersianMonthDays(p.month, p.year));
    return getFirstOfPersianMonth(next);
  }
  const prev = new Date(first);
  prev.setDate(prev.getDate() - 1);
  return getFirstOfPersianMonth(prev);
}

type StatusVariant = "success" | "warning" | "danger" | "info";

const statusConfig: Record<AppointmentStatus, { label: string; variant: StatusVariant }> = {
  confirmed: { label: "تأیید شده", variant: "success" },
  waiting: { label: "در انتظار", variant: "warning" },
  cancelled: { label: "لغو شده", variant: "danger" },
  completed: { label: "انجام شده", variant: "info" },
};

const patientOptions = [
  { value: "1", label: "علی رضایی" },
  { value: "2", label: "سارا احمدی" },
  { value: "3", label: "رضا کریمی" },
  { value: "4", label: "مریم نوروزی" },
  { value: "5", label: "امیر عباسی" },
  { value: "6", label: "نگین صادقی" },
];

const doctorOptions = [
  { value: "1", label: "دکتر محمدی" },
  { value: "2", label: "دکتر حسینی" },
  { value: "3", label: "دکتر احمدی" },
];

const serviceOptions = [
  { value: "1", label: "ویزیت عمومی" },
  { value: "2", label: "قلب" },
  { value: "3", label: "داخلی" },
  { value: "4", label: "اطفال" },
  { value: "5", label: "ارتودنسی" },
];

const patientNames = [
  "علی رضایی",
  "سارا احمدی",
  "رضا کریمی",
  "مریم نوروزی",
  "امیر عباسی",
  "نگین صادقی",
  "محمد محمدیان",
  "زهرا حسینی",
  "حسین مرادی",
];
const doctorNames = ["دکتر محمدی", "دکتر حسینی", "دکتر احمدی"];
const serviceNames = ["ویزیت عمومی", "قلب", "داخلی", "اطفال", "ارتودنسی"];
const statuses: Appointment["status"][] = ["confirmed", "waiting", "cancelled", "completed"];
const times = [
  "۰۸:۰۰",
  "۰۸:۳۰",
  "۰۹:۰۰",
  "۰۹:۳۰",
  "۱۰:۰۰",
  "۱۰:۳۰",
  "۱۱:۰۰",
  "۱۱:۳۰",
  "۱۲:۰۰",
  "۱۴:۰۰",
  "۱۴:۳۰",
  "۱۵:۰۰",
  "۱۶:۰۰",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateMockAppointments(jy: number, jm: number): Appointment[] {
  const results: Appointment[] = [];
  const daysInMonth = getPersianMonthDays(jm, jy);
  const usedDays = new Set<number>();

  for (let i = 0; i < 20; i++) {
    let day: number;
    do {
      day = Math.floor(Math.random() * daysInMonth) + 1;
    } while (usedDays.has(day) && usedDays.size < daysInMonth);
    usedDays.add(day);

    results.push({
      id: i + 1,
      time: pick(times),
      patient: pick(patientNames),
      doctor: pick(doctorNames),
      service: pick(serviceNames),
      date: `${jy}/${jm}/${day}`,
      status: pick(statuses),
    });
  }

  return results;
}

function Calendar() {
  const [todayInfo] = useState(() => getPersianDate(new Date()));
  const [viewDate, setViewDate] = useState(() => getFirstOfPersianMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<string>(
    `${todayInfo.year}/${todayInfo.month}/${todayInfo.day}`
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [form, setForm] = useState<NewAppointmentFormData>({
    patient: "",
    doctor: "",
    service: "",
    date: "",
    time: "",
    notes: "",
  });

  const persian = getPersianDate(viewDate);
  const appointments = useMemo(
    () => generateMockAppointments(persian.year, persian.month),
    [persian.year, persian.month]
  );

  const todayStr = `${todayInfo.year}/${todayInfo.month}/${todayInfo.day}`;

  const grid = useMemo(() => {
    const first = getFirstOfPersianMonth(viewDate);
    const jsDay = first.getDay();
    const startWeekday = (jsDay + 1) % 7;
    const daysInMonth = getPersianMonthDays(persian.month, persian.year);

    const weeks: DayCell[][] = [];
    let week: DayCell[] = [];

    for (let i = 0; i < startWeekday; i++) {
      week.push({ day: 0, isToday: false, isSelected: false, date: "", appointments: [] });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${persian.year}/${persian.month}/${day}`;
      const isToday = dateStr === todayStr;
      const isSelected = dateStr === selectedDate;
      const dayApps = appointments.filter((a) => a.date === dateStr);

      week.push({ day, isToday, isSelected, date: dateStr, appointments: dayApps });

      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
    }

    if (week.length > 0) {
      while (week.length < 7) {
        week.push({ day: 0, isToday: false, isSelected: false, date: "", appointments: [] });
      }
      weeks.push(week);
    }

    return weeks;
  }, [viewDate, persian.month, persian.year, todayStr, selectedDate, appointments]);

  const selectedDayAppointments = appointments.filter((a) => a.date === selectedDate);

  function handlePrevMonth() {
    setViewDate((prev) => navigateMonth(prev, -1));
  }

  function handleNextMonth() {
    setViewDate((prev) => navigateMonth(prev, 1));
  }

  function handleSelectDate(dateStr: string) {
    setSelectedDate(dateStr);
    setSelectedAppointment(null);
  }

  function handleOpenModal() {
    setForm({
      patient: "",
      doctor: "",
      service: "",
      date:
        toPersianDigits(persian.year) +
        "/" +
        toPersianDigits(persian.month) +
        "/" +
        toPersianDigits(getPersianDate(new Date()).day),
      time: "",
      notes: "",
    });
    setModalOpen(true);
  }

  function handleCloseModal() {
    setModalOpen(false);
  }

  function handleFormChange(field: keyof NewAppointmentFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmitForm() {
    handleCloseModal();
  }

  const selectedDateDisplay = (() => {
    const parts = selectedDate.split("/");
    if (parts.length !== 3) return "—";
    return `${toPersianDigits(parseInt(parts[2]))} ${PERSIAN_MONTHS[parseInt(parts[1]) - 1]} ${toPersianDigits(parseInt(parts[0]))}`;
  })();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-surface-900 text-2xl font-bold">تقویم نوبت‌ها</h1>
        </div>
        <Button
          variant="primary"
          startIcon={<BiPlus className="size-5" />}
          className="mt-3 sm:mt-0"
          onClick={handleOpenModal}
        >
          نوبت جدید
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Card variant="outlined" padding="none">
            <div className="border-surface-200 flex items-center justify-between border-b px-5 py-4">
              <button
                onClick={handlePrevMonth}
                className="text-surface-500 hover:text-surface-700 hover:bg-surface-100 cursor-pointer rounded-lg p-1.5 transition-colors"
                aria-label="ماه قبل"
              >
                <BiChevronRight className="size-5" />
              </button>
              <span className="text-surface-900 text-base font-semibold select-none">
                {PERSIAN_MONTHS[persian.month - 1]} {toPersianDigits(persian.year)}
              </span>
              <button
                onClick={handleNextMonth}
                className="text-surface-500 hover:text-surface-700 hover:bg-surface-100 cursor-pointer rounded-lg p-1.5 transition-colors"
                aria-label="ماه بعد"
              >
                <BiChevronLeft className="size-5" />
              </button>
            </div>

            <div className="p-4">
              <div className="mb-2 grid grid-cols-7">
                {WEEKDAYS.map((wd) => (
                  <div
                    key={wd}
                    className="text-surface-500 py-2 text-center text-xs font-medium select-none"
                  >
                    {wd}
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-1">
                {grid.map((week, wi) => (
                  <div key={wi} className="grid grid-cols-7 gap-1">
                    {week.map((cell, ci) => {
                      if (!cell.date) {
                        return <div key={ci} className="aspect-square" />;
                      }

                      const todayStyle =
                        cell.isToday && !cell.isSelected
                          ? "bg-primary-600 text-white font-bold rounded-lg shadow-sm"
                          : "";
                      const selectedStyle = cell.isSelected
                        ? "bg-primary-600 text-white font-bold rounded-lg shadow-sm"
                        : "";
                      const hoverStyle =
                        !cell.isToday && !cell.isSelected ? "hover:bg-surface-50 rounded-lg" : "";

                      return (
                        <button
                          key={ci}
                          onClick={() => handleSelectDate(cell.date)}
                          className={`focus-visible:ring-primary-600/40 relative flex aspect-square cursor-pointer flex-col items-center justify-center text-sm transition-colors outline-none focus-visible:ring-2 ${todayStyle || selectedStyle || hoverStyle}`}
                        >
                          <span className="leading-none">{toPersianDigits(cell.day)}</span>
                          {cell.appointments.length > 0 && (
                            <span className="mt-1 flex items-center gap-0.5">
                              {cell.appointments.slice(0, 3).map((_, idx) => (
                                <span
                                  key={idx}
                                  className={`size-1 rounded-full ${
                                    cell.isToday || cell.isSelected
                                      ? "bg-white/70"
                                      : "bg-primary-500"
                                  }`}
                                />
                              ))}
                              {cell.appointments.length > 3 && (
                                <span
                                  className={`text-[10px] ${cell.isToday || cell.isSelected ? "text-white/70" : "text-surface-400"}`}
                                >
                                  +{cell.appointments.length - 3}
                                </span>
                              )}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        <div>
          <Card variant="outlined" padding="lg">
            <div className="mb-4 flex items-center gap-2">
              <BiCalendar className="text-primary-600 size-5" />
              <h3 className="text-surface-900 text-sm font-semibold">{selectedDateDisplay}</h3>
            </div>

            {selectedDayAppointments.length === 0 ? (
              <EmptyState
                title="نوبتی ثبت نشده"
                description="برای این روز نوبتی وجود ندارد"
                action={
                  <Button
                    variant="primary"
                    size="sm"
                    startIcon={<BiPlus className="size-4" />}
                    onClick={handleOpenModal}
                  >
                    ثبت نوبت
                  </Button>
                }
              />
            ) : (
              <div className="flex flex-col gap-3">
                {selectedDayAppointments.map((appt) => {
                  const status = statusConfig[appt.status];
                  const isSelected = selectedAppointment?.id === appt.id;

                  return (
                    <button
                      key={appt.id}
                      onClick={() => setSelectedAppointment(isSelected ? null : appt)}
                      className={`focus-visible:ring-primary-600/40 w-full cursor-pointer rounded-lg border p-3 text-right transition-all outline-none focus-visible:ring-2 ${
                        isSelected
                          ? "border-primary-400 bg-primary-50/50 shadow-sm"
                          : "border-surface-200 hover:border-surface-300 bg-white hover:shadow-sm"
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="text-surface-600 flex items-center gap-1.5 text-xs">
                          <BiTime className="size-3.5" />
                          <span>{appt.time}</span>
                        </div>
                        <Badge variant={status.variant} size="sm">
                          {status.label}
                        </Badge>
                      </div>
                      <p className="text-surface-900 text-sm font-medium">{appt.patient}</p>
                      {isSelected && (
                        <div className="border-surface-200 text-surface-600 mt-2 flex flex-col gap-1.5 border-t pt-2 text-xs">
                          <div className="flex items-center gap-1.5">
                            <BiUser className="text-surface-400 size-3.5" />
                            <span>{appt.doctor}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <BiNote className="text-surface-400 size-3.5" />
                            <span>{appt.service}</span>
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={handleCloseModal}
        title="نوبت جدید"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={handleCloseModal}>
              انصراف
            </Button>
            <Button variant="primary" onClick={handleSubmitForm}>
              ثبت نوبت
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Select
            label="بیمار"
            options={patientOptions}
            placeholder="انتخاب بیمار"
            value={form.patient}
            onChange={(e) => handleFormChange("patient", e.target.value)}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="پزشک"
              options={doctorOptions}
              placeholder="انتخاب پزشک"
              value={form.doctor}
              onChange={(e) => handleFormChange("doctor", e.target.value)}
            />
            <Select
              label="خدمت"
              options={serviceOptions}
              placeholder="انتخاب خدمت"
              value={form.service}
              onChange={(e) => handleFormChange("service", e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="تاریخ"
              value={form.date}
              onChange={(e) => handleFormChange("date", e.target.value)}
            />
            <Input
              label="ساعت"
              placeholder="مثال: ۰۹:۰۰"
              value={form.time}
              onChange={(e) => handleFormChange("time", e.target.value)}
            />
          </div>
          <Textarea
            label="توضیحات"
            placeholder="توضیحات اضافی..."
            value={form.notes}
            onChange={(e) => handleFormChange("notes", e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}

export default Calendar;
