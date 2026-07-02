import { useCallback, useState } from "react";

import { extractApiError } from "../../lib/api-error";
import { patientFormSchema } from "../../lib/validations";
import type { PatientFormData } from "../../types/patient";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { Textarea } from "../ui/Textarea";

interface PatientFormModalProps {
  onClose: () => void;
  onSave: (data: PatientFormData) => Promise<void>;
  initialData?: PatientFormData;
  isPending?: boolean;
}

const initialValues: PatientFormData = {
  firstName: "",
  lastName: "",
  mobileNumber: "",
  nationalId: "",
  bitmojiCode: "",
  notes: "",
};

export function PatientFormModal({
  onClose,
  onSave,
  initialData,
  isPending = false,
}: PatientFormModalProps) {
  const [values, setValues] = useState<PatientFormData>(initialData ?? initialValues);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = useCallback(
    (field: keyof PatientFormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
      let value = e.target.value;
      if (field === "firstName" || field === "lastName") {
        value = value.replace(/[\d۰-۹٠-٩]/g, "");
      }
      if (field === "mobileNumber" || field === "nationalId") {
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

  const handleSubmit = async () => {
    const result = patientFormSchema.safeParse(values);
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string;
        if (!errors[field]) errors[field] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    setFormError("");
    try {
      await onSave({
        ...result.data,
        bitmojiCode: result.data.bitmojiCode ?? "",
        notes: result.data.notes ?? "",
      });
      onClose();
    } catch (err: unknown) {
      setFormError(extractApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const loading = submitting || isPending;

  const requiredFilled = !!(
    values.firstName.trim() &&
    values.lastName.trim() &&
    values.mobileNumber.trim() &&
    values.nationalId.trim()
  );

  const hasErrors = Object.keys(fieldErrors).length > 0;

  return (
    <Modal
      open
      onClose={onClose}
      title={initialData ? "ویرایش بیمار" : "بیمار جدید"}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            انصراف
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!requiredFilled || hasErrors || loading}
            loading={loading}
          >
            ذخیره
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {formError && <Alert variant="error">{formError}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="نام"
            placeholder="مثال: علی"
            value={values.firstName}
            onChange={handleChange("firstName")}
            error={fieldErrors.firstName}
            disabled={loading}
            required
          />
          <Input
            label="نام خانوادگی"
            placeholder="مثال: رضایی"
            value={values.lastName}
            onChange={handleChange("lastName")}
            error={fieldErrors.lastName}
            disabled={loading}
            required
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="شماره تلفن"
            placeholder="09123456789"
            value={values.mobileNumber}
            onChange={handleChange("mobileNumber")}
            error={fieldErrors.mobileNumber}
            disabled={loading}
            required
          />
          <Input
            label="کد ملی"
            placeholder="0012345678"
            value={values.nationalId}
            onChange={handleChange("nationalId")}
            error={fieldErrors.nationalId}
            disabled={loading}
            required
          />
        </div>
        <Input
          label="شناسه بیت‌موجی"
          placeholder="bitmoji_"
          value={values.bitmojiCode}
          onChange={handleChange("bitmojiCode")}
          disabled={loading}
        />
        <Textarea
          label="یادداشت‌ها"
          placeholder="یادداشت‌های مربوط به بیمار..."
          value={values.notes}
          onChange={(e) => setValues((prev) => ({ ...prev, notes: e.target.value }))}
          disabled={loading}
          rows={3}
        />
      </div>
    </Modal>
  );
}
