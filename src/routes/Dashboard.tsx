import { useState } from 'react'
import { BiPlus, BiSearch, BiCalendar, BiUserPlus, BiTrendingUp, BiTrendingDown, BiMinus } from 'react-icons/bi'
import { IoDocumentTextOutline } from 'react-icons/io5'
import { MdPeople, MdEventAvailable, MdPayments, MdPersonAdd } from 'react-icons/md'
import { Card, CardTitle } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Table, type Column } from '../components/ui/Table'
import { Progress } from '../components/ui/Progress'
import { EmptyState } from '../components/ui/EmptyState'
import { Skeleton, SkeletonTable } from '../components/ui/Skeleton'
import { Alert } from '../components/ui/Alert'

interface Stat {
  title: string
  value: string
  change: string
  trend: 'up' | 'down' | 'flat'
  icon: React.ReactNode
  variant: 'default' | 'success' | 'warning' | 'danger' | 'info'
}

interface Appointment {
  id: number
  time: string
  patient: string
  doctor: string
  status: 'confirmed' | 'waiting' | 'cancelled' | 'completed'
}

interface Patient {
  id: number
  name: string
  phone: string
  lastVisit: string
  status: 'active' | 'inactive' | 'new'
}

const appointmentStatusMap: Record<
  Appointment['status'],
  { label: string; variant: 'success' | 'warning' | 'danger' | 'info' }
> = {
  confirmed: { label: 'تأیید شده', variant: 'success' },
  waiting: { label: 'در انتظار', variant: 'warning' },
  cancelled: { label: 'لغو شده', variant: 'danger' },
  completed: { label: 'انجام شده', variant: 'info' },
}

const patientStatusMap: Record<
  Patient['status'],
  { label: string; variant: 'success' | 'warning' | 'info' }
> = {
  active: { label: 'فعال', variant: 'success' },
  inactive: { label: 'غیرفعال', variant: 'warning' },
  new: { label: 'جدید', variant: 'info' },
}

const quickActions = [
  { label: 'مراجعه جدید', icon: <BiUserPlus className="size-5" />, variant: 'primary' as const },
  { label: 'نوبت جدید', icon: <BiCalendar className="size-5" />, variant: 'secondary' as const },
  { label: 'جستجوی بیمار', icon: <BiSearch className="size-5" />, variant: 'outline' as const },
  { label: 'گزارش سریع', icon: <IoDocumentTextOutline className="size-5" />, variant: 'ghost' as const },
]

const appointmentColumns: Column<Appointment>[] = [
  { key: 'time', header: 'ساعت', width: '80px' },
  { key: 'patient', header: 'بیمار' },
  { key: 'doctor', header: 'پزشک' },
  {
    key: 'status',
    header: 'وضعیت',
    align: 'center',
    render: (item) => {
      const s = appointmentStatusMap[item.status]
      return <Badge variant={s.variant} size="sm">{s.label}</Badge>
    },
  },
]

const patientColumns: Column<Patient>[] = [
  { key: 'name', header: 'نام بیمار' },
  { key: 'phone', header: 'تلفن' },
  { key: 'lastVisit', header: 'آخرین مراجعه', align: 'center' },
  {
    key: 'status',
    header: 'وضعیت',
    align: 'center',
    render: (item) => {
      const s = patientStatusMap[item.status]
      return <Badge variant={s.variant} size="sm">{s.label}</Badge>
    },
  },
]

function toLatinDigits(str: string): string {
  const persian = '۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩'
  return str.replace(/[۰-۹٠-٩]/g, (d) => String(persian.indexOf(d) % 10))
}

const mockAppointments: Appointment[] = [
  { id: 1, time: '۰۹:۰۰', patient: 'علی رضایی', doctor: 'دکتر محمدی', status: 'completed' },
  { id: 2, time: '۰۹:۳۰', patient: 'سارا احمدی', doctor: 'دکتر محمدی', status: 'confirmed' },
  { id: 3, time: '۱۰:۱۵', patient: 'رضا کریمی', doctor: 'دکتر حسینی', status: 'waiting' },
  { id: 4, time: '۱۰:۴۵', patient: 'مریم نوروزی', doctor: 'دکتر حسینی', status: 'confirmed' },
  { id: 5, time: '۱۱:۳۰', patient: 'امیر عباسی', doctor: 'دکتر محمدی', status: 'cancelled' },
  { id: 6, time: '۱۲:۰۰', patient: 'نگین صادقی', doctor: 'دکتر احمدی', status: 'waiting' },
]

const mockPatients: Patient[] = [
  { id: 1, name: 'علی رضایی', phone: '۰۹۱۲۳۴۵۶۷۸۹', lastVisit: '۱۴۰۵/۰۳/۰۳', status: 'active' },
  { id: 2, name: 'سارا احمدی', phone: '۰۹۱۹۸۷۶۵۴۳۲', lastVisit: '۱۴۰۵/۰۳/۰۳', status: 'new' },
  { id: 3, name: 'رضا کریمی', phone: '۰۹۳۳۵۵۷۷۸۸', lastVisit: '۱۴۰۵/۰۲/۲۸', status: 'active' },
  { id: 4, name: 'مریم نوروزی', phone: '۰۹۱۲۲۲۳۳۴۴', lastVisit: '۱۴۰۵/۰۲/۱۵', status: 'inactive' },
  { id: 5, name: 'امیر عباسی', phone: '۰۹۰۱۸۸۷۷۶۶', lastVisit: '۱۴۰۵/۰۳/۰۱', status: 'active' },
  { id: 6, name: 'زهرا محمدی', phone: '۰۹۳۰۴۴۵۵۶۶', lastVisit: '۱۴۰۵/۰۲/۲۵', status: 'new' },
]

const stats: Stat[] = [
  {
    title: 'مراجعین امروز', value: '۱۲', change: '+۳', trend: 'up',
    icon: <MdPeople className="size-5" />, variant: 'default',
  },
  {
    title: 'نوبت‌های امروز', value: '۸', change: '+۲', trend: 'up',
    icon: <MdEventAvailable className="size-5" />, variant: 'info',
  },
  {
    title: 'درآمد امروز', value: '۵,۸۰۰,۰۰۰', change: '+۱,۲۰۰,۰۰۰', trend: 'up',
    icon: <MdPayments className="size-5" />, variant: 'success',
  },
  {
    title: 'بیماران جدید', value: '۴', change: 'بدون تغییر', trend: 'flat',
    icon: <MdPersonAdd className="size-5" />, variant: 'warning',
  },
]

type PageState = 'loading' | 'error' | 'empty' | 'ready'

function trendIcon(trend: Stat['trend']) {
  if (trend === 'up') return <BiTrendingUp className="size-4 text-success-600" />
  if (trend === 'down') return <BiTrendingDown className="size-4 text-danger-600" />
  return <BiMinus className="size-4 text-surface-400" />
}

function trendColor(trend: Stat['trend']) {
  if (trend === 'up') return 'text-success-600'
  if (trend === 'down') return 'text-danger-600'
  return 'text-surface-400'
}

function getPersianDate(): string {
  try {
    return new Date().toLocaleDateString('fa-IR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })
  } catch {
    return ''
  }
}

function Dashboard() {
  const [pageState] = useState<PageState>('ready')
  const [today] = useState(getPersianDate)
  const completedCount = mockAppointments.filter((a) => a.status === 'completed').length
  const capacityPercent = Math.round((completedCount / mockAppointments.length) * 100)

  if (pageState === 'loading') {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <Skeleton width="160px" height="2rem" />
            <Skeleton width="200px" height="1rem" />
          </div>
          <Skeleton width="130px" height="2.5rem" variant="rectangular" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} variant="outlined" padding="lg">
              <div className="flex flex-col gap-3">
                <Skeleton width="60%" height="0.875rem" />
                <Skeleton width="40%" height="1.75rem" />
                <Skeleton width="100%" height="0.5rem" variant="rectangular" />
              </div>
            </Card>
          ))}
        </div>
        <Skeleton width="100%" height="6rem" variant="rectangular" />
        <div className="grid gap-6 xl:grid-cols-2">
          <SkeletonTable rows={4} columns={4} />
          <div className="flex flex-col gap-4">
            <Skeleton width="100%" height="4rem" variant="rectangular" />
            <SkeletonTable rows={3} columns={3} />
          </div>
        </div>
      </div>
    )
  }

  if (pageState === 'error') {
    return (
      <div className="flex flex-col gap-6">
        <Alert variant="error" title="خطا در بارگذاری داشبورد">
          متأسفانه در دریافت اطلاعات داشبورد مشکلی پیش آمده است. لطفاً صفحه را مجدداً بارگذاری کنید.
        </Alert>
        <Button variant="primary" onClick={() => window.location.reload()}>
          بارگذاری مجدد
        </Button>
      </div>
    )
  }

  if (pageState === 'empty') {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-surface-900">داشبورد</h1>
        </div>
        <EmptyState
          icon={<MdEventAvailable className="size-12" />}
          title="داشبورد خالی است"
          description="هنوز هیچ داده‌ای برای نمایش وجود ندارد. با ثبت اولین مراجعه، داشبورد شما فعال می‌شود."
          action={<Button variant="primary" startIcon={<BiPlus className="size-5" />}>ثبت اولین مراجعه</Button>}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">داشبورد</h1>
          <p className="text-sm text-surface-500 mt-1">
            امروز: {today}
          </p>
        </div>
        <Button variant="primary" startIcon={<BiPlus className="size-5" />} className="mt-3 sm:mt-0">
          نوبت جدید
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} variant="outlined" padding="lg">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-sm text-surface-500 flex items-center gap-1.5">
                  <span className="text-primary-600">{stat.icon}</span>
                  {stat.title}
                </span>
                <span className="text-2xl font-bold text-surface-900">{stat.value}</span>
              </div>
              <div className={`flex items-center gap-1 text-sm font-medium ${trendColor(stat.trend)}`}>
                {trendIcon(stat.trend)}
                {stat.change}
              </div>
            </div>
            <Progress
              value={Number(toLatinDigits(stat.value).replace(/[^\d]/g, '')) * 7}
              variant={stat.variant}
              size="sm"
              className="mt-4"
            />
          </Card>
        ))}
      </div>

      <Card variant="outlined" padding="lg">
        <CardTitle>اقدامات سریع</CardTitle>
        <div className="mt-4 flex flex-wrap gap-3">
          {quickActions.map((action) => (
            <Button
              key={action.label}
              variant={action.variant}
              startIcon={action.icon}
              size="md"
            >
              {action.label}
            </Button>
          ))}
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card variant="outlined" padding="none">
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-200">
            <CardTitle>نوبت‌های امروز</CardTitle>
            <Badge variant="info" size="sm" dot>
              {mockAppointments.length} نوبت
            </Badge>
          </div>
          {mockAppointments.length > 0 ? (
            <Table
              columns={appointmentColumns}
              data={mockAppointments}
              rowKey={(item) => item.id}
              className="border-0 rounded-none"
            />
          ) : (
            <div className="px-5 py-8">
              <EmptyState
                title="نوبتی ثبت نشده"
                description="برای امروز هیچ نوبتی ثبت نشده است."
              />
            </div>
          )}
        </Card>

        <div className="flex flex-col gap-6">
          <Card variant="outlined" padding="none">
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-200">
              <CardTitle>ظرفیت امروز</CardTitle>
              <span className="text-sm font-medium text-surface-500">{capacityPercent}%</span>
            </div>
            <div className="px-5 pt-4">
              <Progress value={capacityPercent} variant="info" size="md" showLabel />
            </div>
            <div className="px-5 pb-2 mt-2">
              <div className="flex items-center justify-between text-sm text-surface-500 py-2">
                <span>انجام شده: {completedCount}</span>
                <span>کل: {mockAppointments.length}</span>
              </div>
            </div>
          </Card>

          <Card variant="outlined" padding="none">
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-200">
              <CardTitle>مراجعین اخیر</CardTitle>
              <Badge variant="default" size="sm">
                {mockPatients.length} بیمار
              </Badge>
            </div>
            {mockPatients.length > 0 ? (
              <Table
                columns={patientColumns}
                data={mockPatients}
                rowKey={(item) => item.id}
                className="border-0 rounded-none"
              />
            ) : (
              <div className="px-5 py-8">
                <EmptyState
                  title="بیماری ثبت نشده"
                  description="هنوز هیچ بیماری در سیستم ثبت نشده است."
                />
              </div>
            )}
          </Card>
        </div>
      </div>

      {mockAppointments.length === 0 && mockPatients.length === 0 && (
        <EmptyState
          title="داده‌ای وجود ندارد"
          description="با استفاده از دکمه بالای صفحه، اولین نوبت امروز را ثبت کنید."
          action={<Button variant="primary" startIcon={<BiPlus />}>ثبت نوبت جدید</Button>}
        />
      )}
    </div>
  )
}

export default Dashboard
