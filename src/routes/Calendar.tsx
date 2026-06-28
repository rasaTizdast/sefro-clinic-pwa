import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import {
  BiCalendar,
  BiCheck,
  BiChevronLeft,
  BiChevronRight,
  BiEdit,
  BiNote,
  BiPlus,
  BiSearch,
  BiSolidTrash,
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
import { useAuth } from "../contexts/AuthContext";
import {
  useCancelVisit,
  useCompleteVisit,
  useConfirmVisit,
  useCustomersList,
  useDeleteVisit,
  useReserveVisit,
  useServicesList,
  useUpdateVisit,
  useVisitsList,
  useWorkTime,
} from "../hooks/api";
import { jalaliToGregorianISO } from "../lib/date";
import { toLatinDigits, toPersianDigits as toPersianDigitsLib } from "../lib/digits";
import { formatPrice } from "../lib/format";
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

const DEFAULT_START_HOUR = 8;
const DEFAULT_END_HOUR = 16;
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
  serviceDuration: number,
  startHour: number = DEFAULT_START_HOUR,
  endHour: number = DEFAULT_END_HOUR
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

  const dayEnd = endHour * 60;
  const freeBlocks: { start: number; end: number }[] = [];
  let cursor = startHour * 60;

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

interface TimelineBlock {
  startMinutes: number;
  endMinutes: number;
  appointment: Appointment | null;
  isEmpty: boolean;
}

function buildDayTimeline(
  appointments: Appointment[],
  startHour: number = DEFAULT_START_HOUR,
  endHour: number = DEFAULT_END_HOUR
): TimelineBlock[] {
  const sorted = [...appointments].sort(
    (a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time)
  );

  const blocks: TimelineBlock[] = [];
  let cursor = startHour * 60;
  const dayEnd = endHour * 60;

  for (const apt of sorted) {
    const aptStart = parseTimeToMinutes(apt.time);
    if (aptStart > cursor) {
      blocks.push({ startMinutes: cursor, endMinutes: aptStart, appointment: null, isEmpty: true });
    }
    const aptEnd = aptStart + apt.duration;
    blocks.push({ startMinutes: aptStart, endMinutes: aptEnd, appointment: apt, isEmpty: false });
    cursor = Math.max(cursor, aptEnd);
  }

  if (cursor < dayEnd) {
    blocks.push({ startMinutes: cursor, endMinutes: dayEnd, appointment: null, isEmpty: true });
  }

  return blocks;
}

function Calendar() {
  const { user } = useAuth();
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

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editAppointment, setEditAppointment] = useState<Appointment | null>(null);
  const [editNotes, setEditNotes] = useState("");

  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const [mobileView, setMobileView] = useState<"timeline" | "list">("list");

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
  const { mutate: updateVisitMutation, isPending: isUpdating } = useUpdateVisit();
  const { mutate: deleteVisitMutation, isPending: isDeleting } = useDeleteVisit();
  const { mutate: confirmVisit } = useConfirmVisit();
  const { mutate: completeVisit } = useCompleteVisit();
  const { mutate: cancelVisit } = useCancelVisit();

  const { data: workTime } = useWorkTime();

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

  const dayRange = useMemo(() => {
    const wtStart = workTime?.startTime
      ? parseTimeToMinutes(workTime.startTime)
      : DEFAULT_START_HOUR * 60;
    const wtEnd = workTime?.endTime ? parseTimeToMinutes(workTime.endTime) : DEFAULT_END_HOUR * 60;

    let minStart = wtStart;
    let maxEnd = wtEnd;

    for (const apt of selectedDayAppointments) {
      const s = parseTimeToMinutes(apt.time);
      const e = s + apt.duration;
      if (s < minStart) minStart = s;
      if (e > maxEnd) maxEnd = e;
    }

    const startHour = Math.floor(minStart / 60);
    const endHour = Math.ceil(maxEnd / 60);

    return {
      startHour,
      endHour,
      startMinutes: startHour * 60,
      endMinutes: endHour * 60,
      totalMinutes: (endHour - startHour) * 60,
    };
  }, [workTime, selectedDayAppointments]);

  const timelineBlocks = useMemo(
    () => buildDayTimeline(selectedDayAppointments, dayRange.startHour, dayRange.endHour),
    [selectedDayAppointments, dayRange.startHour, dayRange.endHour]
  );

  const selectedPatient = form.patientId
    ? (patients.find((p) => p.id === form.patientId) ?? null)
    : null;
  const selectedService = form.serviceId
    ? (services.find((s) => s.id === form.serviceId) ?? null)
    : null;

  const availableBlocks = useMemo(() => {
    if (!selectedService || !form.date) return [];
    const dayApps = allAppointments.filter((a) => a.date === form.date);
    const wtStart = workTime?.startTime
      ? parseTimeToMinutes(workTime.startTime) / 60
      : DEFAULT_START_HOUR;
    const wtEnd = workTime?.endTime ? parseTimeToMinutes(workTime.endTime) / 60 : DEFAULT_END_HOUR;
    return getFreeBlocks(dayApps, selectedService.duration, wtStart, wtEnd);
  }, [selectedService, form.date, allAppointments, workTime]);

  const availableStartTimes = useMemo(() => {
    if (!availableBlocks.length || !selectedService) return [];
    const slots: string[] = [];
    for (const block of availableBlocks) {
      let t = block.start;
      while (t + selectedService.duration <= block.end) {
        slots.push(minutesToTimeStr(t));
        t += selectedService.duration;
      }
    }
    return slots;
  }, [availableBlocks, selectedService]);

  function isBeforeToday(dateStr: string): boolean {
    const parts = dateStr.split("/").map(Number);
    if (parts.length !== 3) return false;
    const d = { year: parts[0], month: parts[1], day: parts[2] };
    if (d.year < todayInfo.year) return true;
    if (d.year === todayInfo.year && d.month < todayInfo.month) return true;
    if (d.year === todayInfo.year && d.month === todayInfo.month && d.day < todayInfo.day)
      return true;
    return false;
  }

  const staffBlocked = (dateStr: string) => user?.role !== "admin" && isBeforeToday(dateStr);

  const stepDaysAvailability = useMemo(() => {
    const wtStart = workTime?.startTime
      ? parseTimeToMinutes(workTime.startTime) / 60
      : DEFAULT_START_HOUR;
    const wtEnd = workTime?.endTime ? parseTimeToMinutes(workTime.endTime) / 60 : DEFAULT_END_HOUR;

    function blocked(dateStr: string) {
      if (user?.role === "admin") return false;
      const parts = dateStr.split("/").map(Number);
      if (parts.length !== 3) return false;
      if (parts[0] < todayInfo.year) return true;
      if (parts[0] === todayInfo.year && parts[1] < todayInfo.month) return true;
      if (parts[0] === todayInfo.year && parts[1] === todayInfo.month && parts[2] < todayInfo.day)
        return true;
      return false;
    }
    const days: Record<string, boolean> = {};
    const daysInMonth = getPersianMonthDays(persian.month, persian.year);
    if (!selectedService) {
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${persian.year}/${persian.month}/${day}`;
        days[dateStr] = !blocked(dateStr);
      }
      return days;
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${persian.year}/${persian.month}/${day}`;
      if (blocked(dateStr)) {
        days[dateStr] = false;
        continue;
      }
      const dayApps = allAppointments.filter((a) => a.date === dateStr);
      days[dateStr] = getFreeBlocks(dayApps, selectedService.duration, wtStart, wtEnd).length > 0;
    }
    return days;
  }, [persian.year, persian.month, allAppointments, selectedService, user, todayInfo, workTime]);

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
    if (staffBlocked(form.date)) return;
    reserveVisit(
      {
        customer: selectedPatient.id,
        services: [selectedService.id],
        date: jalaliToGregorianISO(form.date),
        time: form.time,
        notes: form.notes || undefined,
      },
      { onSuccess: () => handleCloseModal() }
    );
  }

  function handleOpenEdit(appt: Appointment) {
    setEditAppointment(appt);
    setEditNotes(appt.notes);
    setEditModalOpen(true);
  }

  function handleCloseEdit() {
    setEditModalOpen(false);
    setEditAppointment(null);
  }

  function handleSaveEdit() {
    if (!editAppointment) return;
    updateVisitMutation(
      {
        id: editAppointment.id,
        data: {
          notes: editNotes || undefined,
        },
      },
      { onSuccess: () => handleCloseEdit() }
    );
  }

  function handleDeleteConfirm(id: number) {
    setDeleteConfirmId(id);
  }

  function handleDeleteExecute() {
    if (deleteConfirmId === null) return;
    deleteVisitMutation(deleteConfirmId, {
      onSuccess: () => {
        setDeleteConfirmId(null);
        setSelectedAppointment(null);
      },
    });
  }

  function handleStatusAction(action: "confirm" | "complete" | "cancel", id: number) {
    const callbacks = { onSuccess: () => setSelectedAppointment(null) };
    if (action === "confirm") confirmVisit(id, callbacks);
    else if (action === "complete") completeVisit(id, callbacks);
    else if (action === "cancel") cancelVisit(id, callbacks);
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
        <div className="grid gap-6 xl:grid-cols-5">
          <div className="xl:col-span-3">
            <Skeleton width="100%" height="380px" variant="rectangular" />
          </div>
          <div className="xl:col-span-2">
            <Skeleton width="100%" height="380px" variant="rectangular" />
          </div>
        </div>
      </div>
    );
  }

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
                  {formatPrice(svc.price)} تومان
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

    const occupiedTimes = form.date
      ? allAppointments.filter((a) => a.date === form.date).map((a) => a.time)
      : [];

    function handleTimeInput(e: React.ChangeEvent<HTMLInputElement>) {
      handleFormChange("time", e.target.value);
    }

    const dateLabel = form.date
      ? (() => {
          const parts = form.date.split("/");
          return `${toPersianDigits(parseInt(parts[2]))} ${PERSIAN_MONTHS[parseInt(parts[1]) - 1]}`;
        })()
      : "";

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
                const isToday = cell.date === todayStr;
                const hasAvailability = selectedService ? cell.available : true;
                const todayRing =
                  isToday && !isSelected ? "ring-2 ring-primary-300 ring-inset" : "";
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
                          ? `text-surface-700 hover:bg-surface-100 ${todayRing}`
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
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-surface-700 mb-1.5 block text-xs font-medium">
                  ساعت {dateLabel}
                </label>
                <Input
                  type="time"
                  value={form.time}
                  onChange={handleTimeInput}
                  containerClassName="w-full"
                />
              </div>
            </div>

            {availableStartTimes.length > 0 && (
              <div>
                <p className="text-surface-500 mb-2 text-xs">ساعت‌های پیشنهادی:</p>
                <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
                  {availableStartTimes.map((slot) => {
                    const isOccupied = occupiedTimes.includes(slot);
                    const isActive = form.time === slot;
                    const disabled = isOccupied;
                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={disabled}
                        onClick={() => handleFormChange("time", slot)}
                        className={`cursor-pointer rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                          isActive
                            ? "border-primary-500 bg-primary-50 text-primary-700 font-medium"
                            : disabled
                              ? "border-surface-100 text-surface-300 cursor-not-allowed line-through"
                              : "border-surface-200 hover:border-surface-300 text-surface-600 hover:bg-surface-50"
                        }`}
                      >
                        {minutesToTimeStrPersian(parseTimeToMinutes(slot))}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {availableStartTimes.length === 0 && form.date && (
              <p className="text-surface-400 py-2 text-center text-xs">
                هیچ وقت خالی در این روز وجود ندارد
              </p>
            )}

            <Textarea
              label="توضیحات (اختیاری)"
              placeholder="توضیحات اضافی..."
              value={form.notes}
              onChange={(e) => handleFormChange("notes", e.target.value)}
              rows={2}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-surface-900 text-2xl font-bold">تقویم نوبت‌ها</h1>
          <p className="text-surface-500 mt-0.5 text-sm">مدیریت و مشاهده نوبت‌ها</p>
        </div>
        <div className="flex items-center gap-3">
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

      <Card variant="outlined" padding="md">
        <div className="mb-3 flex items-center gap-2">
          <BiCalendar className="text-primary-600 size-4" />
          <h3 className="text-surface-900 text-xs font-semibold">{selectedDateDisplay}</h3>
          {selectedDayAppointments.length > 0 && (
            <span className="text-surface-400 me-auto text-xs">
              {toPersianDigits(selectedDayAppointments.length)} نوبت
            </span>
          )}
        </div>

        <div className="pb-1" dir="ltr">
          <div className="flex flex-col">
            <div className="text-surface-500 mb-1 flex justify-between text-[10px]">
              {Array.from({ length: dayRange.endHour - dayRange.startHour + 1 }, (_, i) => (
                <div key={i}>{minutesToTimeStrPersian((dayRange.startHour + i) * 60)}</div>
              ))}
            </div>
            <div className="bg-surface-100/50 flex h-14 w-full rounded-lg">
              {timelineBlocks.map((block, i) => {
                const pct = ((block.endMinutes - block.startMinutes) / dayRange.totalMinutes) * 100;
                if (block.isEmpty) {
                  const isFirst = i === 0;
                  const isLast = i === timelineBlocks.length - 1;
                  const startEdge = isFirst ? "" : "border-l border-dashed border-surface-300";
                  const endEdge = isLast ? "" : "border-e border-dashed border-surface-300";
                  return (
                    <div
                      key={i}
                      className={`relative h-full shrink-0 ${startEdge} ${endEdge}`}
                      style={{
                        width: `${pct}%`,
                        background: `repeating-linear-gradient(
                          45deg,
                          transparent,
                          transparent 10px,
                          var(--color-surface-200) 10px,
                          var(--color-surface-200) 20px
                        )`,
                      }}
                    />
                  );
                }
                const apt = block.appointment!;
                const status = statusConfig[apt.status];
                const colorMap: Record<StatusVariant, string> = {
                  success: "bg-success-200 border-success-400 text-success-900",
                  warning: "bg-warning-200 border-warning-400 text-warning-900",
                  danger: "bg-danger-200 border-danger-400 text-danger-900",
                  info: "bg-info-200 border-info-400 text-info-900",
                };
                return (
                  <button
                    key={i}
                    onClick={() =>
                      setSelectedAppointment(selectedAppointment?.id === apt.id ? null : apt)
                    }
                    className={`shrink-0 cursor-pointer overflow-hidden rounded-md border text-right text-xs font-medium transition-all hover:shadow-md ${
                      colorMap[status.variant]
                    } ${selectedAppointment?.id === apt.id ? "ring-primary-500 z-10 scale-[1.02] shadow-md ring-2" : ""}`}
                    style={{ width: `${Math.max(pct, 2)}%` }}
                    title={`${apt.customerName} - ${apt.serviceNames?.[0] ?? ""}`}
                  >
                    <span className="block truncate px-1.5 pt-1 leading-tight">
                      {apt.customerName}
                    </span>
                    <span className="block truncate px-1.5 text-[9px] leading-tight opacity-80">
                      {apt.time} {apt.serviceNames?.[0] ? `• ${apt.serviceNames[0]}` : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <Card variant="outlined" padding="none">
            <div className="border-surface-200 flex items-center justify-between gap-2 border-b px-4 py-3">
              <div className="flex items-center gap-1">
                <button
                  onClick={handlePrevMonth}
                  className="text-surface-500 hover:text-surface-700 hover:bg-surface-100 cursor-pointer rounded-lg p-1.5 transition-colors"
                  aria-label="ماه قبل"
                >
                  <BiChevronRight className="size-5" />
                </button>
                <button
                  onClick={handleNextMonth}
                  className="text-surface-500 hover:text-surface-700 hover:bg-surface-100 cursor-pointer rounded-lg p-1.5 transition-colors"
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

                      const badgeStyle = cell.isSelected
                        ? "bg-white/20 text-white"
                        : "bg-primary-100 text-primary-700";

                      return (
                        <button
                          key={ci}
                          onClick={() => handleSelectDate(cell.date)}
                          className={`focus-visible:ring-primary-600/40 mobile:h-14 relative flex h-12 cursor-pointer flex-col items-center justify-center text-sm transition-colors outline-none focus-visible:ring-2 ${selectedStyle || todayStyle}`}
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

        <div className="flex flex-col gap-4 xl:col-span-2">
          <div className="hidden max-sm:block">
            <div className="border-surface-200 mb-3 flex overflow-hidden rounded-lg border">
              <button
                onClick={() => setMobileView("list")}
                className={`flex-1 cursor-pointer py-2 text-center text-xs font-medium transition-colors ${
                  mobileView === "list"
                    ? "bg-primary-600 text-white"
                    : "text-surface-600 hover:bg-surface-50"
                }`}
              >
                لیست نوبت‌ها
              </button>
              <button
                onClick={() => setMobileView("timeline")}
                className={`flex-1 cursor-pointer py-2 text-center text-xs font-medium transition-colors ${
                  mobileView === "timeline"
                    ? "bg-primary-600 text-white"
                    : "text-surface-600 hover:bg-surface-50"
                }`}
              >
                جزئیات نوبت
              </button>
            </div>
          </div>

          <div className="max-sm:hidden">
            <Card variant="outlined" padding="none">
              <div className="border-surface-200 border-b px-4 py-2.5">
                <h3 className="text-surface-900 text-xs font-semibold">نوبت‌های امروز</h3>
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
                <div className="flex flex-col gap-0 p-3">
                  {selectedDayAppointments.map((appt) => renderAppointmentCard(appt))}
                </div>
              )}
            </Card>
          </div>

          <div className="sm:hidden">
            {mobileView === "list" && (
              <Card variant="outlined" padding="none">
                <div className="border-surface-200 border-b px-4 py-2.5">
                  <h3 className="text-surface-900 text-xs font-semibold">نوبت‌های امروز</h3>
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
                  <div className="flex flex-col gap-0 p-3">
                    {selectedDayAppointments.map((appt) => renderAppointmentCard(appt))}
                  </div>
                )}
              </Card>
            )}
            {mobileView === "timeline" && (
              <Card variant="outlined" padding="md">
                {selectedAppointment ? (
                  renderDetailView(selectedAppointment)
                ) : (
                  <div className="flex flex-col items-center gap-3 py-8 text-center">
                    <BiNote className="text-surface-300 size-10" />
                    <p className="text-surface-500 text-sm">
                      روی یک نوبت در تایم‌لاین بالا کلیک کنید
                    </p>
                  </div>
                )}
              </Card>
            )}
          </div>
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

      <Modal
        open={editModalOpen}
        onClose={handleCloseEdit}
        title={editAppointment ? `ویرایش نوبت ${editAppointment.customerName}` : ""}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={handleCloseEdit}>
              انصراف
            </Button>
            <Button variant="primary" onClick={handleSaveEdit} disabled={isUpdating}>
              {isUpdating ? "در حال ذخیره..." : "ذخیره تغییرات"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Card variant="outlined" padding="sm">
            {(() => {
              const editPatient = editAppointment
                ? patients.find((p) => p.id === editAppointment.customer)
                : undefined;
              const editName = editPatient
                ? `${editPatient.firstName} ${editPatient.lastName}`
                : (editAppointment?.customerName ?? "?");
              const editMobile = editPatient
                ? editPatient.mobileNumber
                : (editAppointment?.customerMobile ?? "");
              return (
                <div className="flex items-center gap-3">
                  <div className="bg-primary-100 text-primary-700 flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold">
                    {editName[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-surface-900 text-sm font-medium">{editName}</p>
                    {editMobile && (
                      <p className="text-surface-500 mt-0.5 text-xs" dir="ltr">
                        {toPersian(editMobile)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })()}
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-surface-500 mb-1 text-[11px] font-medium">خدمت</p>
              <div className="text-surface-700 bg-surface-50 rounded-lg px-3 py-2.5 text-sm">
                {editAppointment?.serviceNames?.[0] ?? "—"}
              </div>
            </div>
            <div>
              <p className="text-surface-500 mb-1 text-[11px] font-medium">زمان</p>
              <div className="text-surface-700 bg-surface-50 rounded-lg px-3 py-2.5 text-sm">
                {editAppointment?.time ?? "—"}
                {editAppointment != null && editAppointment.duration > 0 && (
                  <span className="text-surface-400 me-2">
                    ({toPersianDigits(editAppointment.duration)} دقیقه)
                  </span>
                )}
              </div>
            </div>
          </div>

          <Textarea
            label="توضیحات"
            placeholder="توضیحات نوبت..."
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            rows={3}
          />
        </div>
      </Modal>

      <Modal
        open={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        title="حذف نوبت"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteConfirmId(null)}>
              انصراف
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteExecute}
              loading={isDeleting}
              startIcon={<BiSolidTrash className="size-4" />}
            >
              {isDeleting ? "در حال حذف..." : "حذف نوبت"}
            </Button>
          </>
        }
      >
        <p className="text-surface-600 text-sm leading-relaxed">
          آیا از حذف این نوبت مطمئن هستید؟ این عمل قابل بازگشت نیست.
        </p>
      </Modal>
    </div>
  );

  function renderAppointmentCard(appt: Appointment) {
    const status = statusConfig[appt.status];
    const isExpanded = selectedAppointment?.id === appt.id;
    const isAdmin = user?.role === "admin";
    const patient = patients.find((p) => p.id === appt.customer);
    const displayName = patient ? `${patient.firstName} ${patient.lastName}` : appt.customerName;
    const displayMobile = patient ? patient.mobileNumber : appt.customerMobile;

    return (
      <div key={appt.id} className="border-surface-100 rounded-lg border p-2.5">
        <button
          onClick={() => setSelectedAppointment(isExpanded ? null : appt)}
          className={`focus-visible:ring-primary-600/40 w-full cursor-pointer rounded-lg px-3 py-2.5 text-right transition-all outline-none focus-visible:ring-2 ${
            isExpanded ? "bg-primary-50/50 shadow-sm" : "hover:bg-surface-50"
          }`}
        >
          <div className="mb-1 flex items-center justify-between gap-2">
            <div className="text-surface-500 flex items-center gap-1 text-[11px]">
              <BiTime className="size-3" />
              <span>{appt.time}</span>
              {appt.duration > 0 && (
                <span className="text-surface-400">({toPersianDigits(appt.duration)} دقیقه)</span>
              )}
            </div>
            <Badge variant={status.variant} size="sm">
              {status.label}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-surface-900 truncate text-xs font-medium">{displayName}</p>
            {displayMobile && (
              <span className="text-surface-500 shrink-0 text-[10px]" dir="ltr">
                {toPersian(displayMobile)}
              </span>
            )}
          </div>
          {appt.serviceNames && appt.serviceNames.length > 0 && (
            <p className="text-surface-500 mt-0.5 truncate text-[11px]">
              {appt.serviceNames.join("، ")}
            </p>
          )}
        </button>

        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <div className="border-surface-100 mx-3 mb-2 space-y-3 rounded-lg border bg-white p-3">
                {appt.notes && (
                  <div>
                    <p className="text-surface-500 mb-1 text-[11px] font-medium">توضیحات:</p>
                    <p className="text-surface-700 text-xs leading-relaxed break-words whitespace-pre-wrap">
                      {appt.notes}
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  {appt.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleStatusAction("confirm", appt.id)}
                      >
                        تأیید نوبت
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleStatusAction("cancel", appt.id)}
                      >
                        لغو
                      </Button>
                    </>
                  )}
                  {appt.status === "confirmed" && (
                    <>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleStatusAction("complete", appt.id)}
                      >
                        انجام شد
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleStatusAction("cancel", appt.id)}
                      >
                        لغو
                      </Button>
                    </>
                  )}
                  <div className="me-auto" />
                  <Button
                    size="sm"
                    variant="outline"
                    startIcon={<BiEdit className="size-3.5" />}
                    onClick={() => handleOpenEdit(appt)}
                  >
                    ویرایش
                  </Button>
                  {isAdmin && (
                    <Button
                      size="sm"
                      variant="ghost"
                      startIcon={<BiSolidTrash className="size-3.5" />}
                      onClick={() => handleDeleteConfirm(appt.id)}
                      className="text-danger-600 hover:text-danger-700 hover:bg-danger-50"
                    >
                      حذف
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  function renderDetailView(appt: Appointment) {
    const status = statusConfig[appt.status];
    const isAdmin = user?.role === "admin";

    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-surface-900 text-sm font-medium">{appt.customerName}</p>
            {appt.customerMobile && (
              <p className="text-surface-400 mt-0.5 text-xs" dir="ltr">
                {toPersian(appt.customerMobile)}
              </p>
            )}
            <p className="text-surface-500 mt-0.5 text-xs">
              {appt.time}
              {appt.duration > 0 && ` (${toPersianDigits(appt.duration)} دقیقه)`}
            </p>
          </div>
          <Badge variant={status.variant} size="sm">
            {status.label}
          </Badge>
        </div>

        {appt.serviceNames && appt.serviceNames.length > 0 && (
          <div>
            <p className="text-surface-500 mb-1 text-[11px] font-medium">خدمات:</p>
            <div className="flex flex-wrap gap-1.5">
              {appt.serviceNames.map((name, i) => (
                <span
                  key={i}
                  className="bg-info-50 text-info-700 rounded-md px-2 py-0.5 text-[11px] font-medium"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}

        {appt.notes && (
          <div>
            <p className="text-surface-500 mb-1 text-[11px] font-medium">توضیحات:</p>
            <p className="text-surface-700 text-xs leading-relaxed break-words whitespace-pre-wrap">
              {appt.notes}
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {appt.status === "pending" && (
            <>
              <Button
                size="sm"
                variant="primary"
                onClick={() => handleStatusAction("confirm", appt.id)}
              >
                تأیید نوبت
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleStatusAction("cancel", appt.id)}
              >
                لغو
              </Button>
            </>
          )}
          {appt.status === "confirmed" && (
            <>
              <Button
                size="sm"
                variant="primary"
                onClick={() => handleStatusAction("complete", appt.id)}
              >
                انجام شد
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleStatusAction("cancel", appt.id)}
              >
                لغو
              </Button>
            </>
          )}
          <div className="me-auto" />
          <Button
            size="sm"
            variant="outline"
            startIcon={<BiEdit className="size-3.5" />}
            onClick={() => handleOpenEdit(appt)}
          >
            ویرایش
          </Button>
          {isAdmin && (
            <Button
              size="sm"
              variant="ghost"
              startIcon={<BiSolidTrash className="size-3.5" />}
              onClick={() => handleDeleteConfirm(appt.id)}
              className="text-danger-600 hover:text-danger-700 hover:bg-danger-50"
            >
              حذف
            </Button>
          )}
        </div>
      </div>
    );
  }
}

export default Calendar;
