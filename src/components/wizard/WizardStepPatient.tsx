import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { BiCheck, BiSearch } from "react-icons/bi";
import { MdPersonAdd } from "react-icons/md";

import { toPersianDigits } from "../../lib/digits";
import { listCustomers } from "../../services/customers";
import type { Patient } from "../../types/patient";
import type { PatientData } from "../../types/wizard";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { JalaliDatePicker } from "../ui/JalaliDatePicker";
import { Textarea } from "../ui/Textarea";

interface Props {
  patient: PatientData;
  onBack: () => void;
  onComplete: (patient: PatientData) => void;
}

export default function WizardStepPatient({ patient, onBack, onComplete }: Props) {
  const [query, setQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<PatientData | null>(
    patient.id ? patient : null
  );
  const [showNewForm, setShowNewForm] = useState(false);

  const { data: searchResults, isFetching } = useQuery({
    queryKey: ["wizard-patient-search", query],
    queryFn: async () => {
      const result = await listCustomers({ search: query, perPage: 20 });
      return result.data;
    },
    enabled: query.length >= 2 && !showNewForm,
    staleTime: 30_000,
  });

  const handleSelect = useCallback((p: Patient) => {
    setSelectedPatient({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      mobileNumber: p.mobileNumber,
      nationalId: p.nationalId,
      isNew: p.isNewCustomer,
      visitCount: p.visitCount,
      totalSpent: p.totalPayments,
      lastVisit: p.lastVisit,
      servicesHistory: [],
      notes: p.notes ?? "",
      birthday: p.birthday ?? "",
      fileSysId: p.fileSysId ?? "",
    });
    setQuery("");
  }, []);

  const handleContinue = useCallback(() => {
    if (selectedPatient) {
      onComplete(selectedPatient);
    }
  }, [selectedPatient, onComplete]);

  return (
    <div className="space-y-4">
      <h2 className="text-surface-900 text-lg font-bold">انتخاب بیمار</h2>

      {!showNewForm && (
        <div className="relative">
          <Input
            label="جستجوی بیمار"
            placeholder="نام، موبایل یا کد ملی..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            endIcon={<BiSearch className="text-surface-400 size-4" />}
          />
          {isFetching && <p className="text-surface-400 mt-1 text-sm">در حال جستجو...</p>}
          {searchResults && searchResults.length > 0 && (
            <div className="border-surface-200 absolute z-10 mt-1 w-full rounded-lg border bg-white shadow-lg">
              {searchResults.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelect(p)}
                  className="hover:bg-surface-50 flex w-full items-center justify-between px-4 py-3 text-right transition-colors"
                >
                  <div>
                    <span className="text-surface-900 font-medium">
                      {p.firstName} {p.lastName}
                    </span>
                    <span className="text-surface-400 me-2 text-sm">
                      {toPersianDigits(p.mobileNumber)}
                    </span>
                  </div>
                  <span className="text-surface-400 text-xs">
                    {toPersianDigits(String(p.visitCount))} مراجعه
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedPatient && (
        <div className="border-success-200 bg-success-50 rounded-lg border p-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-success-800 font-bold">
                {selectedPatient.firstName} {selectedPatient.lastName}
              </h3>
              <p className="text-success-600 text-sm">
                {toPersianDigits(selectedPatient.mobileNumber)}
              </p>
              <div className="text-success-600 mt-2 flex gap-4 text-xs">
                <span>{toPersianDigits(String(selectedPatient.visitCount))} مراجعه</span>
                <span>{toPersianDigits(String(selectedPatient.totalSpent))} مبلغ کل</span>
                {selectedPatient.lastVisit && (
                  <span>آخرین مراجعه: {selectedPatient.lastVisit}</span>
                )}
              </div>
            </div>
            <BiCheck className="text-success-600 size-5" />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" onClick={onBack}>
          بازگشت
        </Button>
        <div className="flex gap-2">
          {!showNewForm && (
            <Button
              variant="ghost"
              startIcon={<MdPersonAdd className="size-4" />}
              onClick={() => setShowNewForm(true)}
            >
              بیمار جدید
            </Button>
          )}
          <Button variant="primary" onClick={handleContinue} disabled={!selectedPatient}>
            ادامه
          </Button>
        </div>
      </div>

      {showNewForm && (
        <NewPatientForm
          onSubmit={(p) => {
            setSelectedPatient(p);
            setShowNewForm(false);
          }}
          onCancel={() => setShowNewForm(false)}
        />
      )}
    </div>
  );
}

function NewPatientForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (p: PatientData) => void;
  onCancel: () => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [notes, setNotes] = useState("");
  const [birthday, setBirthday] = useState("");
  const [fileSysId, setFileSysId] = useState("");

  const handleSubmit = () => {
    onSubmit({
      id: null,
      firstName,
      lastName,
      mobileNumber,
      nationalId,
      isNew: true,
      visitCount: 0,
      totalSpent: 0,
      lastVisit: null,
      servicesHistory: [],
      notes,
      birthday,
      fileSysId,
    });
  };

  return (
    <div className="border-surface-200 bg-surface-50 space-y-3 rounded-lg border p-4">
      <h3 className="text-surface-800 font-bold">ثبت بیمار جدید</h3>
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="نام"
          placeholder="مثال: علی"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value.replace(/[\d۰-۹٠-٩]/g, ""))}
          required
        />
        <Input
          label="نام خانوادگی"
          placeholder="مثال: رضایی"
          value={lastName}
          onChange={(e) => setLastName(e.target.value.replace(/[\d۰-۹٠-٩]/g, ""))}
          required
        />
        <Input
          label="موبایل"
          placeholder="09123456789"
          value={mobileNumber}
          onChange={(e) => setMobileNumber(e.target.value.replace(/[^\d۰-۹٠-٩]/g, ""))}
          required
        />
        <Input
          label="کد ملی"
          placeholder="0012345678"
          value={nationalId}
          onChange={(e) => setNationalId(e.target.value.replace(/[^\d۰-۹٠-٩]/g, ""))}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <JalaliDatePicker
          label="تاریخ تولد"
          value={birthday || null}
          onChange={(date) => setBirthday(date ?? "")}
        />
        <Input
          label="شماره پرونده"
          placeholder="مثال: ۱۲۳۴۵"
          value={fileSysId}
          onChange={(e) => setFileSysId(e.target.value)}
        />
      </div>
      <Textarea
        label="یادداشت‌ها"
        placeholder="یادداشت‌های مربوط به بیمار..."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={3}
      />
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel}>
          انصراف
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={!firstName || !lastName || !mobileNumber || !nationalId}
        >
          ثبت و ادامه
        </Button>
      </div>
    </div>
  );
}
