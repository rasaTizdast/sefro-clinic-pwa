import { useState, useEffect, useMemo } from 'react'
import { BiPlus, BiSearch, BiDownload, BiEdit, BiTrash } from 'react-icons/bi'
import { PiDotsThreeVertical } from 'react-icons/pi'
import { MdOutlinePeople } from 'react-icons/md'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Textarea } from '../components/ui/Textarea'
import { Badge } from '../components/ui/Badge'
import { Table, type Column } from '../components/ui/Table'
import { Tabs } from '../components/ui/Tabs'
import type { Tab } from '../components/ui/Tabs'
import { Modal } from '../components/ui/Modal'
import { Pagination } from '../components/ui/Pagination'
import { EmptyState } from '../components/ui/EmptyState'
import { Alert } from '../components/ui/Alert'
import { Breadcrumb } from '../components/ui/Breadcrumb'
import type { BreadcrumbItem } from '../components/ui/Breadcrumb'
import { Dropdown } from '../components/ui/Dropdown'
import type { DropdownItem } from '../components/ui/Dropdown'

interface Patient {
  id: number
  name: string
  phone: string
  nationalCode: string
  birthDate: string
  address: string
  notes: string
  lastVisit: string
  visitCount: number
  debt: number
  status: 'active' | 'inactive' | 'new'
  createdAt: string
}

interface PatientForm {
  name: string
  phone: string
  nationalCode: string
  birthDate: string
  address: string
  notes: string
}

const statusMap: Record<Patient['status'], { label: string; variant: 'success' | 'warning' | 'info' }> = {
  active: { label: 'فعال', variant: 'success' },
  inactive: { label: 'غیرفعال', variant: 'warning' },
  new: { label: 'جدید', variant: 'info' },
}

const filterTabs: Tab[] = [
  { id: 'all', label: 'همه' },
  { id: 'active', label: 'فعال' },
  { id: 'inactive', label: 'غیرفعال' },
  { id: 'new', label: 'جدید' },
]

const breadcrumbItems: BreadcrumbItem[] = [
  { label: 'داشبورد', href: '/' },
  { label: 'بیماران' },
]

const initialForm: PatientForm = {
  name: '',
  phone: '',
  nationalCode: '',
  birthDate: '',
  address: '',
  notes: '',
}

const PAGE_SIZE = 10

const mockPatients: Patient[] = [
  { id: 1, name: 'علی رضایی', phone: '۰۹۱۲۳۴۵۶۷۸۹', nationalCode: '۰۰۱۲۳۴۵۶۷۸', birthDate: '۱۳۶۵/۰۴/۱۵', address: 'تهران، خیابان ولیعصر، کوچه گلستان ۱۲', notes: 'فشار خون بالا', lastVisit: '۱۴۰۵/۰۳/۰۳', visitCount: 24, debt: 0, status: 'active', createdAt: '۱۴۰۴/۱۰/۰۱' },
  { id: 2, name: 'سارا احمدی', phone: '۰۹۱۹۸۷۶۵۴۳۲', nationalCode: '۰۰۲۹۸۷۶۵۴۳', birthDate: '۱۳۷۰/۰۸/۲۰', address: 'اصفهان، خیابان چهارباغ، کوچه سعدی', notes: '', lastVisit: '۱۴۰۵/۰۳/۰۳', visitCount: 8, debt: 150000, status: 'new', createdAt: '۱۴۰۵/۰۲/۲۸' },
  { id: 3, name: 'رضا کریمی', phone: '۰۹۳۳۵۵۷۷۸۸', nationalCode: '۰۰۳۳۵۵۷۷۸۸', birthDate: '۱۳۵۸/۱۱/۰۵', address: 'شیراز، خیابان زند، کوچه باغ', notes: 'دیابت نوع ۲', lastVisit: '۱۴۰۵/۰۲/۲۸', visitCount: 56, debt: 320000, status: 'active', createdAt: '۱۴۰۳/۰۶/۱۵' },
  { id: 4, name: 'مریم نوروزی', phone: '۰۹۱۲۲۲۳۳۴۴', nationalCode: '۰۰۴۲۲۲۳۳۴۴', birthDate: '۱۳۷۵/۰۲/۱۰', address: 'تهران، خیابان انقلاب، کوچه پروین', notes: '', lastVisit: '۱۴۰۵/۰۲/۱۵', visitCount: 3, debt: 0, status: 'inactive', createdAt: '۱۴۰۵/۰۱/۱۰' },
  { id: 5, name: 'امیر عباسی', phone: '۰۹۰۱۸۸۷۷۶۶', nationalCode: '۰۰۵۱۸۸۷۷۶۶', birthDate: '۱۳۶۰/۰۶/۲۵', address: 'مشهد، خیابان امام رضا، کوچه طلا', notes: 'آسم', lastVisit: '۱۴۰۵/۰۳/۰۱', visitCount: 18, debt: 75000, status: 'active', createdAt: '۱۴۰۴/۰۲/۰۵' },
  { id: 6, name: 'نگین صادقی', phone: '۰۹۳۶۶۴۴۳۲۱', nationalCode: '۰۰۶۶۶۴۴۳۲۱', birthDate: '۱۳۷۸/۰۹/۱۵', address: 'تهران، خیابان شریعتی، کوچه مهر', notes: 'بارداری', lastVisit: '۱۴۰۵/۰۲/۲۰', visitCount: 12, debt: 0, status: 'new', createdAt: '۱۴۰۵/۰۲/۱۰' },
  { id: 7, name: 'محمد حسینی', phone: '۰۹۱۴۴۵۵۶۶۷', nationalCode: '۰۰۷۴۴۵۵۶۶۷', birthDate: '۱۳۴۸/۰۳/۲۰', address: 'تبریز، خیابان امام، کوچه مصلی', notes: 'فشار خون بالا - دیابت', lastVisit: '۱۴۰۵/۰۱/۱۵', visitCount: 42, debt: 500000, status: 'active', createdAt: '۱۴۰۲/۰۸/۲۰' },
  { id: 8, name: 'زهرا محمدی', phone: '۰۹۱۲۷۷۸۸۹۹', nationalCode: '۰۰۸۲۷۷۸۸۹۹', birthDate: '۱۳۸۰/۱۲/۰۱', address: 'کرج، خیابان طالقانی، کوچه گلزار', notes: '', lastVisit: '۱۴۰۴/۱۲/۲۰', visitCount: 1, debt: 0, status: 'inactive', createdAt: '۱۴۰۴/۱۲/۱۰' },
  { id: 9, name: 'حسین رستمی', phone: '۰۹۳۰۱۱۲۲۳۳', nationalCode: '۰۰۹۰۱۱۲۲۳۳', birthDate: '۱۳۵۵/۰۷/۱۲', address: 'قم، خیابان مدرس، کوچه نور', notes: 'آرتروز', lastVisit: '۱۴۰۵/۰۲/۰۵', visitCount: 31, debt: 180000, status: 'active', createdAt: '۱۴۰۳/۱۲/۰۱' },
  { id: 10, name: 'فاطمه موسوی', phone: '۰۹۱۸۸۹۹۰۰۱۱', nationalCode: '۰۱۰۸۸۹۹۰۰۱۱', birthDate: '۱۳۷۲/۰۵/۳۰', address: 'رشت، خیابان گلسار، کوچه زیتون', notes: 'میگرن', lastVisit: '۱۴۰۴/۱۱/۲۸', visitCount: 15, debt: 95000, status: 'active', createdAt: '۱۴۰۴/۰۵/۱۵' },
  { id: 11, name: 'احمد کرمی', phone: '۰۹۰۳۳۴۴۵۵۶', nationalCode: '۰۱۱۳۳۴۴۵۵۶', birthDate: '۱۳۶۸/۰۱/۱۴', address: 'اهواز، خیابان کیانپارس، کوچه سپاه', notes: '', lastVisit: '۱۴۰۴/۱۰/۰۸', visitCount: 6, debt: 0, status: 'inactive', createdAt: '۱۴۰۴/۰۹/۲۰' },
  { id: 12, name: 'لیلا حیدری', phone: '۰۹۳۵۵۶۶۷۷۸', nationalCode: '۰۱۲۵۵۶۶۷۷۸', birthDate: '۱۳۸۲/۰۴/۲۵', address: 'تهران، خیابان پاسداران، کوچه نسترن', notes: 'آلرژی فصلی', lastVisit: '۱۴۰۵/۰۳/۰۲', visitCount: 4, debt: 0, status: 'new', createdAt: '۱۴۰۵/۰۲/۲۵' },
]

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fa-IR').format(amount) + ' تومان'
}

function Patients() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<PatientForm>(initialForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800)
    return () => clearTimeout(timer)
  }, [])

  const filteredPatients = useMemo(() => {
    let result = [...mockPatients]

    if (activeTab === 'active') {
      result = result.filter((p) => p.status === 'active')
    } else if (activeTab === 'inactive') {
      result = result.filter((p) => p.status === 'inactive')
    } else if (activeTab === 'new') {
      result = result.filter((p) => p.status === 'new')
    }

    if (search.trim()) {
      const q = search.trim()
      result = result.filter(
        (p) => p.name.includes(q) || p.phone.includes(q) || p.nationalCode.includes(q),
      )
    }

    return result
  }, [activeTab, search])

  const totalPages = Math.max(1, Math.ceil(filteredPatients.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const pageData = filteredPatients.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  )

  const tabCounts = useMemo(() => {
    const all = mockPatients.length
    const active = mockPatients.filter((p) => p.status === 'active').length
    const inactive = mockPatients.filter((p) => p.status === 'inactive').length
    const newP = mockPatients.filter((p) => p.status === 'new').length
    return { all, active, inactive, new: newP }
  }, [])

  const tabsWithBadges: Tab[] = filterTabs.map((tab) => ({
    ...tab,
    badge: tabCounts[tab.id as keyof typeof tabCounts],
  }))

  const handleFormChange = (field: keyof PatientForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = () => {
    setSaving(true)
    setTimeout(() => {
      setSaving(false)
      setModalOpen(false)
      setForm(initialForm)
    }, 1000)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setForm(initialForm)
  }

  const handleRetry = () => {
    setError(null)
    setLoading(true)
    setTimeout(() => setLoading(false), 800)
  }

  const getActionItems = (): DropdownItem[] => [
    {
      label: 'ویرایش',
      icon: <BiEdit className="size-4" />,
      onClick: () => {},
    },
    { divider: true },
    {
      label: 'حذف',
      icon: <BiTrash className="size-4" />,
      danger: true,
      onClick: () => {},
    },
  ]

  const columns: Column<Patient>[] = [
    { key: 'name', header: 'نام بیمار' },
    { key: 'phone', header: 'تلفن', width: '130px' },
    { key: 'lastVisit', header: 'آخرین مراجعه', align: 'center', width: '130px' },
    {
      key: 'visitCount',
      header: 'تعداد مراجعات',
      align: 'center',
      width: '120px',
      render: (item) => new Intl.NumberFormat('fa-IR').format(item.visitCount),
    },
    {
      key: 'debt',
      header: 'بدهی',
      align: 'end',
      width: '130px',
      render: (item) => (
        <span className={item.debt > 0 ? 'text-danger-600 font-medium' : 'text-surface-400'}>
          {item.debt > 0 ? formatCurrency(item.debt) : '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'وضعیت',
      align: 'center',
      width: '90px',
      render: (item) => {
        const s = statusMap[item.status]
        return <Badge variant={s.variant} size="sm">{s.label}</Badge>
      },
    },
    {
      key: 'actions',
      header: 'عملیات',
      align: 'center',
      width: '80px',
      render: () => (
        <Dropdown
          align="end"
          trigger={
            <Button variant="ghost" size="sm" icon={<PiDotsThreeVertical className="size-4" />} />
          }
          items={getActionItems()}
        />
      ),
    },
  ]

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <Breadcrumb items={breadcrumbItems} />
        <Alert variant="error" title="خطا در بارگذاری" dismissible onDismiss={() => setError(null)}>
          <p>{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={handleRetry}>
            تلاش مجدد
          </Button>
        </Alert>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb items={breadcrumbItems} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">لیست بیماران</h1>
          <p className="text-sm text-surface-500 mt-1">مدیریت بیماران کلینیک</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="md" icon={<BiDownload className="size-4" />}>
            خروجی
          </Button>
          <Button
            variant="primary"
            size="md"
            icon={<BiPlus className="size-5" />}
            onClick={() => setModalOpen(true)}
          >
            بیمار جدید
          </Button>
        </div>
      </div>

      <Card variant="outlined" padding="none">
        <div className="p-4 pb-3">
          <Input
            placeholder="جستجوی نام، تلفن یا کد ملی..."
            leftIcon={<BiSearch className="size-4" />}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setCurrentPage(1)
            }}
          />
        </div>

        <Tabs
          tabs={tabsWithBadges}
          activeTab={activeTab}
          onChange={(id) => {
            setActiveTab(id)
            setCurrentPage(1)
          }}
        />

        <div className="p-4">
          {loading ? (
            <Table columns={columns} data={[]} loading rowKey={() => ''} />
          ) : filteredPatients.length === 0 ? (
            <EmptyState
              icon={<MdOutlinePeople className="size-16" />}
              title={search ? 'نتیجه‌ای یافت نشد' : 'بیماری وجود ندارد'}
              description={
                search
                  ? 'با عبارت دیگری جستجو کنید.'
                  : 'هنوز بیماری در این دسته ثبت نشده است.'
              }
              action={
                <Button
                  variant="primary"
                  icon={<BiPlus className="size-5" />}
                  onClick={() => setModalOpen(true)}
                >
                  ثبت بیمار جدید
                </Button>
              }
            />
          ) : (
            <>
              <Table
                columns={columns}
                data={pageData}
                rowKey={(item) => item.id}
              />
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                className="mt-4"
              />
            </>
          )}
        </div>
      </Card>

      <Modal
        open={modalOpen}
        onClose={handleCloseModal}
        title="بیمار جدید"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={handleCloseModal}>
              انصراف
            </Button>
            <Button variant="primary" loading={saving} onClick={handleSave}>
              ذخیره
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            label="نام و نام خانوادگی"
            placeholder="مثال: علی رضایی"
            value={form.name}
            onChange={(e) => handleFormChange('name', e.target.value)}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="شماره تلفن"
              placeholder="۰۹۱۲۳۴۵۶۷۸۹"
              value={form.phone}
              onChange={(e) => handleFormChange('phone', e.target.value)}
            />
            <Input
              label="کد ملی"
              placeholder="۰۰۱۲۳۴۵۶۷۸"
              value={form.nationalCode}
              onChange={(e) => handleFormChange('nationalCode', e.target.value)}
            />
          </div>
          <Input
            label="تاریخ تولد"
            placeholder="۱۳۶۵/۰۴/۱۵"
            value={form.birthDate}
            onChange={(e) => handleFormChange('birthDate', e.target.value)}
          />
          <Textarea
            label="آدرس"
            placeholder="آدرس کامل بیمار"
            rows={3}
            value={form.address}
            onChange={(e) => handleFormChange('address', e.target.value)}
          />
          <Textarea
            label="توضیحات"
            placeholder="توضیحات پزشکی (اختیاری)"
            rows={3}
            value={form.notes}
            onChange={(e) => handleFormChange('notes', e.target.value)}
          />
        </div>
      </Modal>
    </div>
  )
}

export default Patients
