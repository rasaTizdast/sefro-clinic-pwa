import { useState } from 'react'
import { BiPlus } from 'react-icons/bi'
import { CiEdit, CiTrash } from 'react-icons/ci'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Textarea } from '../components/ui/Textarea'
import { Toggle } from '../components/ui/Toggle'
import { Table, type Column } from '../components/ui/Table'
import { Tabs, TabPanel } from '../components/ui/Tabs'
import { Breadcrumb } from '../components/ui/Breadcrumb'
import { Pagination } from '../components/ui/Pagination'
import { Dropdown, type DropdownItem } from '../components/ui/Dropdown'

const CATEGORIES_BEAUTY = 'زیبایی'
const CATEGORIES_THERAPEUTIC = 'درمانی'
const CATEGORIES_CONSULTATION = 'مشاوره'
const CATEGORIES_LAB = 'آزمایشگاهی'

const CATEGORIES = [
  CATEGORIES_BEAUTY,
  CATEGORIES_THERAPEUTIC,
  CATEGORIES_CONSULTATION,
  CATEGORIES_LAB,
]

const CATEGORY_OPTIONS = CATEGORIES.map((c) => ({ value: c, label: c }))

const categoryTabs = [
  { id: 'all', label: 'همه' },
  ...CATEGORIES.map((c) => ({ id: c, label: c })),
]

interface Service {
  id: number
  title: string
  category: string
  duration: number
  price: number
  description: string
  isActive: boolean
}

interface ServiceFormData {
  title: string
  category: string
  duration: string
  price: string
  description: string
  isActive: boolean
}

const initialForm: ServiceFormData = {
  title: '',
  category: '',
  duration: '',
  price: '',
  description: '',
  isActive: true,
}

const mockServices: Service[] = [
  { id: 1, title: 'فیشال صورت', category: CATEGORIES_BEAUTY, duration: 45, price: 350000, description: 'پاکسازی عمقی و مرطوب‌سازی پوست صورت', isActive: true },
  { id: 2, title: 'میکرونیدلینگ', category: CATEGORIES_BEAUTY, duration: 60, price: 500000, description: 'تحریک کلاژن‌سازی با سوزن‌های ریز', isActive: true },
  { id: 3, title: 'لیزر موهای زائد', category: CATEGORIES_BEAUTY, duration: 30, price: 450000, description: 'حذف دائمی موهای زائد با لیزر', isActive: true },
  { id: 4, title: 'درمان آکنه', category: CATEGORIES_BEAUTY, duration: 30, price: 250000, description: 'درجۀ یک آکنه و جوش صورت', isActive: false },
  { id: 5, title: 'مشاوره تغذیه', category: CATEGORIES_CONSULTATION, duration: 30, price: 180000, description: 'مشاوره تغذیه و رژیم درمانی', isActive: true },
  { id: 6, title: 'مشاوره روانشناسی', category: CATEGORIES_CONSULTATION, duration: 45, price: 250000, description: 'مشاوره فردی و مدیریت استرس', isActive: true },
  { id: 7, title: 'فیزیوتراپی', category: CATEGORIES_THERAPEUTIC, duration: 45, price: 300000, description: 'فیزیوتراپی تخصصی برای انواع دردهای عضلانی', isActive: true },
  { id: 8, title: 'آزمایش خون', category: CATEGORIES_LAB, duration: 15, price: 120000, description: 'انواع آزمایش‌های خون و بیوشیمی', isActive: true },
  { id: 9, title: 'تزریق بوتاکس', category: CATEGORIES_BEAUTY, duration: 30, price: 800000, description: 'تزریق بوتاکس برای کاهش چین و چروک', isActive: true },
  { id: 10, title: 'درمان زگیل', category: CATEGORIES_THERAPEUTIC, duration: 20, price: 200000, description: 'درمان و برداشتن زگیل با لیزر یا کرایو', isActive: true },
  { id: 11, title: 'پاکسازی پوست', category: CATEGORIES_BEAUTY, duration: 60, price: 350000, description: 'پاکسازی تخصصی پوست با بخور و ماسک', isActive: false },
  { id: 12, title: 'مشاوره پوست و مو', category: CATEGORIES_CONSULTATION, duration: 30, price: 200000, description: 'مشاوره تخصصی مشکلات پوست و مو', isActive: true },
]

const PAGE_SIZE = 6

const statusConfig: Record<string, { label: string; variant: 'success' | 'warning' }> = {
  active: { label: 'فعال', variant: 'success' },
  inactive: { label: 'غیرفعال', variant: 'warning' },
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('fa-IR').format(price)
}

function Services() {
  const [services, setServices] = useState<Service[]>(mockServices)
  const [activeTab, setActiveTab] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [form, setForm] = useState<ServiceFormData>(initialForm)

  const filteredServices =
    activeTab === 'all'
      ? services
      : services.filter((s) => s.category === activeTab)

  const totalPages = Math.max(1, Math.ceil(filteredServices.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedServices = filteredServices.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  )

  function openAddModal() {
    setEditingService(null)
    setForm(initialForm)
    setModalOpen(true)
  }

  function openEditModal(service: Service) {
    setEditingService(service)
    setForm({
      title: service.title,
      category: service.category,
      duration: String(service.duration),
      price: String(service.price),
      description: service.description,
      isActive: service.isActive,
    })
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingService(null)
  }

  function handleFormChange(field: keyof ServiceFormData, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleSave() {
    const newService: Service = {
      id: editingService ? editingService.id : Date.now(),
      title: form.title,
      category: form.category,
      duration: Number(form.duration),
      price: Number(form.price),
      description: form.description,
      isActive: form.isActive,
    }

    if (editingService) {
      setServices((prev) => prev.map((s) => (s.id === editingService.id ? newService : s)))
    } else {
      setServices((prev) => [...prev, newService])
    }

    closeModal()
  }

  function handleDelete(service: Service) {
    setServices((prev) => prev.filter((s) => s.id !== service.id))
  }

  function handleToggleActive(service: Service) {
    setServices((prev) =>
      prev.map((s) => (s.id === service.id ? { ...s, isActive: !s.isActive } : s)),
    )
  }

  function handleTabChange(tabId: string) {
    setActiveTab(tabId)
    setCurrentPage(1)
  }

  function buildActions(service: Service): DropdownItem[] {
    return [
      {
        label: 'ویرایش',
        icon: <CiEdit className="size-4" />,
        onClick: () => openEditModal(service),
      },
      {
        label: 'حذف',
        icon: <CiTrash className="size-4" />,
        danger: true,
        onClick: () => handleDelete(service),
      },
    ]
  }

  const columns: Column<Service>[] = [
    { key: 'title', header: 'عنوان خدمت' },
    {
      key: 'category',
      header: 'دسته‌بندی',
      render: (item) => <Badge variant="info" size="sm">{item.category}</Badge>,
    },
    {
      key: 'duration',
      header: 'مدت (دقیقه)',
      align: 'center',
      render: (item) => <span>{new Intl.NumberFormat('fa-IR').format(item.duration)}</span>,
    },
    {
      key: 'price',
      header: 'قیمت (تومان)',
      align: 'end',
      render: (item) => <span className="font-medium">{formatPrice(item.price)}</span>,
    },
    {
      key: 'isActive',
      header: 'وضعیت',
      align: 'center',
      render: (item) => {
        const cfg = item.isActive ? statusConfig.active : statusConfig.inactive
        return <Toggle label={cfg.label} checked={item.isActive} onChange={() => handleToggleActive(item)} />
      },
    },
    {
      key: 'actions',
      header: 'عملیات',
      align: 'center',
      width: '80px',
      render: (item) => (
        <Dropdown
          trigger={
            <Button variant="ghost" size="sm">
              <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01" />
              </svg>
            </Button>
          }
          items={buildActions(item)}
          align="end"
        />
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <Breadcrumb
            items={[
              { label: 'تنظیمات', href: '#' },
              { label: 'خدمات کلینیک' },
            ]}
          />
          <h1 className="text-2xl font-bold text-surface-900 mt-1">خدمات کلینیک</h1>
        </div>
        <Button
          variant="primary"
          icon={<BiPlus className="size-5" />}
          className="mt-3 sm:mt-0"
          onClick={openAddModal}
        >
          خدمت جدید
        </Button>
      </div>

      <Card variant="outlined" padding="none">
        <Tabs tabs={categoryTabs} activeTab={activeTab} onChange={handleTabChange} />
        <TabPanel id={activeTab} activeTab={activeTab}>
          <Table
            columns={columns}
            data={paginatedServices}
            rowKey={(item) => item.id}
            className="border-0 rounded-none"
          />
        </TabPanel>
        <div className="flex items-center justify-center px-5 py-4 border-t border-surface-200">
          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      </Card>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingService ? 'ویرایش خدمت' : 'خدمت جدید'}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={closeModal}>انصراف</Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={!form.title || !form.category || !form.duration || !form.price}
            >
              ذخیره
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            label="نام خدمت"
            value={form.title}
            onChange={(e) => handleFormChange('title', e.target.value)}
            placeholder="مثال: فیشال صورت"
          />
          <Select
            label="دسته‌بندی"
            options={CATEGORY_OPTIONS}
            placeholder="انتخاب دسته‌بندی"
            value={form.category}
            onChange={(e) => handleFormChange('category', e.target.value)}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="مدت زمان (دقیقه)"
              type="number"
              value={form.duration}
              onChange={(e) => handleFormChange('duration', e.target.value)}
              placeholder="مثال: ۳۰"
            />
            <Input
              label="قیمت (تومان)"
              type="number"
              value={form.price}
              onChange={(e) => handleFormChange('price', e.target.value)}
              placeholder="مثال: ۳۵۰۰۰۰"
            />
          </div>
          <Textarea
            label="توضیحات"
            value={form.description}
            onChange={(e) => handleFormChange('description', e.target.value)}
            placeholder="توضیحات مربوط به خدمت..."
            rows={3}
          />
          <Toggle
            label="وضعیت"
            checked={form.isActive}
            onChange={(e) => handleFormChange('isActive', e.target.checked)}
          />
        </div>
      </Modal>
    </div>
  )
}

export default Services
