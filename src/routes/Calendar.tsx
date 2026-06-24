import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import {
  BiCalendar,
  BiCheck,
  BiChevronLeft,
  BiChevronRight,
  BiNote,
  BiPlus,
  BiSearch,
  BiTime,
} from "react-icons/bi";

import { SearchButton } from "../components/SearchButton";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { Skeleton } from "../components/ui/Skeleton";
import { Textarea } from "../components/ui/Textarea";
import { useCustomersList, useReserveVisit, useServicesList, useVisitsList } from "../hooks/api";
import { toLatinDigits, toPersianDigits as toPersianDigitsLib } from "../lib/digits";
import type {
  Appointment,
  AppointmentStatus,
  DayCell,
  WizardFormData,
  WizardStep,
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

function toPersianDigits(num: number): string {
  return toPersianDigitsLib(num.toString());
}

function toPersian(str: string): string {
  return toPersianDigitsLib(str);
}

function parseFaNumber(str: string): number {
  return parseInt(toLatinDigits(str), 10);
}

function parseTimeToMinutes(time: string): number {
  const latin = toLatinDigits(time);
  const [h, m] = latin.split(":").map(Number);
  return h * 60 + m;
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
  pending: { label: "در انتظار", variant: "warning" },
  canceled: { label: "لغو شده", variant: "danger" },
  completed: { label: "انجام شده", variant: "info" },
};

const START_HOUR = 8;
const END_HOUR = 16;
const TIME_BUFFER = 10;

function minutesToTimeStr(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

function minutesToTimeStrPersian(minutes: number): string {
  return toPersianDigitsLib(minutesToTimeStr(minutes));
}

function getFreeBlocks(
  dayApps: Appointment[],
  serviceDuration: number
): { start: number; end: number }[] {
  const occupiedRanges: { start: number; end: number }[] = dayApps.map((apt) => ({
    start: parseTimeToMinutes(apt.time) - TIME_BUFFER,
    end: parseTimeToMinutes(apt.time) + apt.duration + TIME_BUFFER,
  }));

  occupiedRanges.sort((a, b) => a.start - b.start);
  const merged: { start: number; end: number }[] = [];
  for (const range of occupiedRanges) {
    const last = merged[merged.length - 1];
    if (last && range.start <= last.end) {
      last.end = Math.max(last.end, range.end);
    } else {
      merged.push({ ...range });
    }
  }

  const dayEnd = END_HOUR * 60;
  const freeBlocks: { start: number; end: number }[] = [];
  let cursor = START_HOUR * 60;

  for (const occ of merged) {
    const gap = occ.start - cursor;
    if (gap >= serviceDuration) {
      freeBlocks.push({ start: cursor, end: occ.start });
    }
    cursor = Math.max(cursor, occ.end);
  }

  const remaining = dayEnd - cursor;
  if (remaining >= serviceDuration) {
    freeBlocks.push({ start: cursor, end: dayEnd });
  }

  return freeBlocks;
}

function Calendar() {
  const [todayInfo] = useState(() => getPersianDate(new Date()));
  const [viewDate, setViewDate] = useState(() => getFirstOfPersianMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<string>(
    `${todayInfo.year}/${todayInfo.month}/${todayInfo.day}`
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [wizardStep, setWizardStep] = useState<WizardStep>("patient");
  const [form, setForm] = useState<WizardFormData>({
    patientId: null,
    serviceId: null,
    date: "",
    time: "",
    notes: "",
  });
  const [patientSearch, setPatientSearch] = useState("");

  const persian = getPersianDate(viewDate);

  const { data: paginatedPatients, isLoading: patientsLoading } = useCustomersList({
    perPage: 100,
  });
  const { data: paginatedServices, isLoading: servicesLoading } = useServicesList({
    perPage: 100,
  });
  const { data: paginatedVisits, isLoading: visitsLoading } = useVisitsList({
    year: persian.year,
    month: persian.month,
    perPage: 200,
  });
  const { mutate: reserveVisit, isPending: isCreating } = useReserveVisit();

  const patients = paginatedPatients?.data ?? [];
  const services = paginatedServices?.data ?? [];
  const allAppointments = paginatedVisits?.data ?? [];

  const todayStr = `${todayInfo.year}/${todayInfo.month}/${todayInfo.day}`;

  const filteredPatients = useMemo(
    () =>
      patientSearch
        ? patients.filter((p) =>
            `${p.firstName} ${p.lastName}${p.mobileNumber}`
              .toLowerCase()
              .includes(patientSearch.toLowerCase())
          )
        : patients,
    [patients, patientSearch]
  );

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
      const dayApps = allAppointments.filter((a) => a.date === dateStr);

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
  }, [viewDate, persian.month, persian.year, todayStr, selectedDate, allAppointments]);

  const selectedDayAppointments = allAppointments.filter((a) => a.date === selectedDate);

  const selectedPatient = form.patientId
    ? (patients.find((p) => p.id === form.patientId) ?? null)
    : null;
  const selectedService = form.serviceId
    ? (services.find((s) => s.id === form.serviceId) ?? null)
    : null;

  const availableBlocks = useMemo(() => {
    if (!selectedService || !form.date) return [];
    const dayApps = allAppointments.filter((a) => a.date === form.date);
    return getFreeBlocks(dayApps, selectedService.duration);
  }, [selectedService, form.date, allAppointments]);

  const stepDaysAvailability = useMemo(() => {
    const days: Record<string, boolean> = {};
    const daysInMonth = getPersianMonthDays(persian.month, persian.year);
    if (!selectedService) {
      for (let day = 1; day <= daysInMonth; day++) {
        days[`${persian.year}/${persian.month}/${day}`] = true;
      }
      return days;
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${persian.year}/${persian.month}/${day}`;
      const dayApps = allAppointments.filter((a) => a.date === dateStr);
      days[dateStr] = getFreeBlocks(dayApps, selectedService.duration).length > 0;
    }
    return days;
  }, [persian.year, persian.month, allAppointments, selectedService]);

  function handlePrevMonth() {
    setViewDate((prev) => navigateMonth(prev, -1));
  }

  function handleNextMonth() {
    setViewDate((prev) => navigateMonth(prev, 1));
  }

  function handleGoToToday() {
    const now = new Date();
    setViewDate(getFirstOfPersianMonth(now));
    setSelectedDate(`${todayInfo.year}/${todayInfo.month}/${todayInfo.day}`);
  }

  function handleSelectDate(dateStr: string) {
    setSelectedDate(dateStr);
    setSelectedAppointment(null);
  }

  function handleOpenModal() {
    setWizardStep("patient");
    setForm({ patientId: null, serviceId: null, date: "", time: "", notes: "" });
    setModalOpen(true);
  }

  function handleCloseModal() {
    setModalOpen(false);
    setWizardStep("patient");
  }

  function handleFormChange(field: keyof WizardFormData, value: string | number | null) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleWizardNext() {
    if (wizardStep === "patient" && form.patientId) {
      setWizardStep("service");
    } else if (wizardStep === "service" && form.serviceId) {
      setWizardStep("time");
    }
  }

  function handleWizardBack() {
    if (wizardStep === "service") {
      setWizardStep("patient");
    } else if (wizardStep === "time") {
      setWizardStep("service");
    }
  }

  function handleSubmitForm() {
    if (!selectedPatient || !selectedService || !form.date || !form.time) return;
    reserveVisit(
      {
        customer: selectedPatient.id,
        services: [selectedService.id],
        date: form.date,
        time: form.time,
        notes: form.notes || undefined,
      },
      {
        onSuccess: () => {
          handleCloseModal();
        },
      }
    );
  }

  function getStepDaysInMonth(): number {
    return getPersianMonthDays(persian.month, persian.year);
  }

  function getStepGrid() {
    const first = getFirstOfPersianMonth(viewDate);
    const jsDay = first.getDay();
    const startWeekday = (jsDay + 1) % 7;
    const daysInMonth = getStepDaysInMonth();

    const weeks: { day: number; date: string; available: boolean }[][] = [];
    let week: { day: number; date: string; available: boolean }[] = [];

    for (let i = 0; i < startWeekday; i++) {
      week.push({ day: 0, date: "", available: false });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${persian.year}/${persian.month}/${day}`;
      week.push({
        day,
        date: dateStr,
        available: selectedService ? (stepDaysAvailability[dateStr] ?? true) : true,
      });

      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
    }

    if (week.length > 0) {
      while (week.length < 7) {
        week.push({ day: 0, date: "", available: false });
      }
      weeks.push(week);
    }

    return weeks;
  }

  const stepGrid = getStepGrid();

  const selectedDateDisplay = (() => {
    const parts = selectedDate.split("/");
    if (parts.length !== 3) return "—";
    return `${toPersianDigits(parseInt(parts[2]))} ${PERSIAN_MONTHS[parseInt(parts[1]) - 1]} ${toPersianDigits(parseInt(parts[0]))}`;
  })();

  const isLoading = patientsLoading || servicesLoading || visitsLoading;

  const STEP_LABELS: { key: WizardStep; label: string }[] = [
    { key: "patient", label: "بیمار" },
    { key: "service", label: "خدمت" },
    { key: "time", label: "زمان" },
  ];

  const stepIndex = STEP_LABELS.findIndex((s) => s.key === wizardStep);

  function renderStepIndicator() {
    return (
      <div className="mb-6 flex items-center justify-center gap-0">
        {STEP_LABELS.map((s, i) => {
          const isActive = i === stepIndex;
          const isDone = i < stepIndex;
          return (
            <div key={s.key} className="flex items-center">
              <div className="flex flex-col items-center gap-1">
                <span
                  className={`flex size-8 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                    isDone
                      ? "bg-success-500 text-white"
                      : isActive
                        ? "bg-primary-600 text-white"
                        : "border-surface-300 text-surface-400 border"
                  }`}
                >
                  {isDone ? <BiCheck className="size-4" /> : toPersianDigits(i + 1)}
                </span>
                <span
                  className={`text-[11px] ${
                    isActive ? "text-primary-700 font-medium" : "text-surface-400"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div
                  className={`mobile:mx-2 mobile:w-10 mx-1 mt-0 h-0.5 w-6 ${i < stepIndex ? "bg-success-500" : "bg-surface-200"}`}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  function renderPatientStep() {
    return (
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Input
            label="جستجوی بیمار"
            placeholder="نام یا تلفن بیمار را وارد کنید..."
            value={patientSearch}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setPatientSearch(e.target.value);
              if (form.patientId && e.target.value) {
                handleFormChange("patientId", null);
              }
            }}
            startIcon={<BiSearch className="size-4" />}
          />
        </div>
        <div className="border-surface-200 mobile:max-h-64 flex max-h-48 flex-col gap-1 overflow-y-auto rounded-lg border p-1.5">
          {filteredPatients.length === 0 ? (
            <p className="text-surface-400 py-6 text-center text-sm">بیماری یافت نشد</p>
          ) : (
            filteredPatients.map((p) => {
              const isSelected = form.patientId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    handleFormChange("patientId", p.id);
                    setPatientSearch("");
                  }}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-right transition-colors ${
                    isSelected
                      ? "border-primary-400 bg-primary-50 border"
                      : "hover:bg-surface-50 border border-transparent"
                  }`}
                >
                  <div className="bg-primary-100 text-primary-700 flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold">
                    {p.firstName[0]}
                  </div>
                  <div className="min-w-0">
                    <p
                      className={`truncate text-sm font-medium ${
                        isSelected ? "text-primary-700" : "text-surface-900"
                      }`}
                    >
                      {p.firstName} {p.lastName}
                    </p>
                    <p className="text-surface-500 truncate text-xs" dir="ltr">
                      {toPersian(p.mobileNumber)}
                    </p>
                  </div>
                  {isSelected && <BiCheck className="text-primary-600 me-auto size-5 shrink-0" />}
                </button>
              );
            })
          )}
        </div>
        {selectedPatient && (
          <Card variant="outlined" padding="sm">
            <div className="flex items-center gap-3">
              <div className="bg-primary-100 text-primary-700 flex size-9 items-center justify-center rounded-full text-sm font-bold">
                {selectedPatient.firstName[0]}
              </div>
              <div>
                <p className="text-surface-900 text-sm font-medium">
                  {selectedPatient.firstName} {selectedPatient.lastName}
                </p>
                <p className="text-surface-500 mt-0.5 text-xs" dir="ltr">
                  {toPersian(selectedPatient.mobileNumber)}
                </p>
              </div>
            </div>
            <div className="text-surface-500 border-surface-100 mt-2 grid grid-cols-2 gap-2 border-t pt-2 text-xs">
              <span>آخرین مراجعه: {selectedPatient.lastVisit}</span>
              <span>تعداد مراجعات: {toPersianDigits(selectedPatient.visitCount)}</span>
            </div>
          </Card>
        )}
      </div>
    );
  }

  function renderServiceStep() {
    if (!selectedPatient) return null;
    const activeServices = services.filter((s) => s.isActive);
    return (
      <div className="flex flex-col gap-3">
        <p className="text-surface-600 text-xs font-medium">
          انتخاب خدمت برای {selectedPatient.firstName} {selectedPatient.lastName}
        </p>
        <div className="mobile:grid-cols-2 grid grid-cols-1 gap-3">
          {activeServices.map((svc) => {
            const isSelected = form.serviceId === svc.id;
            return (
              <button
                key={svc.id}
                onClick={() => handleFormChange("serviceId", svc.id)}
                className={`focus-visible:ring-primary-600/40 relative cursor-pointer rounded-lg border p-3 text-right transition-all outline-none focus-visible:ring-2 ${
                  isSelected
                    ? "border-primary-500 bg-primary-50 shadow-sm"
                    : "border-surface-200 hover:border-surface-300 bg-white hover:shadow-sm"
                }`}
              >
                {isSelected && (
                  <span className="bg-primary-600 absolute end-2 top-2 flex size-5 items-center justify-center rounded-full text-white">
                    <BiCheck className="size-3" />
                  </span>
                )}
                <p className="text-surface-900 text-sm font-medium">{svc.title}</p>
                <p className="text-surface-500 mt-1 text-xs">
                  {toPersianDigits(svc.duration)} دقیقه
                </p>
                <p className="text-primary-700 mt-1 text-xs font-medium">
                  {toPersianDigits(svc.price)} تومان
                </p>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  function renderTimeStep() {
    if (!selectedPatient || !selectedService) return null;
    return (
      <div className="flex flex-col gap-4">
        <Card variant="outlined" padding="sm">
          <div className="text-surface-700 flex items-center gap-2 text-sm">
            <span className="font-medium">
              {selectedPatient.firstName} {selectedPatient.lastName}
            </span>
            <BiChevronLeft className="text-surface-300 size-4" />
            <span className="text-primary-700 font-medium">{selectedService.title}</span>
            <span className="text-surface-400 me-auto text-xs">
              {toPersianDigits(selectedService.duration)} دقیقه
            </span>
          </div>
        </Card>

        <div className="border-surface-200 flex items-center justify-between rounded-lg border px-3 py-2">
          <button
            onClick={handlePrevMonth}
            className="text-surface-400 hover:text-surface-600 cursor-pointer rounded p-0.5 transition-colors"
            aria-label="ماه قبل"
          >
            <BiChevronRight className="size-4" />
          </button>
          <span className="text-surface-800 text-sm font-medium select-none">
            {PERSIAN_MONTHS[persian.month - 1]} {toPersianDigits(persian.year)}
          </span>
          <button
            onClick={handleNextMonth}
            className="text-surface-400 hover:text-surface-600 cursor-pointer rounded p-0.5 transition-colors"
            aria-label="ماه بعد"
          >
            <BiChevronLeft className="size-4" />
          </button>
        </div>

        <div className="flex flex-col gap-0.5">
          <div className="mb-1 grid grid-cols-7">
            {WEEKDAYS.map((wd) => (
              <div
                key={wd}
                className="text-surface-400 py-1 text-center text-[10px] font-medium select-none"
              >
                {wd}
              </div>
            ))}
          </div>
          {stepGrid.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 gap-0.5">
              {week.map((cell, ci) => {
                if (!cell.date) return <div key={ci} className="h-8" />;
                const isSelected = form.date === cell.date;
                const hasAvailability = selectedService ? cell.available : true;
                return (
                  <button
                    key={ci}
                    disabled={!hasAvailability}
                    onClick={() => {
                      handleFormChange("date", cell.date);
                      handleFormChange("time", "");
                    }}
                    className={`focus-visible:ring-primary-500/40 h-8 cursor-pointer rounded text-center text-xs transition-colors outline-none focus-visible:ring-2 ${
                      isSelected
                        ? "bg-primary-600 font-bold text-white shadow-sm"
                        : hasAvailability
                          ? "text-surface-700 hover:bg-surface-100"
                          : "text-surface-300 cursor-not-allowed"
                    }`}
                  >
                    {toPersianDigits(cell.day)}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {form.date && (
          <div>
            <p className="text-surface-700 mb-2 text-xs font-medium">
              ساعت‌های موجود برای{" "}
              {(() => {
                const parts = form.date.split("/");
                return `${toPersianDigits(parseInt(parts[2]))} ${PERSIAN_MONTHS[parseInt(parts[1]) - 1]}`;
              })()}
              :
            </p>
            {availableBlocks.length === 0 ? (
              <p className="text-surface-400 py-3 text-center text-xs">
                هیچ وقت خالی در این روز وجود ندارد
              </p>
            ) : (
              <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto">
                {availableBlocks.map((block, idx) => {
                  const startStr = minutesToTimeStr(block.start);
                  const label = `${minutesToTimeStrPersian(block.start)} - ${minutesToTimeStrPersian(block.end)}`;
                  const isActive = form.time === startStr;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleFormChange("time", startStr)}
                      className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                        isActive
                          ? "border-primary-500 bg-primary-50 text-primary-700 font-medium"
                          : "border-surface-200 hover:border-surface-300 text-surface-600 hover:bg-surface-50"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="mt-3">
              <Textarea
                label="توضیحات (اختیاری)"
                placeholder="توضیحات اضافی..."
                value={form.notes}
                onChange={(e) => handleFormChange("notes", e.target.value)}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 sm:gap-6">
        <div className="flex items-center justify-between">
          <Skeleton width="160px" height="2rem" />
          <div className="flex gap-2">
            <Skeleton width="120px" height="2.5rem" variant="rectangular" />
            <Skeleton width="120px" height="2.5rem" variant="rectangular" />
          </div>
        </div>
        <div className="grid gap-6 xl:grid-cols-4">
          <div className="xl:col-span-3">
            <Skeleton width="100%" height="380px" variant="rectangular" />
          </div>
          <div>
            <Skeleton width="100%" height="300px" variant="rectangular" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-surface-900 text-2xl font-bold">تقویم نوبت‌ها</h1>
        </div>
        <div className="mt-3 flex items-center gap-3 sm:mt-0">
          <Button
            variant="primary"
            startIcon={<BiPlus className="size-5" />}
            onClick={handleOpenModal}
          >
            نوبت جدید
          </Button>
          <SearchButton />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-4">
        <div className="xl:col-span-3">
          <Card variant="outlined" padding="none">
            <div className="border-surface-200 flex items-center justify-between gap-2 border-b px-4 py-3">
              <div className="flex items-center gap-1">
                <button
                  onClick={handlePrevMonth}
                  className="text-surface-500 hover:text-surface-700 hover:bg-surface-100 cursor-pointer rounded-lg p-1 transition-colors"
                  aria-label="ماه قبل"
                >
                  <BiChevronRight className="size-5" />
                </button>
                <button
                  onClick={handleNextMonth}
                  className="text-surface-500 hover:text-surface-700 hover:bg-surface-100 cursor-pointer rounded-lg p-1 transition-colors"
                  aria-label="ماه بعد"
                >
                  <BiChevronLeft className="size-5" />
                </button>
              </div>
              <span className="text-surface-900 text-sm font-semibold select-none">
                {PERSIAN_MONTHS[persian.month - 1]} {toPersianDigits(persian.year)}
              </span>
              <button
                onClick={handleGoToToday}
                className="text-primary-600 hover:bg-primary-50 cursor-pointer rounded-lg px-2.5 py-1 text-xs font-medium transition-colors"
              >
                امروز
              </button>
            </div>

            <div className="p-3">
              <div className="mb-1 grid grid-cols-7">
                {WEEKDAYS.map((wd) => (
                  <div
                    key={wd}
                    className="text-surface-500 py-1 text-center text-[11px] font-medium select-none"
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
                        return <div key={ci} className="mobile:h-14 h-12" />;
                      }

                      const todayStyle =
                        cell.isToday && !cell.isSelected
                          ? "ring-2 ring-primary-400 ring-inset rounded-lg font-bold"
                          : "";
                      const selectedStyle = cell.isSelected
                        ? "bg-primary-600 text-white font-bold rounded-lg shadow-sm"
                        : "";
                      const hoverStyle =
                        !cell.isToday && !cell.isSelected ? "hover:bg-surface-50 rounded-lg" : "";

                      const badgeStyle = cell.isSelected
                        ? "bg-white/20 text-white"
                        : "bg-primary-100 text-primary-700";

                      return (
                        <button
                          key={ci}
                          onClick={() => handleSelectDate(cell.date)}
                          className={`focus-visible:ring-primary-600/40 mobile:h-14 relative flex h-12 cursor-pointer flex-col items-center justify-center text-sm transition-colors outline-none focus-visible:ring-2 ${selectedStyle || todayStyle || hoverStyle}`}
                        >
                          <span className="leading-none">{toPersianDigits(cell.day)}</span>
                          {cell.appointments.length > 0 && (
                            <span
                              className={`mt-0.5 inline-flex min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] leading-4 font-medium ${badgeStyle}`}
                            >
                              {toPersianDigits(cell.appointments.length)}
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
          <Card variant="outlined" padding="md">
            <div className="mb-3 flex items-center gap-2">
              <BiCalendar className="text-primary-600 size-4" />
              <h3 className="text-surface-900 text-xs font-semibold">{selectedDateDisplay}</h3>
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
              <div className="flex flex-col gap-2">
                {selectedDayAppointments.map((appt) => {
                  const status = statusConfig[appt.status];
                  const isExpanded = selectedAppointment?.id === appt.id;

                  return (
                    <button
                      key={appt.id}
                      onClick={() => setSelectedAppointment(isExpanded ? null : appt)}
                      className={`focus-visible:ring-primary-600/40 w-full cursor-pointer rounded-lg border p-2.5 text-right transition-all outline-none focus-visible:ring-2 ${
                        isExpanded
                          ? "border-primary-400 bg-primary-50/50 shadow-sm"
                          : "border-surface-200 hover:border-surface-300 bg-white hover:shadow-sm"
                      }`}
                    >
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <div className="text-surface-500 flex items-center gap-1 text-[11px]">
                          <BiTime className="size-3" />
                          <span>{appt.time}</span>
                        </div>
                        <Badge variant={status.variant} size="sm">
                          {status.label}
                        </Badge>
                      </div>
                      <p className="text-surface-900 text-xs font-medium">{appt.patient?.firstName} {appt.patient?.lastName}</p>
                      {isExpanded && (
                        <div className="border-surface-200 text-surface-500 mt-1.5 flex flex-col gap-1 border-t pt-1.5 text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <BiNote className="text-surface-400 size-3" />
                            <span>{appt.service?.title}</span>
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
        size="2xl"
        footer={
          wizardStep === "time" ? (
            <>
              <Button variant="ghost" onClick={handleWizardBack}>
                قبلی
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmitForm}
                disabled={!form.time || isCreating}
              >
                {isCreating ? "در حال ثبت..." : "ثبت نوبت"}
              </Button>
            </>
          ) : wizardStep === "service" ? (
            <>
              <Button variant="ghost" onClick={handleWizardBack}>
                قبلی
              </Button>
              <Button variant="primary" onClick={handleWizardNext} disabled={!form.serviceId}>
                بعدی
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={handleCloseModal}>
                انصراف
              </Button>
              <Button variant="primary" onClick={handleWizardNext} disabled={!form.patientId}>
                بعدی
              </Button>
            </>
          )
        }
      >
        {renderStepIndicator()}
        <AnimatePresence mode="wait">
          <motion.div
            key={wizardStep}
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            transition={{ duration: 0.15 }}
          >
            {wizardStep === "patient" && renderPatientStep()}
            {wizardStep === "service" && renderServiceStep()}
            {wizardStep === "time" && renderTimeStep()}
          </motion.div>
        </AnimatePresence>
      </Modal>
    </div>
  );
}

export default Calendar;
