import jalaali from "jalaali-js";
import { useMemo, useState } from "react";
import { BiPlus } from "react-icons/bi";

import type { TransactionFormData } from "../../types/accounting";
import type { Service } from "../../types/service";
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
  { value: "online", label: "آنلاین" },
  { value: "cheque", label: "چک" },
];

function getDefaultJalaliDate(): string {
  const now = new Date();
  const { jy, jm, jd } = jalaali.toJalaali(now);
  return `${jy}/${String(jm).padStart(2, "0")}/${String(jd).padStart(2, "0")}`;
}

const defaultDate = getDefaultJalaliDate();

export function AddTransactionModal({ open, onClose, onSave, services }: AddTransactionModalProps) {
  const [date, setDate] = useState<string>(defaultDate);
  const [patient, setPatient] = useState("");
  const [serviceId, setServiceId] = useState("");
  const selectedService = services.find((s) => s.id === Number(serviceId));
  const amount = selectedService ? String(selectedService.price) : "";
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [description, setDescription] = useState("");

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

  function handleServiceChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setServiceId(e.target.value);
  }

  function resetForm() {
    setDate(defaultDate);
    setPatient("");
    setServiceId("");
    setPaymentMethod("cash");
    setDescription("");
  }

  function handleSave() {
    if (!date || !patient.trim() || !serviceId || !amount || !paymentMethod) return;

    const data: TransactionFormData = {
      date,
      patient: patient.trim(),
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
    date && patient.trim() && serviceId && amount && Number(amount) > 0 && paymentMethod;

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

        <Input
          label="نام بیمار"
          value={patient}
          onChange={(e) => setPatient(e.target.value)}
          placeholder="مثال: علی رضایی"
        />

        <Select
          label="خدمت"
          options={serviceOptions}
          placeholder="انتخاب خدمت"
          value={serviceId}
          onChange={handleServiceChange}
          searchable
        />

        {services.find((s) => s.id === Number(serviceId)) && (
          <div className="bg-surface-50 border-surface-200 text-surface-600 rounded-lg border p-3 text-sm">
            <span className="text-surface-700 font-medium">
              {services.find((s) => s.id === Number(serviceId))!.title}
            </span>
            {" — "}
            <span>{services.find((s) => s.id === Number(serviceId))!.description}</span>
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
          onChange={(e) => setPaymentMethod(e.target.value)}
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
