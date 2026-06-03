import { useState } from 'react'
import { BiHome, BiUser, BiSearch, BiPlus, BiTrash, BiEdit, BiChevronDown } from 'react-icons/bi'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Textarea } from '../components/ui/Textarea'
import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { Table } from '../components/ui/Table'
import type { Column } from '../components/ui/Table'
import { Tabs, TabPanel } from '../components/ui/Tabs'
import type { Tab } from '../components/ui/Tabs'
import { Alert } from '../components/ui/Alert'
import { Avatar } from '../components/ui/Avatar'
import { Pagination } from '../components/ui/Pagination'
import { Spinner } from '../components/ui/Spinner'
import { Skeleton, SkeletonText, SkeletonTable } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { Toggle } from '../components/ui/Toggle'
import { Dropdown } from '../components/ui/Dropdown'
import type { DropdownItem } from '../components/ui/Dropdown'
import { Breadcrumb } from '../components/ui/Breadcrumb'
import type { BreadcrumbItem } from '../components/ui/Breadcrumb'
import { Progress } from '../components/ui/Progress'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-surface-200 bg-white overflow-hidden">
      <div className="border-b border-surface-100 bg-surface-50 px-6 py-3">
        <h2 className="text-base font-semibold text-surface-800">{title}</h2>
      </div>
      <div className="p-6 space-y-4">{children}</div>
    </section>
  )
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">{title}</h3>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  )
}

export default function DesignSystem() {
  const [modalOpen, setModalOpen] = useState(false)
  const [toggleChecked, setToggleChecked] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [alertVisible, setAlertVisible] = useState(true)
  const [tableSortKey, setTableSortKey] = useState<string | undefined>('name')
  const [tableSortDir, setTableSortDir] = useState<'asc' | 'desc'>('asc')
  const [tabValue, setTabValue] = useState('tab1')
  const [inputValue, setInputValue] = useState('')

  const tabs: Tab[] = [
    { id: 'tab1', label: 'پیش‌نمایش' },
    { id: 'tab2', label: 'کد', badge: 3 },
    { id: 'tab3', label: 'تنظیمات', icon: <BiChevronDown /> },
  ]

  const tableColumns: Column<{ id: number; name: string; role: string; status: string }>[] = [
    { key: 'name', header: 'نام', sortable: true },
    { key: 'role', header: 'نقش' },
    {
      key: 'status',
      header: 'وضعیت',
      render: (item) => (
        <Badge variant={item.status === 'فعال' ? 'success' : 'warning'} size="sm">
          {item.status}
        </Badge>
      ),
    },
    { key: 'actions', header: 'عملیات', render: () => <Button size="sm" variant="ghost">ویرایش</Button> },
  ]

  const tableData = [
    { id: 1, name: 'علی محمدی', role: 'مدیر', status: 'فعال' },
    { id: 2, name: 'سارا احمدی', role: 'کارشناس', status: 'فعال' },
    { id: 3, name: 'رضا کریمی', role: 'کاربر', status: 'غیرفعال' },
  ]

  const handleSort = (key: string) => {
    if (tableSortKey === key) {
      setTableSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setTableSortKey(key)
      setTableSortDir('asc')
    }
  }

  const dropdownItems: DropdownItem[] = [
    { label: 'ویرایش', icon: <BiEdit />, onClick: () => {} },
    { label: 'حذف', icon: <BiTrash />, danger: true, onClick: () => {} },
    { label: '', divider: true },
    { label: 'مشاهده پروفایل', icon: <BiUser />, onClick: () => {} },
  ]

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'خانه', href: '/' },
    { label: 'سیستم طراحی' },
  ]

  const breadcrumbItemsLong: BreadcrumbItem[] = [
    { label: 'خانه', href: '/', icon: <BiHome /> },
    { label: 'کامپوننت‌ها', href: '#' },
    { label: 'فرم‌ها' },
  ]

  return (
    <div className="flex flex-col gap-6 pb-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-surface-900">سیستم طراحی</h1>
        <p className="text-sm text-surface-500">نمایش و تست تمامی کامپوننت‌های سیستم طراحی</p>
      </div>

      <Section title="Breadcrumb">
        <SubSection title="ساده">
          <Breadcrumb items={breadcrumbItems} />
        </SubSection>
        <SubSection title="با آیکون">
          <Breadcrumb items={breadcrumbItemsLong} />
        </SubSection>
      </Section>

      <Section title="Alert">
        <SubSection title="Variants">
          <Alert variant="info">این یک پیام اطلاع‌رسانی است</Alert>
          <Alert variant="success">عملیات با موفقیت انجام شد</Alert>
          <Alert variant="warning">به زودی محدودیت اعمال می‌شود</Alert>
          <Alert variant="error">خطایی رخ داده است</Alert>
        </SubSection>
        <SubSection title="با عنوان و دکمه بستن">
          {alertVisible && (
            <Alert variant="warning" title="توجه" dismissible onDismiss={() => setAlertVisible(false)}>
              این هشدار قابل بستن است
            </Alert>
          )}
        </SubSection>
      </Section>

      <Section title="Buttons">
        <SubSection title="Variants">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
        </SubSection>
        <SubSection title="Sizes">
          <Button size="sm">کوچک</Button>
          <Button size="md">متوسط</Button>
          <Button size="lg">بزرگ</Button>
        </SubSection>
        <SubSection title="States">
          <Button loading>در حال بارگذاری</Button>
          <Button disabled>غیرفعال</Button>
          <Button icon={<BiPlus />}>با آیکون</Button>
          <Button iconRight={<BiSearch />}>آیکون راست</Button>
        </SubSection>
      </Section>

      <Section title="Inputs">
        <SubSection title="Default & States">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
            <Input label="نام کاربری" placeholder="نام کاربری" value={inputValue} onChange={(e) => setInputValue(e.target.value)} />
            <Input label="خطا" error="این فیلد الزامی است" placeholder="مقدار" />
            <Input label="غیرفعال" disabled placeholder="غیرفعال" />
          </div>
        </SubSection>
        <SubSection title="With Icons">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
            <Input leftIcon={<BiSearch />} placeholder="جستجو..." />
            <Input label="کد تخفیف" leftIcon={<BiPlus />} rightIcon={<Badge size="sm">اعمال</Badge>} />
          </div>
        </SubSection>
        <SubSection title="Select">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
            <Select label="انتخاب نقش" options={[
              { value: 'admin', label: 'مدیر' },
              { value: 'user', label: 'کاربر' },
              { value: 'viewer', label: 'بیننده' },
            ]} placeholder="یک گزینه انتخاب کنید" />
            <Select label="با خطا" options={[
              { value: '1', label: 'گزینه ۱' },
              { value: '2', label: 'گزینه ۲' },
            ]} error="اجباری است" />
          </div>
        </SubSection>
        <SubSection title="Textarea">
          <Textarea label="توضیحات" placeholder="متن خود را وارد کنید..." className="w-full" />
          <Textarea label="خطا" error="حداقل ۱۰ کاراکتر" />
        </SubSection>
      </Section>

      <Section title="Card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
          <Card title="پیش‌فرض">
            <p className="text-sm text-surface-600">کادر ساده با پس‌زمینه سفید</p>
          </Card>
          <Card variant="outlined" title="حاشیه‌دار">
            <p className="text-sm text-surface-600">کادر با حاشیه</p>
          </Card>
          <Card variant="elevated" title="سایه‌دار">
            <p className="text-sm text-surface-600">کادر با سایه</p>
          </Card>
        </div>
        <SubSection title="Card with Header/Footer">
          <Card
            header={<CardHeader><CardTitle>عنوان کارت</CardTitle><Badge>جدید</Badge></CardHeader>}
            footer={<div className="flex justify-end gap-2"><Button size="sm" variant="ghost">لغو</Button><Button size="sm">تأیید</Button></div>}
          >
            <CardDescription>توضیحات کارت در این بخش نمایش داده می‌شود</CardDescription>
          </Card>
        </SubSection>
      </Section>

      <Section title="Badge">
        <SubSection title="Variants">
          <Badge>پیش‌فرض</Badge>
          <Badge variant="success">موفق</Badge>
          <Badge variant="warning">هشدار</Badge>
          <Badge variant="danger">خطا</Badge>
          <Badge variant="info">اطلاعات</Badge>
        </SubSection>
        <SubSection title="Sizes & Dot">
          <Badge size="sm">کوچک</Badge>
          <Badge size="md">متوسط</Badge>
          <Badge dot variant="success">آنلاین</Badge>
          <Badge dot variant="danger">آفلاین</Badge>
        </SubSection>
      </Section>

      <Section title="Avatar">
        <SubSection title="Sizes">
          <Avatar size="sm" name="علی رضایی" />
          <Avatar size="md" name="سارا احمدی" />
          <Avatar size="lg" name="رضا کریمی" />
          <Avatar size="xl" name="مریم حسینی" />
        </SubSection>
        <SubSection title="With Image & Status">
          <Avatar src="https://i.pravatar.cc/80?img=1" alt="user" size="lg" status="online" />
          <Avatar src="https://i.pravatar.cc/80?img=2" alt="user" size="lg" status="busy" />
          <Avatar size="lg" name="محمد رضایی" status="away" />
          <Avatar size="lg" name="زهرا موسوی" status="offline" />
        </SubSection>
        <SubSection title="Fallback">
          <Avatar size="md" />
        </SubSection>
      </Section>

      <Section title="Tabs">
        <Tabs tabs={tabs} activeTab={tabValue} onChange={setTabValue} />
        <TabPanel id="tab1" activeTab={tabValue} className="p-4 text-sm text-surface-600">
          محتوای تب پیش‌نمایش
        </TabPanel>
        <TabPanel id="tab2" activeTab={tabValue} className="p-4 text-sm text-surface-600">
          محتوای تب کد
        </TabPanel>
        <TabPanel id="tab3" activeTab={tabValue} className="p-4 text-sm text-surface-600">
          محتوای تب تنظیمات
        </TabPanel>
      </Section>

      <Section title="Table">
        <Table
          columns={tableColumns}
          data={tableData}
          rowKey={(item) => item.id}
          sortKey={tableSortKey}
          sortDirection={tableSortDir}
          onSort={handleSort}
        />
        <SubSection title="Empty State">
          <Table
            columns={tableColumns}
            data={[]}
            rowKey={(item) => item.id}
            emptyMessage="هیچ کاربری یافت نشد"
          />
        </SubSection>
      </Section>

      <Section title="Modal">
        <Button onClick={() => setModalOpen(true)}>باز کردن مودال</Button>
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="تأیید حذف"
          footer={
            <>
              <Button variant="ghost" onClick={() => setModalOpen(false)}>لغو</Button>
              <Button variant="danger" onClick={() => setModalOpen(false)}>حذف</Button>
            </>
          }
        >
          <p className="text-sm text-surface-600">آیا از حذف این آیتم اطمینان دارید؟ این عملیات قابل بازگشت نیست.</p>
        </Modal>
      </Section>

      <Section title="Pagination">
        <Pagination currentPage={currentPage} totalPages={10} onPageChange={setCurrentPage} />
      </Section>

      <Section title="Toggle">
        <Toggle label="فعال کردن اعلان‌ها" checked={toggleChecked} onChange={(e) => setToggleChecked(e.target.checked)} />
        <Toggle label="غیرفعال" disabled />
      </Section>

      <Section title="Dropdown">
        <Dropdown
          trigger={<Button variant="outline" iconRight={<BiChevronDown />}>بیشتر</Button>}
          items={dropdownItems}
        />
        <Dropdown
          align="end"
          trigger={<Button variant="secondary" iconRight={<BiChevronDown />}>گزینه‌ها</Button>}
          items={dropdownItems}
        />
      </Section>

      <Section title="Progress">
        <SubSection title="Variants">
          <Progress value={75} showLabel />
          <Progress value={100} variant="success" showLabel />
          <Progress value={50} variant="warning" />
          <Progress value={30} variant="danger" />
        </SubSection>
        <SubSection title="Sizes">
          <Progress value={60} size="sm" />
          <Progress value={80} size="md" />
        </SubSection>
      </Section>

      <Section title="Spinner">
        <Spinner size="sm" />
        <Spinner size="md" />
        <Spinner size="lg" />
        <Spinner size="md" className="text-primary-600" />
      </Section>

      <Section title="Skeleton">
        <SubSection title="Skeleton Text">
          <SkeletonText lines={3} className="w-64" />
        </SubSection>
        <SubSection title="Skeleton Table">
          <SkeletonTable rows={4} columns={4} />
        </SubSection>
        <SubSection title="Variants">
          <Skeleton variant="text" width="200px" />
          <Skeleton variant="circular" width="40px" height="40px" />
          <Skeleton variant="rectangular" width="300px" height="100px" />
        </SubSection>
      </Section>

      <Section title="EmptyState">
        <EmptyState
          title="موردی یافت نشد"
          description="هیچ داده‌ای برای نمایش وجود ندارد. با کلیک بر روی دکمه زیر، مورد جدیدی اضافه کنید."
          action={<Button size="sm" icon={<BiPlus />}>افزودن</Button>}
        />
      </Section>

      <Section title="Live Demo — فرم ثبت نام">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-4">
            <Input label="نام و نام خانوادگی" placeholder="مثال: علی رضایی" />
            <Input label="ایمیل" type="email" placeholder="example@email.com" leftIcon={<BiUser />} />
            <Select
              label="نقش"
              options={[
                { value: 'admin', label: 'مدیر سیستم' },
                { value: 'doctor', label: 'پزشک' },
                { value: 'staff', label: 'کارمند' },
              ]}
              placeholder="انتخاب نقش"
            />
            <div className="flex items-center gap-4">
              <Toggle label="دسترسی مدیریت" />
              <Button icon={<BiPlus />}>ثبت کاربر</Button>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Avatar size="lg" name="علی رضایی" status="online" />
              <div>
                <p className="text-sm font-medium text-surface-900">علی رضایی</p>
                <p className="text-xs text-surface-500">مدیر سیستم</p>
              </div>
            </div>
            <Alert variant="success">کاربر با موفقیت ایجاد شد</Alert>
            <Progress value={65} showLabel variant="info" />
          </div>
        </div>
      </Section>
    </div>
  )
}
