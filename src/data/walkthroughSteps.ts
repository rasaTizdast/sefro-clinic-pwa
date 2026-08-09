import type { DriveStep } from "driver.js";

export const walkthroughSteps: Record<string, DriveStep[]> = {
  "/auth": [
    {
      element: "[data-tour='auth-brand']",
      popover: {
        title: "کلینیک زیبایی باران",
        description: "به پنل مدیریت کلینیک خوش آمدید. ابتدا وارد حساب خود شوید.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='auth-username']",
      popover: {
        title: "نام کاربری",
        description: "نام کاربری یا شماره موبایل خود را وارد کنید.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='auth-password']",
      popover: {
        title: "رمز عبور",
        description:
          "رمز عبور خود را وارد کنید. با کلیک روی آیکون چشم، می‌توانید رمز را مشاهده کنید.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='auth-remember']",
      popover: {
        title: "مرا به خاطر بسپار",
        description: "با فعال کردن این گزینه، بدون نیاز به ورود مجدد به سیستم وارد می‌شوید.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='auth-submit']",
      popover: {
        title: "ورود به حساب",
        description: "پس از وارد کردن اطلاعات، روی این دکمه کلیک کنید تا وارد پنل مدیریت شوید.",
        side: "top",
        align: "start",
      },
    },
  ],

  "/": [
    {
      element: "[data-tour='dash-title']",
      popover: {
        title: "داشبورد",
        description: "خلاصه‌ای از فعالیت‌های روزانه کلینیک را اینجا مشاهده می‌کنید.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='dash-stats']",
      popover: {
        title: "آمار سریع",
        description: "تعداد مراجعین امروز، کل مشتریان، درآمد و سایر آمار مهم در یک نگاه.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='dash-quick-actions']",
      popover: {
        title: "اقدامات سریع",
        description: "از اینجا می‌توانید سریعاً نوبت جدید ثبت کنید یا بیمار جدید اضافه کنید.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='dash-appointments']",
      popover: {
        title: "نوبت‌های امروز",
        description: "لیست نوبت‌های امروز به همراه وضعیت آنها در این جدول نمایش داده می‌شود.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='dash-empty-appointment']",
      popover: {
        title: "ثبت اولین نوبت",
        description: "هنوز نوبتی ثبت نشده است. با کلیک روی این دکمه اولین نوبت خود را ثبت کنید.",
        side: "top",
        align: "center",
      },
    },
    {
      element: "[data-tour='dash-empty-action']",
      popover: {
        title: "شروع کنید",
        description: "داشبورد شما خالی است. با ثبت اولین مراجعه، اطلاعات اینجا نمایش داده می‌شود.",
        side: "top",
        align: "center",
      },
    },
  ],

  "/patients": [
    {
      element: "[data-tour='pat-header']",
      popover: {
        title: "لیست بیماران",
        description: "مدیریت و مشاهده اطلاعات تمام بیماران کلینیک.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='pat-search']",
      popover: {
        title: "جستجوی بیمار",
        description: "با وارد کردن نام، تلفن یا کد ملی، بیمار مورد نظر را سریع پیدا کنید.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='pat-tabs']",
      popover: {
        title: "فیلتر وضعیت",
        description: "بیماران را بر اساس وضعیت (فعال، غیرفعال، جدید) فیلتر کنید.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='pat-table']",
      popover: {
        title: "جدول بیماران",
        description:
          "اطلاعات کامل بیماران شامل نام، تلفن، رضایت، تعداد مراجعات و وضعیت نمایش داده می‌شود.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='pat-actions']",
      popover: {
        title: "مدیریت بیماران",
        description:
          "با استفاده از این دکمه‌ها می‌توانید بیمار جدید اضافه کنید یا خروجی Excel بگیرید.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='pat-empty-add']",
      popover: {
        title: "ثبت اولین بیمار",
        description:
          "هنوز بیماری ثبت نشده است. با کلیک روی این دکمه، اولین بیمار خود را اضافه کنید.",
        side: "top",
        align: "center",
      },
    },
  ],

  "/calendar": [
    {
      element: "[data-tour='cal-header']",
      popover: {
        title: "تقویم نوبت‌ها",
        description: "مدیریت و مشاهده تمام نوبت‌های کلینیک در نمای تقویم.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='cal-nav']",
      popover: {
        title: "ناوبری ماه",
        description:
          "با استفاده از دکمه‌های قبلی و بعدی بین ماه‌ها جابجا شوید. دکمه امروز به ماه جاری برمی‌گرداند.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='cal-grid']",
      popover: {
        title: "تقویم ماهانه",
        description:
          "روزهای دارای نوبت با نشانگر تعداد نوبت مشخص شده‌اند. روی هر روز کلیک کنید تا جزئیات آن روز را ببینید.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='cal-timeline']",
      popover: {
        title: "نوار زمانی",
        description:
          "نوبت‌های روز انتخاب شده در این نوار زمانی نمایش داده می‌شوند. هر نوبت با رنگ وضعیت آن مشخص شده است.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='cal-detail']",
      popover: {
        title: "جزئیات نوبت",
        description:
          "با کلیک روی هر نوبت، جزئیات کامل آن شامل وضعیت، خدمات و زمان نمایش داده می‌شود.",
        side: "left",
        align: "start",
      },
    },
    {
      element: "[data-tour='cal-wizard']",
      popover: {
        title: "ثبت نوبت جدید",
        description:
          "با کلیک روی این دکمه، می‌توانید نوبت جدید در سه مرحله ساده ثبت کنید: انتخاب بیمار، انتخاب خدمت و انتخاب زمان.",
        side: "bottom",
        align: "start",
      },
    },
  ],

  "/services": [
    {
      element: "[data-tour='srv-header']",
      popover: {
        title: "خدمات کلینیک",
        description: "مدیریت خدمات و درمان‌های ارائه شده در کلینیک.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='srv-table']",
      popover: {
        title: "لیست خدمات",
        description: "نام، مدت زمان، قیمت و وضعیت هر خدمت در این جدول نمایش داده می‌شود.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='srv-add']",
      popover: {
        title: "خدمت جدید",
        description: "با کلیک روی این دکمه می‌توانید خدمت جدیدی به لیست اضافه کنید.",
        side: "bottom",
        align: "start",
      },
    },
  ],

  "/warehouse": [
    {
      element: "[data-tour='wh-header']",
      popover: {
        title: "مدیریت انبار",
        description: "مدیریت موجودی و محصولات مصرفی کلینیک.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='wh-alert']",
      popover: {
        title: "هشدار موجودی",
        description: "محصولاتی که موجودی آنها کم یا تمام شده است در این هشدار نمایش داده می‌شوند.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='wh-search']",
      popover: {
        title: "جستجوی محصول",
        description: "نام محصول مورد نظر خود را جستجو کنید.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='wh-table']",
      popover: {
        title: "لیست محصولات",
        description:
          "نام، موجودی، واحد، قیمت و وضعیت هر محصول در این جدول قابل مشاهده و مدیریت است.",
        side: "top",
        align: "start",
      },
    },
  ],

  "/accounting": [
    {
      element: "[data-tour='acc-header']",
      popover: {
        title: "حسابداری",
        description: "مدیریت امور مالی و مشاهده گزارش‌های درآمد کلینیک.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='acc-periods']",
      popover: {
        title: "فیلتر دوره زمانی",
        description:
          "آمار و گزارش‌ها را بر اساس بازه زمانی دلخواه (روزانه، هفتگی، ماهانه و...) فیلتر کنید.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='acc-stats']",
      popover: {
        title: "آمار مالی",
        description:
          "درآمد امروز، درآمد دوره، تعداد تراکنش‌ها و میانگین هر تراکنش در این کارت‌ها نمایش داده می‌شود.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='acc-chart']",
      popover: {
        title: "نمودار درآمد",
        description:
          "روند تغییرات درآمد در بازه زمانی انتخاب شده به صورت نمودار میل‌ای نمایش داده می‌شود.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='acc-table']",
      popover: {
        title: "تراکنش‌ها",
        description: "لیست کامل تراکنش‌های مالی با جزئیات تاریخ، مبلغ، روش پرداخت و وضعیت.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='acc-add']",
      popover: {
        title: "ثبت تراکنش جدید",
        description: "برای ثبت تراکنش مالی جدید از این دکمه استفاده کنید.",
        side: "bottom",
        align: "start",
      },
    },
  ],

  "/analytics": [
    {
      element: "[data-tour='anl-header']",
      popover: {
        title: "گزارش‌ها و آمار",
        description: "تحلیل جامع داده‌های کلینیک شامل درآمد، مراجعین و وضعیت نوبت‌ها.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='anl-filter']",
      popover: {
        title: "فیلتر زمانی",
        description: "بازه زمانی گزارش‌ها را انتخاب کنید: امروز، این هفته، این ماه و...",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='anl-kpis']",
      popover: {
        title: "شاخص‌های کلیدی",
        description: "مجموع مراجعین، درآمد کل، نرخ مراجعه مجدد و میانگین رضایت در یک نگاه.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='anl-revenue']",
      popover: {
        title: "روند درآمد ماهانه",
        description: "نمودار خطی تغییرات درآمد در ماه‌های مختلف سال.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='anl-status']",
      popover: {
        title: "وضعیت نوبت‌ها",
        description:
          "توزیع وضعیت نوبت‌ها (انجام شده، تأیید شده، در انتظار، لغو شده) به صورت نمودار دایره‌ای.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='anl-charts']",
      popover: {
        title: "نمودارهای تکمیلی",
        description:
          "مراجعه بیماران به صورت ماهانه و محبوبیت دسته‌بندی خدمات در این بخش نمایش داده می‌شود.",
        side: "top",
        align: "start",
      },
    },
  ],

  "/settings": [
    {
      element: "[data-tour='set-header']",
      popover: {
        title: "تنظیمات",
        description: "مدیریت تنظیمات حساب کاربری و سیستم کلینیک.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='set-password']",
      popover: {
        title: "تغییر رمز عبور",
        description: "رمز عبور حساب کاربری خود را در این بخش تغییر دهید.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='set-hours']",
      popover: {
        title: "ساعات کاری",
        description: "ساعات شروع و پایان کار کلینیک را در روزهای هفته تنظیم کنید.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='set-users']",
      popover: {
        title: "مدیریت کاربران",
        description: "مدیریت کاربران سیستم، افزودن یا ویرایش دسترسی‌ها (فقط مدیر سیستم).",
        side: "top",
        align: "start",
      },
    },
  ],

  "/design-system": [],
  "/logs": [],
};

export const sidebarWalkthroughStep: DriveStep = {
  element: "[data-tour='sidebar-nav']",
  popover: {
    title: "ناوبری سایت",
    description:
      "از این منو می‌توانید به تمام بخش‌های کلینیک دسترسی داشته باشید. برای مشاهده راهنمای هر صفحه، روی گزینه راهنما کلیک کنید.",
    side: "right",
    align: "start",
  },
};
