import { useQueries } from "@tanstack/react-query";
import jalaali from "jalaali-js";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { BiCheck, BiCheckCircle } from "react-icons/bi";
import { IoCallOutline } from "react-icons/io5";

import { useCreatePayment, useServicesList, useVisitsList } from "../../hooks/api";
import { extractApiError } from "../../lib/api-error";
import { jalaliToGregorianISO } from "../../lib/date";
import { queryKeys } from "../../lib/query-keys";
import * as customersService from "../../services/customers";
import type { PaymentMethod } from "../../types/accounting";
import type { Appointment } from "../../types/appointment";
import { Alert } from "../ui/Alert";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { JalaliDatePicker } from "../ui/JalaliDatePicker";
import { Modal } from "../ui/Modal";
import { Select } from "../ui/Select";
import { Spinner } from "../ui/Spinner";

const paymentOptions = [
  { value: "cash", label: "نقدی" },
  { value: "card", label: "کارت خوان" },
  { value: "transfer", label: "کارت به کارت" },
];

const formatPrice = (amount: number) => amount.toLocaleString("fa-IR");

function getDefaultJalaliDate(): string {
  const now = new Date();
  const { jy, jm, jd } = jalaali.toJalaali(now);
  return `${jy}/${String(jm).padStart(2, "0")}/${String(jd).padStart(2, "0")}`;
}

interface CustomerInfo {
  name: string;
  mobile: string;
}

function getDisplayName(visit: Appointment, customerMap: Map<number, CustomerInfo>): string {
  if (visit.customerName) return visit.customerName;
  const info = customerMap.get(visit.customer);
  if (info?.name) return info.name;
  return `بیمار شماره ${visit.customer}`;
}

function getDisplayMobile(visit: Appointment, customerMap: Map<number, CustomerInfo>): string {
  if (visit.customerMobile) return visit.customerMobile;
  const info = customerMap.get(visit.customer);
  return info?.mobile ?? "";
}

type WizardStep = "visit" | "payment";

interface AddTransactionModalProps {
  open: boolean;
  onClose: () => void;
}

export function AddTransactionModal({ open, onClose }: AddTransactionModalProps) {
  const [selectedDate, setSelectedDate] = useState(getDefaultJalaliDate());
  const [wizardStep, setWizardStep] = useState<WizardStep>("visit");
  const [selectedVisitId, setSelectedVisitId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const isoDate = useMemo(() => jalaliToGregorianISO(selectedDate), [selectedDate]);

  const { data: paginatedVisits, isLoading: visitsLoading } = useVisitsList({
    dateFrom: isoDate,
    dateTo: isoDate,
    perPage: 200,
  });
  const { data: servicesData } = useServicesList();
  const { mutateAsync: createPayment, isPending } = useCreatePayment();

  const services = useMemo(() => servicesData?.data ?? [], [servicesData]);
  const allVisits = useMemo(() => paginatedVisits?.data ?? [], [paginatedVisits]);
  const visits = useMemo(() => allVisits.filter((v) => v.status !== "canceled"), [allVisits]);

  const missingCustomerIds = useMemo(() => {
    const ids = visits.filter((v) => !v.customerName && v.customer > 0).map((v) => v.customer);
    return [...new Set(ids)];
  }, [visits]);

  const customerQueries = useQueries({
    queries: missingCustomerIds.map((id) => ({
      queryKey: queryKeys.customers.detail(id),
      queryFn: () => customersService.getCustomer(id),
      enabled: id > 0,
    })),
  });

  const customerMap = useMemo(() => {
    const map = new Map<number, CustomerInfo>();
    customerQueries.forEach((query, i) => {
      if (query.data) {
        map.set(missingCustomerIds[i], {
          name: `${query.data.firstName} ${query.data.lastName}`.trim(),
          mobile: query.data.mobileNumber,
        });
      }
    });
    return map;
  }, [customerQueries, missingCustomerIds]);

  const selectedVisit = useMemo(
    () => visits.find((v) => v.id === selectedVisitId),
    [visits, selectedVisitId]
  );

  const amount = useMemo(() => {
    if (!selectedVisit) return 0;
    return services
      .filter((s) => selectedVisit.services.includes(s.id))
      .reduce((sum, s) => sum + s.price, 0);
  }, [selectedVisit, services]);

  const selectedPaymentLabel = paymentOptions.find((o) => o.value === paymentMethod)?.label ?? "";

  const stepIndex = wizardStep === "visit" ? 0 : 1;

  function selectVisit(visitId: number) {
    setSelectedVisitId(visitId);
    setWizardStep("payment");
  }

  function handleWizardBack() {
    setWizardStep("visit");
  }

  async function handleSave() {
    if (!selectedVisit || !selectedDate) return;
    setFormError("");
    try {
      await createPayment({
        patientId: selectedVisit.customer,
        visitId: selectedVisit.id,
        date: jalaliToGregorianISO(selectedDate),
        amount,
        paymentMethod,
        description: description.trim(),
      });
      setShowSuccess(true);
    } catch (err: unknown) {
      setFormError(extractApiError(err));
    }
  }

  function resetForm() {
    setSelectedDate(getDefaultJalaliDate());
    setWizardStep("visit");
    setSelectedVisitId(null);
    setPaymentMethod("cash");
    setDescription("");
    setFormError("");
    setShowSuccess(false);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  function renderStepIndicator() {
    const steps = [
      { key: "visit" as const, label: "ویزیت" },
      { key: "payment" as const, label: "پرداخت" },
    ];
    return (
      <div className="mb-6 flex items-center justify-center gap-0">
        {steps.map((s, i) => {
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
                  {isDone ? <BiCheck className="size-4" /> : String(i + 1)}
                </span>
                <span
                  className={`text-[11px] ${
                    isActive ? "text-primary-700 font-medium" : "text-surface-400"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
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

  function renderVisitStep() {
    return (
      <div className="flex flex-col gap-4">
        <div className="w-full sm:w-56">
          <JalaliDatePicker
            label="تاریخ"
            value={selectedDate}
            onChange={(d) => {
              if (d) {
                setSelectedDate(d);
                setSelectedVisitId(null);
              }
            }}
          />
        </div>

        {visitsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner />
          </div>
        ) : visits.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-sm text-gray-400">
            <span>визиتی در این تاریخ یافت نشد</span>
          </div>
        ) : (
          <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
            {visits.map((visit) => {
              const visitAmount = services
                .filter((s) => visit.services.includes(s.id))
                .reduce((sum, s) => sum + s.price, 0);
              const mobile = getDisplayMobile(visit, customerMap);
              return (
                <div
                  key={visit.id}
                  className={`border-surface-200 hover:border-primary-300 flex cursor-pointer items-center justify-between rounded-lg border bg-white p-3 shadow-sm transition-all hover:shadow-md ${
                    selectedVisitId === visit.id ? "border-primary-500 bg-primary-50/30" : ""
                  }`}
                  onClick={() => selectVisit(visit.id)}
                >
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <span className="text-surface-900 text-sm font-semibold">
                      {getDisplayName(visit, customerMap)}
                    </span>
                    <div className="flex flex-wrap items-center gap-1">
                      {visit.serviceNames.map((name, i) => (
                        <Badge key={i} variant="info" size="sm">
                          {name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-surface-600 text-xs" dir="ltr">
                      {visit.time}
                    </span>
                    {mobile && (
                      <span className="text-surface-600 flex items-center gap-1 text-xs" dir="ltr">
                        <IoCallOutline className="size-3" />
                        {mobile}
                      </span>
                    )}
                    <span className="text-primary-700 text-sm font-bold">
                      {formatPrice(visitAmount)}{" "}
                      <span className="text-primary-500 text-xs">تومان</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  function renderPaymentStep() {
    const mobile = selectedVisit ? getDisplayMobile(selectedVisit, customerMap) : "";
    return (
      <div className="flex flex-col gap-5">
        {selectedVisit && (
          <div className="bg-primary-50/60 border-primary-200 rounded-xl border p-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-primary-800 text-base font-semibold">
                  {getDisplayName(selectedVisit, customerMap)}
                </span>
                {mobile && (
                  <span className="text-primary-600 flex items-center gap-1 text-sm" dir="ltr">
                    <IoCallOutline className="size-3.5" />
                    {mobile}
                  </span>
                )}
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-primary-600 text-sm">{selectedVisit.time}</span>
                <span className="text-primary-500 text-xs">
                  {selectedVisit.serviceNames.join("، ")}
                </span>
              </div>
            </div>
            <div className="mt-3 rounded-xl bg-white p-3 text-center shadow-sm">
              <span className="text-surface-500 text-xs">مبلغ قابل پرداخت</span>
              <div className="text-primary-700 mt-0.5 text-lg font-bold">
                {formatPrice(amount)} تومان
              </div>
            </div>
          </div>
        )}
        <Select
          label="روش پرداخت"
          options={paymentOptions}
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
        />
        <Input
          label="توضیحات (اختیاری)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="توضیحات اضافی..."
        />
      </div>
    );
  }

  function renderSuccessView() {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-6">
        <div className="bg-success-100 rounded-full p-4">
          <BiCheckCircle className="text-success-600 size-16" />
        </div>
        <h3 className="text-surface-900 text-xl font-bold">پرداخت با موفقیت ثبت شد</h3>
        <p className="text-surface-500 max-w-xs text-center text-sm leading-relaxed">
          مبلغ <span className="text-success-600 font-bold">{formatPrice(amount)}</span> تومان برای{" "}
          <span className="font-bold">
            {selectedVisit ? getDisplayName(selectedVisit, customerMap) : ""}
          </span>{" "}
          با روش <span className="font-bold">{selectedPaymentLabel}</span> ثبت گردید.
        </p>
      </div>
    );
  }

  const isValid = !!selectedVisit && amount > 0 && !!paymentMethod;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={showSuccess ? "نتیجه پرداخت" : wizardStep === "visit" ? "انتخاب ویزیت" : "پرداخت"}
      size={wizardStep === "payment" ? "xl" : "lg"}
      footer={
        showSuccess ? (
          <Button variant="primary" onClick={handleClose}>
            بستن
          </Button>
        ) : wizardStep === "payment" ? (
          <>
            <Button variant="ghost" onClick={handleWizardBack}>
              قبلی
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={!isValid || isPending}>
              {isPending ? "در حال ثبت..." : "ثبت پرداخت"}
            </Button>
          </>
        ) : (
          <Button variant="ghost" onClick={handleClose}>
            انصراف
          </Button>
        )
      }
    >
      {showSuccess ? (
        renderSuccessView()
      ) : (
        <>
          {formError && (
            <Alert variant="error" className="mb-4">
              {formError}
            </Alert>
          )}
          {renderStepIndicator()}
          <AnimatePresence mode="wait">
            <motion.div
              key={wizardStep}
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.15 }}
            >
              {wizardStep === "visit" && renderVisitStep()}
              {wizardStep === "payment" && renderPaymentStep()}
            </motion.div>
          </AnimatePresence>
        </>
      )}
    </Modal>
  );
}
