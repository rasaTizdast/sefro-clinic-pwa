import jalaali from "jalaali-js";
import { useMemo, useRef, useState } from "react";
import { BiPlus } from "react-icons/bi";

import { useCustomersList } from "../../hooks/api";
import type { PaymentMethod, TransactionFormData } from "../../types/accounting";
import type { Service } from "../../types/service";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { JalaliDatePicker } from "../ui/JalaliDatePicker";
import { Modal } from "../ui/Modal";
import { Select } from "../ui/Select";

interface AddTransactionModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: TransactionFormData) => void;
  services: Service[];
}

const paymentOptions = [
  { value: "cash", label: "نقدی" },
  { value: "card", label: "کارت خوان" },
  { value: "transfer", label: "کارت به کارت" },
];

function getDefaultJalaliDate(): string {
  const now = new Date();
  const { jy, jm, jd } = jalaali.toJalaali(now);
  return `${jy}/${String(jm).padStart(2, "0")}/${String(jd).padStart(2, "0")}`;
}

const defaultDate = getDefaultJalaliDate();

export function AddTransactionModal({ open, onClose, onSave, services }: AddTransactionModalProps) {
  const [date, setDate] = useState<string>(defaultDate);
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [selectedPatientName, setSelectedPatientName] = useState("");
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [serviceId, setServiceId] = useState("");
  const selectedService = services.find((s) => s.id === Number(serviceId));
  const amount = selectedService ? String(selectedService.price) : "";
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [description, setDescription] = useState("");
  const patientRef = useRef<HTMLDivElement>(null);

  const { data: paginatedPatients } = useCustomersList({ perPage: 200 });
  const patients = paginatedPatients?.data ?? [];

  const filteredPatients = useMemo(
    () =>
      patientSearch
        ? patients.filter((p) =>
            `${p.firstName} ${p.lastName}${p.mobileNumber}`
              .toLowerCase()
              .includes(patientSearch.toLowerCase())
          )
        : [],
    [patients, patientSearch]
  );

  const serviceOptions = useMemo(
    () =>
      services
        .filter((s) => s.isActive)
        .map((s) => ({
          value: String(s.id),
          label: `${s.title} - ${s.price.toLocaleString("fa-IR")} تومان`,
        })),
    [services]
  );

  function selectPatient(patient: { id: number; firstName: string; lastName: string }) {
    setSelectedPatientId(patient.id);
    setSelectedPatientName(`${patient.firstName} ${patient.lastName}`);
    setPatientSearch(`${patient.firstName} ${patient.lastName}`);
    setShowPatientDropdown(false);
  }

  function handlePatientInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPatientSearch(e.target.value);
    setSelectedPatientId(null);
    setSelectedPatientName("");
    setShowPatientDropdown(true);
  }

  function handlePatientInputBlur() {
    setTimeout(() => setShowPatientDropdown(false), 200);
  }

  function handlePatientInputFocus() {
    if (patientSearch && !selectedPatientId) {
      setShowPatientDropdown(true);
    }
  }

  function handleServiceChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setServiceId(e.target.value);
  }

  function resetForm() {
    setDate(defaultDate);
    setPatientSearch("");
    setSelectedPatientId(null);
    setSelectedPatientName("");
    setServiceId("");
    setPaymentMethod("cash");
    setDescription("");
  }

  function handleSave() {
    if (!date || !selectedPatientId || !serviceId || !amount || !paymentMethod) return;

    const data: TransactionFormData = {
      date,
      patientId: selectedPatientId,
      patientName: selectedPatientName,
      serviceId: Number(serviceId),
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

  const isValid =
    date && selectedPatientId && serviceId && amount && Number(amount) > 0 && paymentMethod;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="ثبت تراکنش جدید"
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={handleClose}>
            انصراف
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
      }
    >
      <div className="flex flex-col gap-4">
        <JalaliDatePicker
          label="تاریخ تراکنش"
          value={date}
          onChange={(d) => setDate(d || defaultDate)}
          containerClassName="w-full"
        />

        <div ref={patientRef} className="relative">
          <Input
            label="بیمار"
            value={patientSearch}
            onChange={handlePatientInputChange}
            onFocus={handlePatientInputFocus}
            onBlur={handlePatientInputBlur}
            placeholder="جستجوی بیمار..."
          />
          {selectedPatientId && selectedPatientName && (
            <div className="mt-1">
              <Badge variant="info" size="sm">
                {selectedPatientName}
              </Badge>
            </div>
          )}
          {showPatientDropdown && patientSearch && filteredPatients.length > 0 && (
            <div className="border-surface-200 absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border bg-white shadow-lg">
              {filteredPatients.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="hover:bg-primary-50 w-full px-3 py-2 text-right text-sm transition-colors"
                  onMouseDown={() => selectPatient(p)}
                >
                  <span className="font-medium">
                    {p.firstName} {p.lastName}
                  </span>
                  <span className="text-surface-400 mr-2 text-xs">{p.mobileNumber}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <Select
          label="خدمت"
          options={serviceOptions}
          placeholder="انتخاب خدمت"
          value={serviceId}
          onChange={handleServiceChange}
          searchable
        />

        {selectedService && (
          <div className="bg-surface-50 border-surface-200 text-surface-600 rounded-lg border p-3 text-sm">
            <span className="text-surface-700 font-medium">{selectedService.title}</span>
            {" — "}
            <span>{selectedService.description}</span>
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
    </Modal>
  );
}
