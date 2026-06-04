import { useActionState, useCallback, useState } from "react";
import { useFormStatus } from "react-dom";

import { patientFormSchema } from "../../lib/validations";
import type { Patient } from "../../types/patient";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { useToast } from "../ui/Toast";

interface PatientFormModalProps {
  onClose: () => void;
  onSuccess: (patient: Patient) => void;
}

const initialValues = {
  firstName: "",
  lastName: "",
  phone: "",
  nationalId: "",
  bitmojiId: "",
};

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button variant="primary" loading={pending} disabled={disabled || pending} type="submit">
      ذخیره
    </Button>
  );
}

function PatientFormModal({ onClose, onSuccess }: PatientFormModalProps) {
  const toast = useToast();
  const [values, setValues] = useState(initialValues);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [, formAction, isPending] = useActionState(async (_prev: unknown, formData: FormData) => {
    const data = {
      firstName: (formData.get("firstName") as string) || "",
      lastName: (formData.get("lastName") as string) || "",
      phone: (formData.get("phone") as string) || "",
      nationalId: (formData.get("nationalId") as string) || "",
      bitmojiId: (formData.get("bitmojiId") as string) || "",
    };

    const result = patientFormSchema.safeParse(data);
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string;
        if (!errors[field]) errors[field] = issue.message;
      }
      setFieldErrors(errors);
      toast.error("خطا در اعتبارسنجی", "لطفاً موارد مشخص شده را بررسی کنید.");
      return null;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const newPatient: Patient = {
      id: Date.now(),
      ...result.data,
      bitmojiId: result.data.bitmojiId ?? "",
      lastVisit: "",
      visitCount: 0,
      status: "new",
      createdAt: "",
      products: [],
      services: [],
    };

    onSuccess(newPatient);
    toast.success(
      "بیمار جدید ثبت شد",
      `${result.data.firstName} ${result.data.lastName} با موفقیت اضافه شد.`
    );

    return null;
  }, null);

  const handleChange = useCallback(
    (field: keyof typeof initialValues) => (e: React.ChangeEvent<HTMLInputElement>) => {
      let value = e.target.value;
      if (field === "firstName" || field === "lastName") {
        value = value.replace(/[\d۰-۹٠-٩]/g, "");
      }
      if (field === "phone" || field === "nationalId") {
        value = value.replace(/[^\d۰-۹٠-٩]/g, "");
      }
      setValues((prev) => ({ ...prev, [field]: value }));
      setFieldErrors((prev) => {
        if (!prev[field]) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      });
    },
    []
  );

  const requiredFilled = !!(
    values.firstName.trim() &&
    values.lastName.trim() &&
    values.phone.trim() &&
    values.nationalId.trim()
  );

  const hasErrors = Object.keys(fieldErrors).length > 0;

  return (
    <Modal open onClose={onClose} title="بیمار جدید" size="lg">
      <form action={formAction} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="نام"
            name="firstName"
            placeholder="مثال: علی"
            value={values.firstName}
            onChange={handleChange("firstName")}
            error={fieldErrors.firstName}
            disabled={isPending}
            required
          />
          <Input
            label="نام خانوادگی"
            name="lastName"
            placeholder="مثال: رضایی"
            value={values.lastName}
            onChange={handleChange("lastName")}
            error={fieldErrors.lastName}
            disabled={isPending}
            required
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="شماره تلفن"
            name="phone"
            placeholder="09123456789"
            value={values.phone}
            onChange={handleChange("phone")}
            error={fieldErrors.phone}
            disabled={isPending}
            required
          />
          <Input
            label="کد ملی"
            name="nationalId"
            placeholder="0012345678"
            value={values.nationalId}
            onChange={handleChange("nationalId")}
            error={fieldErrors.nationalId}
            disabled={isPending}
            required
          />
        </div>
        <Input
          label="شناسه بیت‌موجی"
          name="bitmojiId"
          placeholder="bitmoji_"
          value={values.bitmojiId}
          onChange={handleChange("bitmojiId")}
          disabled={isPending}
        />
        <div className="border-surface-200 -mx-6 mt-2 -mb-4 flex items-center justify-end gap-3 border-t px-6 py-4">
          <Button variant="outline" onClick={onClose} type="button" disabled={isPending}>
            انصراف
          </Button>
          <SubmitButton disabled={!requiredFilled || hasErrors} />
        </div>
      </form>
    </Modal>
  );
}

export default PatientFormModal;
