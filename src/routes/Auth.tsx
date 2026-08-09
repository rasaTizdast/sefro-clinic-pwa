import { useState } from "react";
import { useFormStatus } from "react-dom";
import { BiCheckCircle, BiHide, BiLockAlt, BiShow, BiUser } from "react-icons/bi";

import { Alert } from "../components/ui/Alert";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { useLoginForm } from "../hooks/useLoginForm";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";

const statusConfig: Record<string, { label: string; variant: BadgeVariant }> = {
  idle: { label: "آماده ورود", variant: "default" },
  success: { label: "ورود موفق", variant: "success" },
  error: { label: "خطا در اطلاعات", variant: "danger" },
};

const heroFeatures = [
  { icon: BiUser, text: "دسترسی نقش‌محور برای پزشکان و مدیران" },
  { icon: BiLockAlt, text: "حفاظت شده با رمزنگاری پیشرفته" },
  { icon: BiCheckCircle, text: "مدیریت بیماران، نوبت‌ها و امور مالی" },
];

function PasswordToggle({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="text-surface-400 hover:text-surface-600 flex items-center transition-colors"
      aria-label={visible ? "مخفی کردن رمز عبور" : "نمایش رمز عبور"}
      tabIndex={-1}
    >
      {visible ? <BiHide className="text-lg" /> : <BiShow className="text-lg" />}
    </button>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="primary"
      size="lg"
      loading={pending}
      disabled={pending}
      className="shadow-primary-600/20 mt-6 w-full shadow-lg"
    >
      {pending ? "در حال ورود..." : "ورود به حساب"}
    </Button>
  );
}

export default function Auth() {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const { state, formAction, isPending } = useLoginForm();

  const displayStatus = isPending ? "pending" : state.status;
  const currentStatus =
    displayStatus === "pending"
      ? { label: "در حال بررسی", variant: "info" as BadgeVariant }
      : statusConfig[state.status];

  return (
    <main dir="rtl" className="from-surface-50 to-surface-100 min-h-dvh bg-linear-to-br">
      <section className="mx-auto grid min-h-dvh w-full max-w-6xl items-center gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_1fr] lg:px-8">
        <div className="hidden lg:block" data-tour="auth-brand">
          <div className="border-surface-200/60 rounded-2xl border bg-white p-10 shadow-[0_8px_40px_rgba(15,23,42,0.06)]">
            <div className="from-primary-50 to-primary-100/50 mb-10 inline-flex items-center gap-3 rounded-xl bg-linear-to-l px-5 py-3">
              <span className="bg-primary-600 shadow-primary-600/30 grid size-12 place-items-center rounded-xl text-xl font-bold text-white shadow-sm">
                S
              </span>
              <div>
                <p className="text-surface-800 text-sm font-bold">کلینیک زیبایی باران</p>
                <p className="text-surface-500 text-xs">پنل مدیریت درمانگاه</p>
              </div>
            </div>

            <h1 className="text-surface-900 text-[28px] leading-[1.3] font-bold">
              ورود امن و سریع
              <br />
              به فضای مدیریت کلینیک
            </h1>
            <p className="text-surface-500 mt-4 max-w-sm text-sm leading-6">
              با وارد کردن نام کاربری و رمز عبور خود، به پنل مدیریت یکپارچه کلینیک زیبایی باران
              دسترسی پیدا کنید.
            </p>

            <div className="mt-10 space-y-3">
              {heroFeatures.map(({ icon: Icon, text }) => (
                <div
                  key={text}
                  className="border-surface-100 bg-surface-50/50 text-surface-600 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium"
                >
                  <span className="bg-primary-100 text-primary-600 grid size-8 shrink-0 place-items-center rounded-lg">
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
            <p className="text-primary-600 text-sm font-bold tracking-widest uppercase">
              Sefro Clinic
            </p>
            <h2 className="text-surface-900 mt-3 text-[22px] leading-[1.4] font-semibold">
              ورود به حساب کاربری
            </h2>
            <p className="text-surface-500 mt-2 text-sm leading-6">
              نام کاربری و رمز عبور خود را وارد کنید.
            </p>
          </div>

          <div className="border-surface-200/60 rounded-2xl border bg-white p-8 shadow-[0_8px_40px_rgba(15,23,42,0.06)]">
            <div className="mb-6 flex items-center justify-between gap-3">
              <Badge variant={currentStatus.variant} size="md" dot>
                {currentStatus.label}
              </Badge>
              <span className="text-surface-400 text-xs">ورود فقط با رمز عبور</span>
            </div>

            {state.status === "error" && state.message && (
              <div className="mb-5">
                <Alert variant="error">{state.message}</Alert>
              </div>
            )}

            {state.status === "success" && (
              <div className="mb-5">
                <Alert variant="success" title={state.message ?? undefined}>
                  در حال انتقال به داشبورد...
                </Alert>
              </div>
            )}

            <form action={formAction} noValidate>
              <div className="space-y-5">
                <div data-tour="auth-username">
                  <Input
                    label="نام کاربری یا شماره موبایل"
                    name="identifier"
                    error={state.errors.identifier}
                    placeholder="مثلا 09123456789"
                    autoComplete="username"
                    startIcon={<BiUser className="text-lg" />}
                    disabled={isPending}
                  />
                </div>

                <div data-tour="auth-password">
                  <Input
                    label="رمز عبور"
                    name="password"
                    error={state.errors.password}
                    placeholder="رمز عبور"
                    type={isPasswordVisible ? "text" : "password"}
                    autoComplete="current-password"
                    startIcon={<BiLockAlt className="text-lg" />}
                    endIcon={
                      <PasswordToggle
                        visible={isPasswordVisible}
                        onToggle={() => setIsPasswordVisible((v) => !v)}
                      />
                    }
                    disabled={isPending}
                  />
                </div>
              </div>

              <div className="mt-5" data-tour="auth-remember">
                <label className="text-surface-600 flex cursor-pointer items-center gap-2 text-sm font-medium select-none">
                  <input
                    name="rememberMe"
                    type="checkbox"
                    defaultChecked
                    className="border-surface-300 text-primary-600 focus:ring-primary-500/30 size-4 rounded"
                    disabled={isPending}
                  />
                  مرا به خاطر بسپار
                </label>
              </div>

              <div data-tour="auth-submit">
                <SubmitButton />
              </div>
            </form>
          </div>

          <p className="text-surface-400 mt-6 text-center text-xs leading-5">
            دسترسی غیرمجاز ممنوع. تمامی فعالیت‌ها ثبت و پیگیری می‌شود.
          </p>
        </div>
      </section>
    </main>
  );
}
