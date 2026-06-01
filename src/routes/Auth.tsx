import { useState } from 'react';
import { BiHide, BiLockAlt, BiShow, BiUser } from 'react-icons/bi';
import { useLoginForm, type AuthRequestStatus } from '../hooks/useLoginForm';

const statusContent: Record<
  AuthRequestStatus,
  { label: string; className: string }
> = {
  idle: {
    label: 'آماده ورود',
    className: 'border-slate-200 bg-white text-slate-600',
  },
  warning: {
    label: 'نیاز به اصلاح اطلاعات',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  loading: {
    label: 'در حال ارسال',
    className: 'border-sky-200 bg-sky-50 text-sky-700',
  },
  success: {
    label: 'آماده ارسال به API',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  error: {
    label: 'خطا در درخواست',
    className: 'border-rose-200 bg-rose-50 text-rose-700',
  },
};

const Auth = () => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const {
    values,
    errors,
    status,
    payload,
    lastPayload,
    hasErrors,
    updateField,
    submitLogin,
  } = useLoginForm();
  const currentStatus = statusContent[status];

  return (
    <main
      dir="rtl"
      className="min-h-dvh overflow-hidden bg-[radial-gradient(circle_at_top_left,#fed7aa_0,#fff7ed_28rem,#f8fafc_54rem)] text-slate-950"
    >
      <section className="mx-auto grid min-h-dvh w-full max-w-6xl items-center gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <div className="hidden lg:block">
          <div className="relative overflow-hidden rounded-4xl border border-white/70 bg-white/55 p-8 shadow-[0_30px_90px_rgba(15,23,42,0.16)] backdrop-blur">
            <div className="absolute -left-24 top-10 size-56 rounded-full bg-cyan-200/50 blur-3xl" />
            <div className="absolute -right-24 bottom-8 size-60 rounded-full bg-orange-200/70 blur-3xl" />

            <div className="relative">
              <div className="mb-16 inline-flex items-center gap-3 rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm">
                <span className="grid size-11 place-items-center rounded-xl bg-slate-950 text-lg font-black text-white">
                  S
                </span>
                <div>
                  <p className="text-sm font-bold">کلینیک سفرو</p>
                  <p className="text-xs text-slate-500">پنل مدیریت درمانگاه</p>
                </div>
              </div>

              <h1 className="max-w-md text-4xl font-black leading-[1.35] text-slate-950">
                ورود امن و سریع به فضای مدیریت کلینیک
              </h1>
              <p className="mt-5 max-w-md text-sm leading-7 text-slate-600">
                این صفحه فقط برای ورود طراحی شده و داده‌های کاربر را در قالبی
                آماده برای اتصال به API نگه می‌دارد.
              </p>

              <div className="mt-10 grid gap-3">
                {['اعتبارسنجی سمت رابط کاربری', 'وضعیت‌های خطا، هشدار و موفقیت', 'پیام‌های Toast قابل استفاده در کل برنامه'].map(
                  (item) => (
                    <div
                      key={item}
                      className="flex items-center gap-3 rounded-2xl bg-white/75 p-3 text-sm font-medium text-slate-700 shadow-sm"
                    >
                      <span className="size-2 rounded-full bg-cyan-500" />
                      {item}
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-md">
          <div className="mb-6 text-center lg:text-right">
            <p className="text-sm font-bold text-cyan-700">Sefro Clinic</p>
            <h2 className="mt-2 text-3xl font-black tracking-normal text-slate-950">
              ورود به حساب کاربری
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              شماره موبایل یا نام کاربری و رمز عبور خود را وارد کنید.
            </p>
          </div>

          <form
            onSubmit={submitLogin}
            className="rounded-[1.75rem] border border-white/80 bg-white/90 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.14)] backdrop-blur sm:p-6"
            noValidate
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <span
                className={`rounded-full border px-3 py-1.5 text-xs font-bold ${currentStatus.className}`}
              >
                {currentStatus.label}
              </span>
              <span className="text-xs text-slate-500">ورود فقط با رمز عبور</span>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-800">
                  شماره موبایل یا نام کاربری
                </span>
                <span
                  className={`flex items-center gap-3 rounded-2xl border bg-white px-4 py-3 transition focus-within:border-cyan-500 focus-within:ring-4 focus-within:ring-cyan-100 ${
                    errors.identifier ? 'border-rose-300' : 'border-slate-200'
                  }`}
                >
                  <BiUser className="text-2xl text-slate-400" />
                  <input
                    name="identifier"
                    value={values.identifier}
                    onChange={updateField}
                    className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-slate-400"
                    placeholder="مثلا 09123456789"
                    autoComplete="username"
                    inputMode="text"
                    aria-invalid={Boolean(errors.identifier)}
                  />
                </span>
                {errors.identifier && (
                  <span className="mt-2 block text-xs font-medium text-rose-600">
                    {errors.identifier}
                  </span>
                )}
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-800">
                  رمز عبور
                </span>
                <span
                  className={`flex items-center gap-3 rounded-2xl border bg-white px-4 py-3 transition focus-within:border-cyan-500 focus-within:ring-4 focus-within:ring-cyan-100 ${
                    errors.password ? 'border-rose-300' : 'border-slate-200'
                  }`}
                >
                  <BiLockAlt className="text-2xl text-slate-400" />
                  <input
                    name="password"
                    value={values.password}
                    onChange={updateField}
                    type={isPasswordVisible ? 'text' : 'password'}
                    className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-slate-400"
                    placeholder="رمز عبور"
                    autoComplete="current-password"
                    aria-invalid={Boolean(errors.password)}
                  />
                  <button
                    type="button"
                    onClick={() => setIsPasswordVisible((isVisible) => !isVisible)}
                    className="grid size-9 shrink-0 place-items-center rounded-xl text-xl text-slate-500 outline-none transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-cyan-300"
                    aria-label={isPasswordVisible ? 'مخفی کردن رمز عبور' : 'نمایش رمز عبور'}
                  >
                    {isPasswordVisible ? <BiHide /> : <BiShow />}
                  </button>
                </span>
                {errors.password && (
                  <span className="mt-2 block text-xs font-medium text-rose-600">
                    {errors.password}
                  </span>
                )}
              </label>
            </div>

            <div className="mt-5 flex items-center justify-between gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-600">
                <input
                  name="rememberMe"
                  type="checkbox"
                  checked={values.rememberMe}
                  onChange={updateField}
                  className="size-4 rounded border-slate-300 accent-cyan-600"
                />
                مرا به خاطر بسپار
              </label>
              <button
                type="button"
                className="text-sm font-bold text-cyan-700 transition hover:text-cyan-900"
              >
                فراموشی رمز؟
              </button>
            </div>

            <button
              type="submit"
              disabled={status === 'loading'}
              className="mt-6 flex h-12 w-full items-center justify-center rounded-2xl bg-slate-950 px-5 text-sm font-black text-white shadow-lg shadow-slate-950/20 outline-none transition hover:-translate-y-0.5 hover:bg-slate-800 focus-visible:ring-4 focus-visible:ring-cyan-200 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
            >
              {status === 'loading' ? 'در حال بررسی...' : 'ورود'}
            </button>

            <div
              className={`mt-5 rounded-2xl border p-4 text-xs leading-6 ${
                hasErrors
                  ? 'border-amber-200 bg-amber-50 text-amber-800'
                  : 'border-slate-200 bg-slate-50 text-slate-600'
              }`}
            >
              <p className="font-bold text-slate-800">داده آماده ارسال</p>
              <code
                dir="ltr"
                className="mt-2 block overflow-x-auto text-left"
              >
                {JSON.stringify(lastPayload ?? payload, null, 2)}
              </code>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
};

export default Auth;
