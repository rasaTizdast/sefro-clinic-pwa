import { useState } from 'react'
import { BiHide, BiLockAlt, BiShow, BiUser } from 'react-icons/bi'
import { useLoginForm, type AuthRequestStatus } from '../hooks/useLoginForm'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'

const statusBadge: Record<
  AuthRequestStatus,
  { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' }
> = {
  idle: { label: 'آماده ورود', variant: 'default' },
  warning: { label: 'نیاز به اصلاح اطلاعات', variant: 'warning' },
  loading: { label: 'در حال ارسال', variant: 'info' },
  success: { label: 'آماده ارسال به API', variant: 'success' },
  error: { label: 'خطا در درخواست', variant: 'danger' },
}

const Auth = () => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const {
    values,
    errors,
    status,
    payload,
    lastPayload,
    hasErrors,
    updateField,
    submitLogin,
  } = useLoginForm()
  const currentStatus = statusBadge[status]

  return (
    <main dir="rtl" className="min-h-dvh bg-surface">
      <section className="mx-auto grid min-h-dvh w-full max-w-6xl items-center gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_1fr] lg:px-8">
        <div className="hidden lg:block">
          <div className="rounded-lg border border-surface-200 bg-white p-8">
            <div className="mb-12 inline-flex items-center gap-3 rounded-md border border-surface-100 bg-surface px-4 py-3">
              <span className="grid size-11 place-items-center rounded bg-primary-600 text-lg font-bold text-white">
                S
              </span>
              <div>
                <p className="text-sm font-bold text-surface-800">کلینیک سفرو</p>
                <p className="text-xs text-surface-500">پنل مدیریت درمانگاه</p>
              </div>
            </div>

            <h1 className="max-w-md text-[28px] font-bold leading-[1.3] text-surface-900">
              ورود امن و سریع به فضای مدیریت کلینیک
            </h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-surface-500">
              این صفحه فقط برای ورود طراحی شده و داده‌های کاربر را در قالبی
              آماده برای اتصال به API نگه می‌دارد.
            </p>

            <div className="mt-8 grid gap-2">
              {[
                'اعتبارسنجی سمت رابط کاربری',
                'وضعیت‌های خطا، هشدار و موفقیت',
                'پیام‌های Toast قابل استفاده در کل برنامه',
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-md border border-surface-100 bg-surface px-3 py-2.5 text-sm font-medium text-surface-600"
                >
                  <span className="size-2 rounded-full bg-primary-500" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-md">
          <div className="mb-6 text-center lg:text-right">
            <p className="text-sm font-bold text-primary-600">Sefro Clinic</p>
            <h2 className="mt-2 text-[22px] font-semibold leading-[1.4] text-surface-900">
              ورود به حساب کاربری
            </h2>
            <p className="mt-2 text-sm leading-6 text-surface-500">
              شماره موبایل یا نام کاربری و رمز عبور خود را وارد کنید.
            </p>
          </div>

          <form
            onSubmit={submitLogin}
            className="rounded-lg border border-surface-200 bg-white p-6"
            noValidate
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <Badge variant={currentStatus.variant} size="md" dot>
                {currentStatus.label}
              </Badge>
              <span className="text-xs text-surface-400">ورود فقط با رمز عبور</span>
            </div>

            <div className="space-y-5">
              <Input
                label="شماره موبایل یا نام کاربری"
                name="identifier"
                value={values.identifier}
                onChange={updateField}
                error={errors.identifier}
                placeholder="مثلا 09123456789"
                autoComplete="username"
                leftIcon={<BiUser className="text-lg" />}
              />

              <Input
                label="رمز عبور"
                name="password"
                value={values.password}
                onChange={updateField}
                error={errors.password}
                placeholder="رمز عبور"
                type={isPasswordVisible ? 'text' : 'password'}
                autoComplete="current-password"
                leftIcon={<BiLockAlt className="text-lg" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setIsPasswordVisible((v) => !v)}
                    className="flex items-center text-surface-400 hover:text-surface-600 transition-colors cursor-pointer"
                    aria-label={isPasswordVisible ? 'مخفی کردن رمز عبور' : 'نمایش رمز عبور'}
                    tabIndex={-1}
                  >
                    {isPasswordVisible ? <BiHide className="text-lg" /> : <BiShow className="text-lg" />}
                  </button>
                }
              />
            </div>

            <div className="mt-5 flex items-center justify-between gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-surface-600 select-none">
                <input
                  name="rememberMe"
                  type="checkbox"
                  checked={values.rememberMe}
                  onChange={updateField}
                  className="size-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500/30"
                />
                مرا به خاطر بسپار
              </label>
              <button
                type="button"
                className="text-sm font-bold text-primary-600 transition hover:text-primary-800 cursor-pointer"
              >
                فراموشی رمز عبور
              </button>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={status === 'loading'}
              className="mt-6 w-full shadow-lg shadow-primary-600/20 transition-all"
            >
              {status === 'loading' ? 'در حال بررسی...' : 'ورود'}
            </Button>

            <div
              className={`mt-5 rounded-md border p-3 text-xs leading-6 ${
                hasErrors
                  ? 'border-warning-200 bg-warning-50 text-warning-800'
                  : 'border-surface-200 bg-surface text-surface-500'
              }`}
            >
              <p className="font-bold text-surface-700">داده آماده ارسال</p>
              <code dir="ltr" className="mt-2 block overflow-x-auto text-left">
                {JSON.stringify(lastPayload ?? payload, null, 2)}
              </code>
            </div>
          </form>
        </div>
      </section>
    </main>
  )
}

export default Auth
