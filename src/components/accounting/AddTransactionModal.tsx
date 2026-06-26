import jalaali from "jalaali-js";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useRef, useState } from "react";
import { BiCheck, BiPlus, BiSearch } from "react-icons/bi";

import { useVisitsList } from "../../hooks/api";
import { toPersianDigits } from "../../lib/digits";
import type { PaymentMethod, TransactionFormData } from "../../types/accounting";
import type { Service } from "../../types/service";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { Select } from "../ui/Select";

type WizardStep = "visit" | "payment";

const STEP_LABELS: { key: WizardStep; label: string }[] = [
  { key: "visit", label: "ویزیت" },
  { key: "payment", label: "پرداخت" },
];

const paymentOptions = [
  { value: "cash", label: "نقدی" },
  { value: "card", label: "کارت خوان" },
  { value: "transfer", label: "کارت به کارت" },
];

interface AddTransactionModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: TransactionFormData) => void;
  services: Service[];
}

function getDefaultJalaliDate(): string {
  const now = new Date();
  const { jy, jm, jd } = jalaali.toJalaali(now);
  return `${jy}/${String(jm).padStart(2, "0")}/${String(jd).padStart(2, "0")}`;
}

const defaultDate = getDefaultJalaliDate();

export function AddTransactionModal({ open, onClose, onSave, services }: AddTransactionModalProps) {
  const [wizardStep, setWizardStep] = useState<WizardStep>("visit");
  const [date, setDate] = useState<string>(defaultDate);
  const [visitSearch, setVisitSearch] = useState("");
  const [selectedVisitId, setSelectedVisitId] = useState<number | null>(null);
  const [showVisitDropdown, setShowVisitDropdown] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [description, setDescription] = useState("");
  const visitRef = useRef<HTMLDivElement>(null);

  const { data: paginatedVisits } = useVisitsList({ perPage: 200 });
  const visits = useMemo(() => paginatedVisits?.data ?? [], [paginatedVisits]);

  const stepIndex = STEP_LABELS.findIndex((s) => s.key === wizardStep);

  const filteredVisits = useMemo(
    () =>
      visitSearch
        ? visits.filter((v) =>
            `${v.customerName}${v.date}${v.serviceNames.join(" ")}`
              .toLowerCase()
              .includes(visitSearch.toLowerCase())
          )
        : [],
    [visits, visitSearch]
  );

  const selectedVisit = useMemo(
    () => visits.find((v) => v.id === selectedVisitId),
    [visits, selectedVisitId]
  );

  const amount = useMemo(() => {
    if (!selectedVisit) return "";
    const total = services
      .filter((s) => selectedVisit.services.includes(s.id))
      .reduce((sum, s) => sum + s.price, 0);
    return total > 0 ? String(total) : "";
  }, [selectedVisit, services]);

  function selectVisit(visitId: number) {
    setSelectedVisitId(visitId);
    const v = visits.find((vi) => vi.id === visitId);
    if (v) {
      setVisitSearch(`${v.customerName} — ${v.date} ${v.time}`);
    }
    setShowVisitDropdown(false);
  }

  function handleVisitInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setVisitSearch(e.target.value);
    setSelectedVisitId(null);
    setShowVisitDropdown(true);
  }

  function handleVisitInputBlur() {
    setTimeout(() => setShowVisitDropdown(false), 200);
  }

  function handleVisitInputFocus() {
    if (!selectedVisitId) {
      setShowVisitDropdown(true);
    }
  }

  function handleVisitKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === "Backspace" || e.key === "Delete") && selectedVisitId) {
      setVisitSearch("");
      setSelectedVisitId(null);
    }
  }

  function handleWizardNext() {
    if (wizardStep === "visit" && selectedVisitId) {
      setWizardStep("payment");
    }
  }

  function handleWizardBack() {
    if (wizardStep === "payment") {
      setWizardStep("visit");
    }
  }

  function resetForm() {
    setWizardStep("visit");
    setDate(defaultDate);
    setVisitSearch("");
    setSelectedVisitId(null);
    setPaymentMethod("cash");
    setDescription("");
  }

  function handleSave() {
    if (!date || !selectedVisitId || !amount || !paymentMethod) return;

    const data: TransactionFormData = {
      date,
      patientId: selectedVisit!.customer,
      patientName: selectedVisit!.customerName,
      visitId: selectedVisitId,
      amount: Number(amount),
      paymentMethod,
      description: description.trim(),
    };

    onSave(data);
    resetForm();
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  const isValid = date && selectedVisitId && amount && Number(amount) > 0 && paymentMethod;

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
                  {isDone ? <BiCheck className="size-4" /> : toPersianDigits(String(i + 1))}
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

  function renderVisitStep() {
    return (
      <div className="flex flex-col gap-4">
        <div ref={visitRef} className="relative">
          <Input
            label="جستجوی ویزیت"
            placeholder="نام بیمار یا تاریخ را وارد کنید..."
            value={visitSearch}
            onChange={handleVisitInputChange}
            onFocus={handleVisitInputFocus}
            onBlur={handleVisitInputBlur}
            onKeyDown={handleVisitKeyDown}
            startIcon={<BiSearch className="size-4" />}
          />
          {showVisitDropdown && visitSearch && (
            <div className="border-surface-200 absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border bg-white shadow-lg">
              {filteredVisits.length === 0 ? (
                <div className="p-3 text-center text-sm text-gray-400">ویزیتی یافت نشد</div>
              ) : (
                filteredVisits.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    className="hover:bg-primary-50 w-full px-3 py-2 text-right text-sm transition-colors"
                    onMouseDown={() => selectVisit(v.id)}
                  >
                    <span className="font-medium">{v.customerName}</span>
                    <span className="text-surface-400 mr-2 text-xs">
                      {v.date} {v.time}
                    </span>
                    <span className="text-surface-400 mr-1 text-xs">
                      {v.serviceNames.join("، ")}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        {selectedVisit && (
          <div className="bg-surface-50 border-surface-200 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-surface-700 text-sm font-medium">
                  {selectedVisit.customerName}
                </span>
                <span className="text-surface-500 text-xs">
                  {selectedVisit.date} ساعت {selectedVisit.time}
                </span>
              </div>
              <div className="text-surface-500 text-xs">
                {selectedVisit.serviceNames.join("، ")}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderPaymentStep() {
    return (
      <div className="flex flex-col gap-4">
        {selectedVisit && (
          <div className="bg-primary-50 border-primary-200 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-primary-700 text-sm font-medium">
                  {selectedVisit.customerName}
                </span>
                <span className="text-primary-500 text-xs">
                  {selectedVisit.date} ساعت {selectedVisit.time}
                </span>
              </div>
              <span className="text-primary-600 text-xs">
                {selectedVisit.serviceNames.join("، ")}
              </span>
            </div>
          </div>
        )}
        <Input
          label="مبلغ (تومان)"
          type="number"
          value={amount}
          readOnly
          placeholder="مبلغ تراکنش"
        />
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

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="ثبت تراکنش جدید"
      size="lg"
      footer={
        wizardStep === "payment" ? (
          <>
            <Button variant="ghost" onClick={handleWizardBack}>
              قبلی
            </Button>
            <Button
              variant="primary"
              startIcon={<BiPlus className="size-5" />}
              onClick={handleSave}
              disabled={!isValid}
            >
              ثبت تراکنش
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={handleClose}>
              انصراف
            </Button>
            <Button variant="primary" onClick={handleWizardNext} disabled={!selectedVisitId}>
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
          {wizardStep === "visit" && renderVisitStep()}
          {wizardStep === "payment" && renderPaymentStep()}
        </motion.div>
      </AnimatePresence>
    </Modal>
  );
}
