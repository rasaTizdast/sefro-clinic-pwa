import { useState } from 'react'
import { BiDownload, BiUser, BiDollar, BiHeart } from 'react-icons/bi'
import { IoDocumentTextOutline } from 'react-icons/io5'
import { PiClockCounterClockwise } from 'react-icons/pi'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
} from 'recharts'
import { Card, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Select } from '../components/ui/Select'

interface KpiStat {
  title: string
  value: string
  change: string
  trend: 'up' | 'down'
  icon: React.ReactNode
}

interface MonthlyRevenue {
  month: string
  revenue: number
}

interface AppointmentStatus {
  name: string
  value: number
  color: string
}

interface PatientVisit {
  month: string
  visits: number
}

interface ServiceCategory {
  name: string
  value: number
}

const dateRangeOptions = [
  { value: 'today', label: 'امروز' },
  { value: 'week', label: 'این هفته' },
  { value: 'month', label: 'این ماه' },
  { value: 'quarter', label: 'سه ماه اخیر' },
  { value: 'year', label: 'امسال' },
]

const kpiStats: KpiStat[] = [
  { title: 'مجموع مراجعین', value: '۱,۲۴۷', change: '+۱۲٪', trend: 'up', icon: <BiUser className="size-5" /> },
  { title: 'درآمد کل', value: '۱۸۷,۵۰۰,۰۰۰', change: '+۸٪', trend: 'up', icon: <BiDollar className="size-5" /> },
  { title: 'نرخ مراجعه مجدد', value: '۶۸٪', change: '+۵٪', trend: 'up', icon: <PiClockCounterClockwise className="size-5" /> },
  { title: 'میانگین رضایت', value: '۴.۸', change: '+۰.۳', trend: 'up', icon: <BiHeart className="size-5" /> },
]

const monthlyRevenue: MonthlyRevenue[] = [
  { month: 'فروردین', revenue: 12000000 },
  { month: 'اردیبهشت', revenue: 15000000 },
  { month: 'خرداد', revenue: 13500000 },
  { month: 'تیر', revenue: 17000000 },
  { month: 'مرداد', revenue: 16000000 },
  { month: 'شهریور', revenue: 19000000 },
  { month: 'مهر', revenue: 21000000 },
  { month: 'آبان', revenue: 18500000 },
  { month: 'آذر', revenue: 22000000 },
  { month: 'دی', revenue: 20500000 },
  { month: 'بهمن', revenue: 24000000 },
  { month: 'اسفند', revenue: 26000000 },
]

const appointmentStatusData: AppointmentStatus[] = [
  { name: 'انجام شده', value: 185, color: '#10b981' },
  { name: 'در انتظار', value: 65, color: '#f59e0b' },
  { name: 'لغو شده', value: 30, color: '#ef4444' },
  { name: 'تأیید شده', value: 120, color: '#2563eb' },
]

const monthlyVisits: PatientVisit[] = [
  { month: 'فروردین', visits: 85 },
  { month: 'اردیبهشت', visits: 95 },
  { month: 'خرداد', visits: 78 },
  { month: 'تیر', visits: 110 },
  { month: 'مرداد', visits: 102 },
  { month: 'شهریور', visits: 120 },
  { month: 'مهر', visits: 135 },
  { month: 'آبان', visits: 118 },
  { month: 'آذر', visits: 145 },
  { month: 'دی', visits: 128 },
  { month: 'بهمن', visits: 155 },
  { month: 'اسفند', visits: 170 },
]

const serviceCategoryData: ServiceCategory[] = [
  { name: 'ویزیت عمومی', value: 320 },
  { name: 'داخلی', value: 210 },
  { name: 'جراحی', value: 140 },
  { name: 'آزمایشگاه', value: 260 },
  { name: 'تصویربرداری', value: 180 },
  { name: 'داروخانه', value: 290 },
]

function formatCurrency(value: number): string {
  return value.toLocaleString('fa-IR')
}

function Analytics() {
  const [dateRange, setDateRange] = useState('year')

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">گزارش‌ها و آمار</h1>
        </div>
        <div className="flex items-center gap-3 mt-3 sm:mt-0">
          <Button variant="outline" startIcon={<BiDownload className="size-5" />}>
            خروجی Excel
          </Button>
          <Button variant="primary" startIcon={<IoDocumentTextOutline className="size-5" />}>
            خروجی PDF
          </Button>
        </div>
      </div>

      <div className="w-full sm:w-64">
        <Select
          options={dateRangeOptions}
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiStats.map((stat) => (
          <Card key={stat.title} variant="outlined" padding="lg">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-sm text-surface-500">{stat.title}</span>
                <span className="text-2xl font-bold text-surface-900">{stat.value}</span>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-primary-600">{stat.icon}</span>
                <span
                  className={`text-sm font-semibold ${
                    stat.trend === 'up' ? 'text-success-600' : 'text-danger-600'
                  }`}
                >
                  {stat.change}
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <Card variant="outlined" padding="lg" className="xl:col-span-3">
          <CardTitle>روند درآمد ماهانه</CardTitle>
          <div className="mt-4" dir="ltr">
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip
                  formatter={(value) => [`${formatCurrency(Number(value))} تومان`, 'درآمد']}
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    fontSize: 13,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={{ fill: '#2563eb', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card variant="outlined" padding="lg" className="xl:col-span-2">
          <CardTitle>وضعیت نوبت‌ها</CardTitle>
          <div className="mt-4" dir="ltr">
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={appointmentStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  dataKey="value"
                  paddingAngle={3}
                >
                  {appointmentStatusData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [Number(value), 'تعداد']}
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    fontSize: 13,
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value: string) => (
                    <span style={{ color: '#334155', fontSize: 12 }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex flex-wrap gap-4 justify-center">
            {appointmentStatusData.map((item) => (
              <div key={item.name} className="flex items-center gap-2 text-sm text-surface-600">
                <span
                  className="size-3 rounded-sm"
                  style={{ backgroundColor: item.color }}
                />
                <span>{item.name}</span>
                <span className="font-medium text-surface-900">{item.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card variant="outlined" padding="lg">
          <CardTitle>مراجعه بیماران به صورت ماهانه</CardTitle>
          <div className="mt-4" dir="ltr">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={monthlyVisits}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip
                  formatter={(value) => [Number(value), 'مراجعه']}
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    fontSize: 13,
                  }}
                />
                <Bar dataKey="visits" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card variant="outlined" padding="lg">
          <CardTitle>محبوبیت دسته‌بندی خدمات</CardTitle>
          <div className="mt-4" dir="ltr">
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={serviceCategoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip
                  formatter={(value) => [Number(value), 'تعداد']}
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    fontSize: 13,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#2563eb"
                  fill="#2563eb"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default Analytics
