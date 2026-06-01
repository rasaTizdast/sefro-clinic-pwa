import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { useToast } from '../components/toast/toastContext';

export type AuthRequestStatus = 'idle' | 'warning' | 'loading' | 'success' | 'error';

export interface LoginPayload {
  identifier: string;
  password: string;
  rememberMe: boolean;
}

interface LoginFormValues {
  identifier: string;
  password: string;
  rememberMe: boolean;
}

type LoginFormErrors = Partial<Record<keyof LoginFormValues, string>>;

const initialValues: LoginFormValues = {
  identifier: '',
  password: '',
  rememberMe: true,
};

const normalizeIdentifier = (value: string) =>
  value.trim().replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));

const getLoginPayload = (values: LoginFormValues): LoginPayload => ({
  identifier: normalizeIdentifier(values.identifier),
  password: values.password,
  rememberMe: values.rememberMe,
});

const validateLoginForm = (values: LoginFormValues) => {
  const errors: LoginFormErrors = {};
  const identifier = normalizeIdentifier(values.identifier);

  if (!identifier) {
    errors.identifier = 'شماره موبایل یا نام کاربری را وارد کنید.';
  } else if (identifier.length < 3) {
    errors.identifier = 'شناسه ورود باید حداقل ۳ کاراکتر باشد.';
  }

  if (!values.password) {
    errors.password = 'رمز عبور را وارد کنید.';
  } else if (values.password.length < 6) {
    errors.password = 'رمز عبور باید حداقل ۶ کاراکتر باشد.';
  }

  return errors;
};

export const useLoginForm = () => {
  const toast = useToast();
  const [values, setValues] = useState<LoginFormValues>(initialValues);
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [status, setStatus] = useState<AuthRequestStatus>('idle');
  const [lastPayload, setLastPayload] = useState<LoginPayload | null>(null);

  const payload = useMemo(() => getLoginPayload(values), [values]);
  const hasErrors = Object.keys(errors).length > 0;

  const updateField = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const { name, value, checked, type } = event.target;

    setValues((currentValues) => ({
      ...currentValues,
      [name]: type === 'checkbox' ? checked : value,
    }));

    setErrors((currentErrors) => {
      if (!currentErrors[name as keyof LoginFormValues]) return currentErrors;

      const nextErrors = { ...currentErrors };
      delete nextErrors[name as keyof LoginFormValues];
      return nextErrors;
    });

    if (status !== 'idle') {
      setStatus('idle');
    }
  };

  const submitLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validateLoginForm(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setStatus('warning');
      toast.warning(
        'اطلاعات ورود کامل نیست',
        'لطفا موارد مشخص شده را بررسی و دوباره تلاش کنید.',
      );
      return null;
    }

    const nextPayload = getLoginPayload(values);
    setLastPayload(nextPayload);
    setStatus('success');
    toast.success(
      'اطلاعات آماده ارسال است',
      'منطق اتصال به API بعدا به این فرم اضافه می‌شود.',
    );

    return nextPayload;
  };

  const setRequestError = (message = 'در حال حاضر امکان ورود وجود ندارد.') => {
    setStatus('error');
    toast.error('خطا در ورود', message);
  };

  const setRequestLoading = () => {
    setStatus('loading');
  };

  return {
    values,
    errors,
    status,
    payload,
    lastPayload,
    hasErrors,
    updateField,
    submitLogin,
    setRequestError,
    setRequestLoading,
  };
};
