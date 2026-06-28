# سِفرُو — سامانه مدیریت کلینیک

<p dir="rtl">
سامانه تحت وب پیشرفته برای مدیریت کلینیک‌ها و مراکز درمانی با قابلیت PWA. با React ۱۹ + TypeScript + Vite ۸ ساخته شده و از Tailwind v4 برای استایل‌دهی و Django REST Framework در بک‌اند استفاده می‌کند.
</p>

## ویژگی‌های اصلی (Persian)

| بخش          | توضیحات                             |
| ------------ | ----------------------------------- |
| داشبورد      | آمار کلی، نمودارهای تحلیلی          |
| مراجعین      | مدیریت اطلاعات بیماران، جستجو، اکسل |
| تقویم کلینیک | مدیریت نوبت‌دهی و ویزیت‌ها          |
| خدمات        | تعریف و مدیریت خدمات درمانی         |
| حسابداری     | ثبت تراکنش‌ها، گزارش‌گیری           |
| انبار        | مدیریت موجودی کالا و محصولات        |
| گزارش‌ها     | آنالیز درآمد و عملکرد               |
| تنظیمات      | پیکربندی سیستم                      |
| لاگ سیستم    | ثبت رویدادهای مهم (فقط مدیر)        |

## Commands

| Command          | Description                       |
| ---------------- | --------------------------------- |
| `pnpm dev`       | Start dev server                  |
| `pnpm build`     | Type-check + build for production |
| `pnpm lint`      | ESLint check                      |
| `pnpm typecheck` | TypeScript check only             |
| `pnpm test`      | Vitest (watch)                    |
| `pnpm test:unit` | Vitest (single run)               |
| `pnpm preview`   | Preview production build          |

## Tech Stack

- **Frontend**: React 19, TypeScript ~6.0, Vite 8
- **Styling**: Tailwind CSS v4 with custom `@theme` tokens
- **Routing**: react-router v7
- **State/Data**: TanStack Query, React Context
- **Forms/Icons**: react-icons, Jalali date picker
- **Backend**: Django + Django REST Framework (see `backend/`)
- **PWA**: vite-plugin-pwa with generateSW strategy

## Project Structure

```
sefro-clinic-pwa/
├── src/
│   ├── components/    # UI components & design system
│   ├── hooks/api/     # TanStack Query hooks
│   ├── lib/           # Utilities (date, excel, format)
│   ├── routes/        # Page components & router
│   ├── services/      # API service layer
│   ├── types/         # TypeScript type definitions
│   ├── config/        # App configuration
│   └── contexts/      # React contexts
├── backend/           # Django backend
├── public/            # Static assets
└── .github/           # CI/CD workflows
```

---

# Sefro Clinic — Clinic Management System

A modern PWA for managing clinics and healthcare centers. Built with React 19 + TypeScript + Vite 8, styled with Tailwind v4, and powered by Django REST Framework on the backend.

## Key Features

| Module      | Description                           |
| ----------- | ------------------------------------- |
| Dashboard   | Overview stats, analytics charts      |
| Patients    | Patient records, search, Excel export |
| Calendar    | Appointment scheduling & visits       |
| Services    | Medical service definitions           |
| Accounting  | Payment transactions, reports         |
| Warehouse   | Inventory & product management        |
| Reports     | Revenue & performance analytics       |
| Settings    | System configuration                  |
| System Logs | Audit trail (admin only)              |

## Architecture

- **Monorepo-free**: Single frontend package with Django backend in `backend/`
- **RTL-first**: Persian language with right-to-left layout throughout
- **PWA-ready**: Offline support via service workers
- **Trunk-Based Development**: Short-lived branches, atomic commits, main always releasable
- **Role-based access**: Admin role gates sensitive features (e.g., logs)

## Development

See [AGENTS.md](./AGENTS.md) for detailed development conventions including TypeScript rules, Tailwind v4 tokens, component patterns, and CI/CD workflow.
