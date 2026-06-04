import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { BiHide, BiLockAlt, BiShow, BiUser, BiCheckCircle } from 'react-icons/bi'
import { useLoginForm } from '../hooks/useLoginForm'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Alert } from '../components/ui/Alert'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info'

const statusConfig: Record<string, { label: string; variant: BadgeVariant }> = {
  idle: { label: 'آماده ورود', variant: 'default' },
  success: { label: 'ورود موفق', variant: 'success' },
  error: { label: 'خطا در اطلاعات', variant: 'danger' },
}

const heroFeatures = [
  { icon: BiUser, text: 'دسترسی نقش‌محور برای پزشکان و مدیران' },
  { icon: BiLockAlt, text: 'حفاظت شده با رمزنگاری پیشرفته' },
  { icon: BiCheckCircle, text: 'مدیریت بیماران، نوبت‌ها و امور مالی' },
]

function PasswordToggle({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center text-surface-400 transition-colors hover:text-surface-600"
      aria-label={visible ? 'مخفی کردن رمز عبور' : 'نمایش رمز عبور'}
      tabIndex={-1}
    >
      {visible ? <BiHide className="text-lg" /> : <BiShow className="text-lg" />}
    </button>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      variant="primary"
      size="lg"
      loading={pending}
      disabled={pending}
      className="mt-6 w-full shadow-lg shadow-primary-600/20"
    >
      {pending ? 'در حال ورود...' : 'ورود به حساب'}
    </Button>
  )
}

export default function Auth() {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const { state, formAction, isPending } = useLoginForm()

  const displayStatus = isPending ? 'pending' : state.status
  const currentStatus = displayStatus === 'pending'
    ? { label: 'در حال بررسی', variant: 'info' as BadgeVariant }
    : statusConfig[state.status]

  return (
    <main dir="rtl" className="min-h-dvh bg-gradient-to-br from-surface-50 to-surface-100">
      <section className="mx-auto grid min-h-dvh w-full max-w-6xl items-center gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_1fr] lg:px-8">
        <div className="hidden lg:block">
          <div className="rounded-2xl border border-surface-200/60 bg-white p-10 shadow-[0_8px_40px_rgba(15,23,42,0.06)]">
            <div className="mb-10 inline-flex items-center gap-3 rounded-xl bg-gradient-to-l from-primary-50 to-primary-100/50 px-5 py-3">
              <span className="grid size-12 place-items-center rounded-xl bg-primary-600 text-xl font-bold text-white shadow-sm shadow-primary-600/30">
                S
              </span>
              <div>
                <p className="text-sm font-bold text-surface-800">کلینیک سفرو</p>
                <p className="text-xs text-surface-500">پنل مدیریت درمانگاه</p>
              </div>
            </div>

            <h1 className="text-[28px] font-bold leading-[1.3] text-surface-900">
              ورود امن و سریع<br />به فضای مدیریت کلینیک
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-6 text-surface-500">
              با وارد کردن نام کاربری و رمز عبور خود، به پنل مدیریت یکپارچه کلینیک سفرو دسترسی پیدا کنید.
            </p>

            <div className="mt-10 space-y-3">
              {heroFeatures.map(({ icon: Icon, text }) => (
                <div
                  key={text}
                  className="flex items-center gap-3 rounded-xl border border-surface-100 bg-surface-50/50 px-4 py-3 text-sm font-medium text-surface-600"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary-100 text-primary-600">
                    <Icon className="text-base" />
                  </span>
                  {text}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 text-center lg:text-right">
            <p className="text-sm font-bold uppercase tracking-widest text-primary-600">Sefro Clinic</p>
            <h2 className="mt-3 text-[22px] font-semibold leading-[1.4] text-surface-900">
              ورود به حساب کاربری
            </h2>
            <p className="mt-2 text-sm leading-6 text-surface-500">
              نام کاربری و رمز عبور خود را وارد کنید.
            </p>
          </div>

          <div className="rounded-2xl border border-surface-200/60 bg-white p-8 shadow-[0_8px_40px_rgba(15,23,42,0.06)]">
            <div className="mb-6 flex items-center justify-between gap-3">
              <Badge variant={currentStatus.variant} size="md" dot>
                {currentStatus.label}
              </Badge>
              <span className="text-xs text-surface-400">ورود فقط با رمز عبور</span>
            </div>

            {state.status === 'error' && state.message && (
              <div className="mb-5">
                <Alert variant="error">{state.message}</Alert>
              </div>
            )}

            {state.status === 'success' && (
              <div className="mb-5">
                <Alert variant="success" title={state.message ?? undefined}>
                  در حال انتقال به داشبورد...
                </Alert>
              </div>
            )}

            <form action={formAction} noValidate>
              <div className="space-y-5">
                <Input
                  label="نام کاربری یا شماره موبایل"
                  name="identifier"
                  error={state.errors.identifier}
                  placeholder="مثلا 09123456789"
                  autoComplete="username"
                  startIcon={<BiUser className="text-lg" />}
                  disabled={isPending}
                />

                <Input
                  label="رمز عبور"
                  name="password"
                  error={state.errors.password}
                  placeholder="رمز عبور"
                  type={isPasswordVisible ? 'text' : 'password'}
                  autoComplete="current-password"
                  startIcon={<BiLockAlt className="text-lg" />}
                  endIcon={<PasswordToggle visible={isPasswordVisible} onToggle={() => setIsPasswordVisible((v) => !v)} />}
                  disabled={isPending}
                />
              </div>

              <div className="mt-5">
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-surface-600 select-none">
                  <input
                    name="rememberMe"
                    type="checkbox"
                    defaultChecked
                    className="size-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500/30"
                    disabled={isPending}
                  />
                  مرا به خاطر بسپار
                </label>
              </div>

              <SubmitButton />
            </form>
          </div>

          <p className="mt-6 text-center text-xs leading-5 text-surface-400">
            دسترسی غیرمجاز ممنوع. تمامی فعالیت‌ها ثبت و پیگیری می‌شود.
          </p>
        </div>
      </section>
    </main>
  )
}
