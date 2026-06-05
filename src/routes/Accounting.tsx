import jalaali from "jalaali-js";
import { useEffect, useMemo, useState } from "react";
import { BiDownload, BiPlus } from "react-icons/bi";
import { CiMoneyBill, CiReceipt } from "react-icons/ci";
import { FaRegEye } from "react-icons/fa";
import { IoCardOutline, IoCashOutline } from "react-icons/io5";
import { MdAttachMoney } from "react-icons/md";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { AddTransactionModal } from "../components/accounting/AddTransactionModal";
import { TransactionDetailModal } from "../components/accounting/TransactionDetailModal";
import { SearchButton } from "../components/SearchButton";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardTitle } from "../components/ui/Card";
import { JalaliDatePicker } from "../components/ui/JalaliDatePicker";
import { Pagination } from "../components/ui/Pagination";
import { Select } from "../components/ui/Select";
import { type Column, Table } from "../components/ui/Table";
import { useQuickActions } from "../hooks/useQuickActions";
import { exportTransactionsToExcel } from "../lib/excel";
import type {
  AccountingStat,
  DailyRevenue,
  PeriodFilter,
  Transaction,
  TransactionFormData,
} from "../types/accounting";
import type { Service } from "../types/service";

const transactionStatusMap: Record<
  Transaction["status"],
  { label: string; variant: "success" | "danger" }
> = {
  paid: { label: "پرداخت شده", variant: "success" },
  cancelled: { label: "لغو شده", variant: "danger" },
};

const paymentMethodLabels: Record<string, string> = {
  cash: "نقدی",
  card: "کارت خوان",
  online: "آنلاین",
  cheque: "چک",
};

const services: Service[] = [
  {
    id: 1,
    title: "فیشال صورت",
    category: "زیبایی",
    duration: 45,
    price: 350000,
    description: "پاکسازی عمقی و مرطوب‌سازی پوست صورت",
    isActive: true,
  },
  {
    id: 2,
    title: "میکرونیدلینگ",
    category: "زیبایی",
    duration: 60,
    price: 500000,
    description: "تحریک کلاژن‌سازی با سوزن‌های ریز",
    isActive: true,
  },
  {
    id: 3,
    title: "لیزر موهای زائد",
    category: "زیبایی",
    duration: 30,
    price: 450000,
    description: "حذف دائمی موهای زائد با لیزر",
    isActive: true,
  },
  {
    id: 4,
    title: "درمان آکنه",
    category: "زیبایی",
    duration: 30,
    price: 250000,
    description: "درجۀ یک آکنه و جوش صورت",
    isActive: false,
  },
  {
    id: 5,
    title: "مشاوره تغذیه",
    category: "مشاوره",
    duration: 30,
    price: 180000,
    description: "مشاوره تغذیه و رژیم درمانی",
    isActive: true,
  },
  {
    id: 6,
    title: "مشاوره روانشناسی",
    category: "مشاوره",
    duration: 45,
    price: 250000,
    description: "مشاوره فردی و مدیریت استرس",
    isActive: true,
  },
  {
    id: 7,
    title: "فیزیوتراپی",
    category: "درمانی",
    duration: 45,
    price: 300000,
    description: "فیزیوتراپی تخصصی برای انواع دردهای عضلانی",
    isActive: true,
  },
  {
    id: 8,
    title: "آزمایش خون",
    category: "آزمایشگاهی",
    duration: 15,
    price: 120000,
    description: "انواع آزمایش‌های خون و بیوشیمی",
    isActive: true,
  },
];

const periodLabels: Record<PeriodFilter, string> = {
  today: "روزانه",
  week: "هفتگی",
  month: "ماهانه",
  threeMonths: "۳ ماهه",
  year: "سالانه",
};

const periodKeys: PeriodFilter[] = ["today", "week", "month", "threeMonths", "year"];
const chartTitleMap: Record<PeriodFilter, string> = {
  today: "روند درآمد روزانه",
  week: "روند درآمد هفتگی",
  month: "روند درآمد ماهانه",
  threeMonths: "روند درآمد ۳ ماهه",
  year: "روند درآمد سالانه",
};

const initialTransactions: Transaction[] = [
  // امروز — ۱۴۰۵/۰۳/۱۵
  {
    id: 1,
    date: "۱۴۰۵/۰۳/۱۵",
    description: "فیشال صورت",
    patient: "نرگس محمدی",
    amount: 350000,
    paymentMethod: "card",
    status: "paid",
    serviceId: 1,
  },
  {
    id: 2,
    date: "۱۴۰۵/۰۳/۱۵",
    description: "مشاوره تغذیه",
    patient: "امیرحسین کریمی",
    amount: 180000,
    paymentMethod: "cash",
    status: "paid",
    serviceId: 5,
  },
  {
    id: 3,
    date: "۱۴۰۵/۰۳/۱۵",
    description: "آزمایش خون کامل",
    patient: "سارا احمدی",
    amount: 120000,
    paymentMethod: "online",
    status: "paid",
    serviceId: 8,
  },
  {
    id: 4,
    date: "۱۴۰۵/۰۳/۱۵",
    description: "فیزیوتراپی",
    patient: "رضا کریمی",
    amount: 300000,
    paymentMethod: "card",
    status: "paid",
    serviceId: 7,
  },
  {
    id: 5,
    date: "۱۴۰۵/۰۳/۱۵",
    description: "لیزر موهای زائد",
    patient: "سمیرا حسینی",
    amount: 450000,
    paymentMethod: "online",
    status: "cancelled",
    serviceId: 3,
  },

  // دیروز — ۱۴۰۵/۰۳/۱۴
  {
    id: 6,
    date: "۱۴۰۵/۰۳/۱۴",
    description: "میکرونیدلینگ صورت",
    patient: "مریم نوروزی",
    amount: 500000,
    paymentMethod: "card",
    status: "paid",
    serviceId: 2,
  },
  {
    id: 7,
    date: "۱۴۰۵/۰۳/۱۴",
    description: "ویزیت عمومی",
    patient: "علی رضایی",
    amount: 150000,
    paymentMethod: "cash",
    status: "paid",
    serviceId: 5,
  },
  {
    id: 8,
    date: "۱۴۰۵/۰۳/۱۴",
    description: "مشاوره روانشناسی",
    patient: "زهرا احمدی",
    amount: 250000,
    paymentMethod: "online",
    status: "paid",
    serviceId: 6,
  },
  {
    id: 9,
    date: "۱۴۰۵/۰۳/۱۴",
    description: "آزمایش تیروئید",
    patient: "محمد رضایی",
    amount: 195000,
    paymentMethod: "card",
    status: "paid",
    serviceId: 8,
  },

  // ۲ روز پیش — ۱۴۰۵/۰۳/۱۳
  {
    id: 10,
    date: "۱۴۰۵/۰۳/۱۳",
    description: "فیزیوتراپی",
    patient: "حسین محمدی",
    amount: 300000,
    paymentMethod: "online",
    status: "paid",
    serviceId: 7,
  },
  {
    id: 11,
    date: "۱۴۰۵/۰۳/۱۳",
    description: "فیشال صورت",
    patient: "فاطمه حسینی",
    amount: 350000,
    paymentMethod: "cash",
    status: "paid",
    serviceId: 1,
  },
  {
    id: 12,
    date: "۱۴۰۵/۰۳/۱۳",
    description: "ویزیت پوست",
    patient: "امیر عباسی",
    amount: 200000,
    paymentMethod: "card",
    status: "cancelled",
    serviceId: 5,
  },

  // ۳ روز پیش — ۱۴۰۵/۰۳/۱۲
  {
    id: 13,
    date: "۱۴۰۵/۰۳/۱۲",
    description: "مشاوره تغذیه",
    patient: "نگین صادقی",
    amount: 180000,
    paymentMethod: "cash",
    status: "paid",
    serviceId: 5,
  },
  {
    id: 14,
    date: "۱۴۰۵/۰۳/۱۲",
    description: "لیزر موهای زائد",
    patient: "محسن عباسی",
    amount: 450000,
    paymentMethod: "card",
    status: "paid",
    serviceId: 3,
  },
  {
    id: 15,
    date: "۱۴۰۵/۰۳/۱۲",
    description: "آزمایش خون",
    patient: "امیرحسین کریمی",
    amount: 120000,
    paymentMethod: "online",
    status: "paid",
    serviceId: 8,
  },
  {
    id: 16,
    date: "۱۴۰۵/۰۳/۱۲",
    description: "میکرونیدلینگ صورت",
    patient: "نرگس محمدی",
    amount: 500000,
    paymentMethod: "card",
    status: "paid",
    serviceId: 2,
  },

  // ۴ روز پیش — ۱۴۰۵/۰۳/۱۱
  {
    id: 17,
    date: "۱۴۰۵/۰۳/۱۱",
    description: "فیزیوتراپی",
    patient: "رضا کریمی",
    amount: 300000,
    paymentMethod: "cheque",
    status: "paid",
    serviceId: 7,
  },
  {
    id: 18,
    date: "۱۴۰۵/۰۳/۱۱",
    description: "ویزیت عمومی",
    patient: "سارا احمدی",
    amount: 150000,
    paymentMethod: "cash",
    status: "paid",
    serviceId: 5,
  },
  {
    id: 19,
    date: "۱۴۰۵/۰۳/۱۱",
    description: "فیشال صورت",
    patient: "مریم نوروزی",
    amount: 350000,
    paymentMethod: "online",
    status: "paid",
    serviceId: 1,
  },

  // ۵ روز پیش — ۱۴۰۵/۰۳/۱۰
  {
    id: 20,
    date: "۱۴۰۵/۰۳/۱۰",
    description: "مشاوره روانشناسی",
    patient: "علی رضایی",
    amount: 250000,
    paymentMethod: "card",
    status: "paid",
    serviceId: 6,
  },
  {
    id: 21,
    date: "۱۴۰۵/۰۳/۱۰",
    description: "ویزیت تخصصی قلب",
    patient: "حسین محمدی",
    amount: 250000,
    paymentMethod: "online",
    status: "cancelled",
    serviceId: 5,
  },
  {
    id: 22,
    date: "۱۴۰۵/۰۳/۱۰",
    description: "آزمایش تیروئید",
    patient: "فاطمه حسینی",
    amount: 195000,
    paymentMethod: "cash",
    status: "paid",
    serviceId: 8,
  },

  // ۶ روز پیش — ۱۴۰۵/۰۳/۰۹
  {
    id: 23,
    date: "۱۴۰۵/۰۳/۰۹",
    description: "فیشال صورت",
    patient: "زهرا احمدی",
    amount: 350000,
    paymentMethod: "card",
    status: "paid",
    serviceId: 1,
  },
  {
    id: 24,
    date: "۱۴۰۵/۰۳/۰۹",
    description: "میکرونیدلینگ",
    patient: "امیر عباسی",
    amount: 500000,
    paymentMethod: "cheque",
    status: "paid",
    serviceId: 2,
  },
  {
    id: 25,
    date: "۱۴۰۵/۰۳/۰۹",
    description: "فیزیوتراپی",
    patient: "نگین صادقی",
    amount: 300000,
    paymentMethod: "online",
    status: "paid",
    serviceId: 7,
  },
  {
    id: 26,
    date: "۱۴۰۵/۰۳/۰۹",
    description: "مشاوره تغذیه",
    patient: "محمد رضایی",
    amount: 180000,
    paymentMethod: "cash",
    status: "paid",
    serviceId: 5,
  },

  // اوایل هفته پیش — ۱۴۰۵/۰۳/۰۷ - ۱۴۰۵/۰۳/۰۸
  {
    id: 27,
    date: "۱۴۰۵/۰۳/۰۸",
    description: "ویزیت پوست",
    patient: "نرگس محمدی",
    amount: 280000,
    paymentMethod: "card",
    status: "paid",
    serviceId: 1,
  },
  {
    id: 28,
    date: "۱۴۰۵/۰۳/۰۸",
    description: "آزمایش خون کامل",
    patient: "سارا احمدی",
    amount: 120000,
    paymentMethod: "online",
    status: "paid",
    serviceId: 8,
  },
  {
    id: 29,
    date: "۱۴۰۵/۰۳/۰۷",
    description: "لیزر موهای زائد",
    patient: "مریم نوروزی",
    amount: 450000,
    paymentMethod: "cash",
    status: "paid",
    serviceId: 3,
  },
  {
    id: 30,
    date: "۱۴۰۵/۰۳/۰۷",
    description: "فیزیوتراپی",
    patient: "رضا کریمی",
    amount: 300000,
    paymentMethod: "card",
    status: "paid",
    serviceId: 7,
  },

  // اواخر ماه قبل — ۱۴۰۵/۰۲/۲۵ - ۱۴۰۵/۰۲/۳۰
  {
    id: 31,
    date: "۱۴۰۵/۰۲/۳۰",
    description: "آزمایش تیروئید",
    patient: "محمد رضایی",
    amount: 195000,
    paymentMethod: "card",
    status: "paid",
    serviceId: 8,
  },
  {
    id: 32,
    date: "۱۴۰۵/۰۲/۳۰",
    description: "مشاوره تغذیه",
    patient: "زهرا احمدی",
    amount: 180000,
    paymentMethod: "online",
    status: "paid",
    serviceId: 5,
  },
  {
    id: 33,
    date: "۱۴۰۵/۰۲/۲۹",
    description: "ویزیت ارتوپدی",
    patient: "امیرحسین کریمی",
    amount: 350000,
    paymentMethod: "cheque",
    status: "cancelled",
    serviceId: 7,
  },
  {
    id: 34,
    date: "۱۴۰۵/۰۲/۲۹",
    description: "تزریق و پانسمان",
    patient: "محسن عباسی",
    amount: 850000,
    paymentMethod: "cash",
    status: "paid",
    serviceId: 1,
  },
  {
    id: 35,
    date: "۱۴۰۵/۰۲/۲۷",
    description: "فیشال صورت",
    patient: "فاطمه حسینی",
    amount: 350000,
    paymentMethod: "card",
    status: "paid",
    serviceId: 1,
  },
  {
    id: 36,
    date: "۱۴۰۵/۰۲/۲۵",
    description: "مشاوره روانشناسی",
    patient: "علی رضایی",
    amount: 250000,
    paymentMethod: "online",
    status: "paid",
    serviceId: 6,
  },

  // اواسط ماه قبل — ۱۴۰۵/۰۲/۱۵ - ۱۴۰۵/۰۲/۲۰
  {
    id: 37,
    date: "۱۴۰۵/۰۲/۲۰",
    description: "میکرونیدلینگ صورت",
    patient: "سمیرا حسینی",
    amount: 500000,
    paymentMethod: "card",
    status: "paid",
    serviceId: 2,
  },
  {
    id: 38,
    date: "۱۴۰۵/۰۲/۱۸",
    description: "ویزیت عمومی",
    patient: "حسین محمدی",
    amount: 150000,
    paymentMethod: "cash",
    status: "paid",
    serviceId: 5,
  },
  {
    id: 39,
    date: "۱۴۰۵/۰۲/۱۷",
    description: "فیزیوتراپی",
    patient: "رضا کریمی",
    amount: 300000,
    paymentMethod: "online",
    status: "paid",
    serviceId: 7,
  },
  {
    id: 40,
    date: "۱۴۰۵/۰۲/۱۵",
    description: "آزمایش خون کامل",
    patient: "نرگس محمدی",
    amount: 120000,
    paymentMethod: "card",
    status: "paid",
    serviceId: 8,
  },

  // ابتدای ماه قبل — ۱۴۰۵/۰۲/۰۱ - ۱۴۰۵/۰۲/۱۰
  {
    id: 41,
    date: "۱۴۰۵/۰۲/۱۰",
    description: "لیزر موهای زائد",
    patient: "امیر عباسی",
    amount: 450000,
    paymentMethod: "cheque",
    status: "paid",
    serviceId: 3,
  },
  {
    id: 42,
    date: "۱۴۰۵/۰۲/۰۸",
    description: "مشاوره تغذیه",
    patient: "نگین صادقی",
    amount: 180000,
    paymentMethod: "cash",
    status: "paid",
    serviceId: 5,
  },
  {
    id: 43,
    date: "۱۴۰۵/۰۲/۰۵",
    description: "فیشال صورت",
    patient: "زهرا احمدی",
    amount: 350000,
    paymentMethod: "card",
    status: "paid",
    serviceId: 1,
  },
  {
    id: 44,
    date: "۱۴۰۵/۰۲/۰۱",
    description: "ویزیت تخصصی قلب",
    patient: "محمد رضایی",
    amount: 250000,
    paymentMethod: "online",
    status: "cancelled",
    serviceId: 5,
  },

  // اواخر ۳ ماه قبل — ۱۴۰۴/۱۲/۲۰ - ۱۴۰۴/۱۲/۳۰
  {
    id: 45,
    date: "۱۴۰۴/۱۲/۲۸",
    description: "میکرونیدلینگ صورت",
    patient: "مریم نوروزی",
    amount: 500000,
    paymentMethod: "card",
    status: "paid",
    serviceId: 2,
  },
  {
    id: 46,
    date: "۱۴۰۴/۱۲/۲۵",
    description: "فیزیوتراپی",
    patient: "سارا احمدی",
    amount: 300000,
    paymentMethod: "online",
    status: "paid",
    serviceId: 7,
  },
  {
    id: 47,
    date: "۱۴۰۴/۱۲/۲۲",
    description: "آزمایش تیروئید",
    patient: "علی رضایی",
    amount: 195000,
    paymentMethod: "cash",
    status: "paid",
    serviceId: 8,
  },
  {
    id: 48,
    date: "۱۴۰۴/۱۲/۲۰",
    description: "فیشال صورت",
    patient: "فاطمه حسینی",
    amount: 350000,
    paymentMethod: "card",
    status: "paid",
    serviceId: 1,
  },

  // اواسط ۳ ماه قبل — ۱۴۰۴/۱۱/۱۵ - ۱۴۰۴/۱۱/۲۵
  {
    id: 49,
    date: "۱۴۰۴/۱۱/۲۵",
    description: "مشاوره روانشناسی",
    patient: "امیرحسین کریمی",
    amount: 250000,
    paymentMethod: "online",
    status: "paid",
    serviceId: 6,
  },
  {
    id: 50,
    date: "۱۴۰۴/۱۱/۲۰",
    description: "لیزر موهای زائد",
    patient: "رضا کریمی",
    amount: 450000,
    paymentMethod: "card",
    status: "paid",
    serviceId: 3,
  },
  {
    id: 51,
    date: "۱۴۰۴/۱۱/۱۸",
    description: "ویزیت عمومی",
    patient: "نگین صادقی",
    amount: 150000,
    paymentMethod: "cash",
    status: "paid",
    serviceId: 5,
  },
  {
    id: 52,
    date: "۱۴۰۴/۱۱/۱۵",
    description: "فیزیوتراپی",
    patient: "حسین محمدی",
    amount: 300000,
    paymentMethod: "cheque",
    status: "paid",
    serviceId: 7,
  },

  // ابتدای ۳ ماه قبل — ۱۴۰۴/۱۰/۰۵ - ۱۴۰۴/۱۰/۱۵
  {
    id: 53,
    date: "۱۴۰۴/۱۰/۱۵",
    description: "میکرونیدلینگ صورت",
    patient: "سمیرا حسینی",
    amount: 500000,
    paymentMethod: "card",
    status: "paid",
    serviceId: 2,
  },
  {
    id: 54,
    date: "۱۴۰۴/۱۰/۱۰",
    description: "آزمایش خون کامل",
    patient: "زهرا احمدی",
    amount: 120000,
    paymentMethod: "online",
    status: "paid",
    serviceId: 8,
  },
  {
    id: 55,
    date: "۱۴۰۴/۱۰/۰۵",
    description: "فیشال صورت",
    patient: "نرگس محمدی",
    amount: 350000,
    paymentMethod: "cash",
    status: "paid",
    serviceId: 1,
  },

  // اواخر یک سال قبل — ۱۴۰۴/۰۷/۱۰ - ۱۴۰۴/۰۸/۰۵
  {
    id: 56,
    date: "۱۴۰۴/۰۸/۰۵",
    description: "مشاوره تغذیه",
    patient: "امیر عباسی",
    amount: 180000,
    paymentMethod: "card",
    status: "paid",
    serviceId: 5,
  },
  {
    id: 57,
    date: "۱۴۰۴/۰۷/۲۵",
    description: "فیزیوتراپی",
    patient: "محسن عباسی",
    amount: 300000,
    paymentMethod: "online",
    status: "paid",
    serviceId: 7,
  },
  {
    id: 58,
    date: "۱۴۰۴/۰۷/۱۵",
    description: "لیزر موهای زائد",
    patient: "فاطمه حسینی",
    amount: 450000,
    paymentMethod: "cash",
    status: "paid",
    serviceId: 3,
  },
  {
    id: 59,
    date: "۱۴۰۴/۰۷/۱۰",
    description: "ویزیت تخصصی قلب",
    patient: "علی رضایی",
    amount: 250000,
    paymentMethod: "card",
    status: "paid",
    serviceId: 5,
  },

  // اواسط یک سال قبل — ۱۴۰۴/۰۵/۰۱ - ۱۴۰۴/۰۵/۲۰
  {
    id: 60,
    date: "۱۴۰۴/۰۵/۲۰",
    description: "میکرونیدلینگ صورت",
    patient: "مریم نوروزی",
    amount: 500000,
    paymentMethod: "card",
    status: "paid",
    serviceId: 2,
  },
  {
    id: 61,
    date: "۱۴۰۴/۰۵/۱۵",
    description: "آزمایش تیروئید",
    patient: "سارا احمدی",
    amount: 195000,
    paymentMethod: "online",
    status: "paid",
    serviceId: 8,
  },
  {
    id: 62,
    date: "۱۴۰۴/۰۵/۱۰",
    description: "فیشال صورت",
    patient: "رضا کریمی",
    amount: 350000,
    paymentMethod: "cash",
    status: "paid",
    serviceId: 1,
  },
  {
    id: 63,
    date: "۱۴۰۴/۰۵/۰۵",
    description: "مشاوره روانشناسی",
    patient: "نگین صادقی",
    amount: 250000,
    paymentMethod: "card",
    status: "paid",
    serviceId: 6,
  },
  {
    id: 64,
    date: "۱۴۰۴/۰۵/۰۱",
    description: "فیزیوتراپی",
    patient: "امیرحسین کریمی",
    amount: 300000,
    paymentMethod: "cheque",
    status: "cancelled",
    serviceId: 7,
  },

  // ابتدای یک سال قبل — ۱۴۰۴/۰۳/۲۰ - ۱۴۰۴/۰۴/۱۰
  {
    id: 65,
    date: "۱۴۰۴/۰۴/۱۰",
    description: "ویزیت عمومی",
    patient: "زهرا احمدی",
    amount: 150000,
    paymentMethod: "cash",
    status: "paid",
    serviceId: 5,
  },
  {
    id: 66,
    date: "۱۴۰۴/۰۴/۰۵",
    description: "آزمایش خون کامل",
    patient: "حسین محمدی",
    amount: 120000,
    paymentMethod: "online",
    status: "paid",
    serviceId: 8,
  },
  {
    id: 67,
    date: "۱۴۰۴/۰۳/۲۸",
    description: "لیزر موهای زائد",
    patient: "نرگس محمدی",
    amount: 450000,
    paymentMethod: "card",
    status: "paid",
    serviceId: 3,
  },
  {
    id: 68,
    date: "۱۴۰۴/۰۳/۲۰",
    description: "میکرونیدلینگ صورت",
    patient: "سمیرا حسینی",
    amount: 500000,
    paymentMethod: "cash",
    status: "paid",
    serviceId: 2,
  },
];

const formatPrice = (amount: number) => amount.toLocaleString("fa-IR");

const jalaliMonthNames = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

const persianSeasons = ["بهار", "تابستان", "پاییز", "زمستان"];

function toLatinDigits(str: string): string {
  const persian = "۰۱۲۳۴۵۶۷۸۹";
  return str.replace(/[۰-۹]/g, (d) => String(persian.indexOf(d)));
}

function toPersianDigits(str: string): string {
  const persian = "۰۱۲۳۴۵۶۷۸۹";
  return str.replace(/\d/g, (d) => persian[Number(d)]);
}

function getPersianToday(): string {
  const now = new Date();
  const { jy, jm, jd } = jalaali.toJalaali(now);
  return toPersianDigits(`${jy}/${String(jm).padStart(2, "0")}/${String(jd).padStart(2, "0")}`);
}

function addDays(jalaliStr: string, days: number): string {
  const latin = toLatinDigits(jalaliStr);
  const parts = latin.split("/").map(Number);
  if (parts.length !== 3) return jalaliStr;
  const [jy, jm, jd] = parts;
  const date = jalaali.jalaaliToDateObject(jy, jm, jd);
  date.setDate(date.getDate() + days);
  const { jy: ny, jm: nm, jd: nd } = jalaali.toJalaali(date);
  return toPersianDigits(`${ny}/${String(nm).padStart(2, "0")}/${String(nd).padStart(2, "0")}`);
}

function addMonths(jalaliStr: string, months: number): string {
  const latin = toLatinDigits(jalaliStr);
  const parts = latin.split("/").map(Number);
  if (parts.length !== 3) return jalaliStr;
  const [jy, jm, jd] = parts;
  const date = jalaali.jalaaliToDateObject(jy, jm, jd);
  date.setMonth(date.getMonth() + months);
  const { jy: ny, jm: nm, jd: nd } = jalaali.toJalaali(date);
  return toPersianDigits(`${ny}/${String(nm).padStart(2, "0")}/${String(nd).padStart(2, "0")}`);
}

function addYears(jalaliStr: string, years: number): string {
  const latin = toLatinDigits(jalaliStr);
  const parts = latin.split("/").map(Number);
  if (parts.length !== 3) return jalaliStr;
  const [jy, jm, jd] = parts;
  const date = jalaali.jalaaliToDateObject(jy, jm, jd);
  date.setFullYear(date.getFullYear() + years);
  const { jy: ny, jm: nm, jd: nd } = jalaali.toJalaali(date);
  return toPersianDigits(`${ny}/${String(nm).padStart(2, "0")}/${String(nd).padStart(2, "0")}`);
}

function getPeriodDateRange(period: PeriodFilter): { from: string; to: string } {
  const today = getPersianToday();

  switch (period) {
    case "today":
      return { from: today, to: today };
    case "week":
      return { from: addDays(today, -6), to: today };
    case "month":
      return { from: addMonths(today, -1), to: today };
    case "threeMonths":
      return { from: addMonths(today, -3), to: today };
    case "year":
      return { from: addYears(today, -1), to: today };
  }
}

function computeStats(transactions: Transaction[], period: PeriodFilter): AccountingStat[] {
  const { from, to } = getPeriodDateRange(period);
  const todayStr = getPersianToday();

  const todayTransactions = transactions.filter((t) => t.date === todayStr && t.status === "paid");
  const todaySum = todayTransactions.reduce((s, t) => s + t.amount, 0);

  const periodTransactions = transactions.filter(
    (t) => t.date >= from && t.date <= to && t.status === "paid"
  );
  const periodSum = periodTransactions.reduce((s, t) => s + t.amount, 0);

  return [
    {
      title: "درآمد امروز",
      value: formatPrice(todaySum),
      icon: <CiMoneyBill className="text-success-600 size-6" />,
      trend: "up",
      change: "بر اساس تراکنش‌های امروز",
    },
    {
      title: `درآمد ${periodLabels[period]}`,
      value: formatPrice(periodSum),
      icon: <CiReceipt className="text-primary-600 size-6" />,
      trend: "up",
      change: `${periodTransactions.length} تراکنش`,
    },
    {
      title: "تعداد تراکنش‌ها",
      value: String(periodTransactions.length),
      icon: <IoCashOutline className="text-warning-600 size-6" />,
      trend: periodTransactions.length >= 5 ? "up" : "down",
      change: `${periodTransactions.filter((t) => t.status === "paid").length} موفق`,
    },
    {
      title: "میانگین هر تراکنش",
      value:
        periodTransactions.length > 0
          ? formatPrice(Math.round(periodSum / periodTransactions.length))
          : "۰",
      icon: <IoCardOutline className="text-info-600 size-6" />,
      trend: "up",
      change: "تومان",
    },
  ];
}

function getRevenueData(transactions: Transaction[], period: PeriodFilter): DailyRevenue[] {
  const { to: periodTo } = getPeriodDateRange(period);

  switch (period) {
    case "today": {
      const from = addDays(periodTo, -29);
      const paid = transactions.filter(
        (t) => t.date >= from && t.date <= periodTo && t.status === "paid"
      );
      const grouped = new Map<string, number>();
      paid.forEach((t) => {
        grouped.set(t.date, (grouped.get(t.date) || 0) + t.amount);
      });
      const days: DailyRevenue[] = [];
      let current = from;
      while (current <= periodTo) {
        days.push({ day: current.slice(5), amount: grouped.get(current) || 0 });
        current = addDays(current, 1);
      }
      return days;
    }
    case "week": {
      const from = addDays(periodTo, -55);
      const paid = transactions.filter(
        (t) => t.date >= from && t.date <= periodTo && t.status === "paid"
      );
      const weeks: DailyRevenue[] = [];
      let weekStart = from;
      while (weekStart <= periodTo) {
        const weekEnd = addDays(weekStart, 6);
        const amount = paid
          .filter((t) => t.date >= weekStart && t.date <= weekEnd)
          .reduce((s, t) => s + t.amount, 0);
        weeks.push({
          day: `${weekStart.slice(5)}-${weekEnd.slice(5)}`,
          amount,
        });
        weekStart = addDays(weekStart, 7);
      }
      return weeks;
    }
    case "month": {
      const from = addMonths(periodTo, -11);
      const paid = transactions.filter(
        (t) => t.date >= from && t.date <= periodTo && t.status === "paid"
      );
      const grouped = new Map<string, number>();
      paid.forEach((t) => {
        const monthKey = t.date.slice(0, 7);
        grouped.set(monthKey, (grouped.get(monthKey) || 0) + t.amount);
      });
      const months: DailyRevenue[] = [];
      let current = from;
      while (current <= periodTo) {
        const monthKey = current.slice(0, 7);
        const latinKey = toLatinDigits(monthKey);
        const parts = latinKey.split("/");
        const yearSuffix = toPersianDigits(parts[0].slice(-2));
        const monthNum = parseInt(parts[1], 10);
        months.push({
          day: `${jalaliMonthNames[monthNum - 1]} ${yearSuffix}`,
          amount: grouped.get(monthKey) || 0,
        });
        current = addMonths(current, 1);
      }
      return months;
    }
    case "threeMonths": {
      const from = addMonths(periodTo, -11);
      const paid = transactions.filter(
        (t) => t.date >= from && t.date <= periodTo && t.status === "paid"
      );
      const grouped = new Map<string, number>();
      paid.forEach((t) => {
        const latinKey = toLatinDigits(t.date.slice(0, 7));
        const [y, m] = latinKey.split("/").map(Number);
        const qIdx = Math.floor((m - 1) / 3);
        const seasonKey = `${y}-${qIdx}`;
        grouped.set(seasonKey, (grouped.get(seasonKey) || 0) + t.amount);
      });
      const quarters: DailyRevenue[] = [];
      let current = from;
      while (current <= periodTo) {
        const monthKey = current.slice(0, 7);
        const latinKey = toLatinDigits(monthKey);
        const parts = latinKey.split("/");
        const yearNum = parts[0];
        const monthNum = parseInt(parts[1], 10);
        const qIdx = Math.floor((monthNum - 1) / 3);
        const seasonKey = `${yearNum}-${qIdx}`;
        const yearSuffix = toPersianDigits(yearNum.slice(-2));
        quarters.push({
          day: `${persianSeasons[qIdx]} ${yearSuffix}`,
          amount: grouped.get(seasonKey) || 0,
        });
        current = addMonths(current, 3);
      }
      return quarters;
    }
    case "year": {
      const from = addYears(periodTo, -2);
      const paid = transactions.filter(
        (t) => t.date >= from && t.date <= periodTo && t.status === "paid"
      );
      const grouped = new Map<string, number>();
      paid.forEach((t) => {
        const yearKey = t.date.slice(0, 4);
        grouped.set(yearKey, (grouped.get(yearKey) || 0) + t.amount);
      });
      const years: DailyRevenue[] = [];
      let current = from;
      while (current <= periodTo) {
        const yearKey = current.slice(0, 4);
        years.push({
          day: yearKey,
          amount: grouped.get(yearKey) || 0,
        });
        current = addYears(current, 1);
      }
      return years;
    }
  }
}

function Accounting() {
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState("");
  const [activePeriod, setActivePeriod] = useState<PeriodFilter>("month");

  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const { registerAction } = useQuickActions();

  useEffect(() => {
    const unregister = registerAction({
      id: "newTransaction",
      label: "ثبت تراکنش جدید",
      icon: <MdAttachMoney />,
      perform: () => setAddModalOpen(true),
    });
    return unregister;
  }, [registerAction]);

  const stats = useMemo(
    () => computeStats(transactions, activePeriod),
    [transactions, activePeriod]
  );
  const revenueData = useMemo(
    () => getRevenueData(transactions, activePeriod),
    [transactions, activePeriod]
  );

  const filtered = useMemo(() => {
    const { from, to } = getPeriodDateRange(activePeriod);
    return transactions.filter((t) => {
      const dateFromMatch = dateFrom ? t.date >= dateFrom : true;
      const dateToMatch = dateTo ? t.date <= dateTo : true;
      const periodMatch =
        activePeriod === "today" ? t.date === from : t.date >= from && t.date <= to;
      const typeMatch = typeFilter ? t.status === typeFilter : true;
      return dateFromMatch && dateToMatch && periodMatch && typeMatch;
    });
  }, [transactions, dateFrom, dateTo, typeFilter, activePeriod]);

  const pageSize = 10;
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginatedData = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function handleAddTransaction(data: TransactionFormData) {
    const newTransaction: Transaction = {
      id: Date.now(),
      date: data.date,
      description: data.description || services.find((s) => s.id === data.serviceId)?.title || "",
      patient: data.patient,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      status: "paid",
      serviceId: data.serviceId,
    };
    setTransactions((prev) => [newTransaction, ...prev]);
    setAddModalOpen(false);
  }

  function openDetailModal(transaction: Transaction) {
    setSelectedTransaction(transaction);
    setDetailModalOpen(true);
  }

  const selectedService = useMemo(
    () =>
      selectedTransaction
        ? services.find((s) => s.id === selectedTransaction.serviceId)
        : undefined,
    [selectedTransaction]
  );

  const columns: Column<Transaction>[] = [
    { key: "date", header: "تاریخ", width: "110px", align: "center" },
    { key: "description", header: "توضیحات" },
    { key: "patient", header: "بیمار" },
    {
      key: "amount",
      header: "مبلغ (تومان)",
      align: "end",
      width: "140px",
      render: (item) => (
        <span className="text-surface-900 font-medium">{formatPrice(item.amount)}</span>
      ),
    },
    {
      key: "paymentMethod",
      header: "روش پرداخت",
      align: "center",
      width: "110px",
      render: (item) => (
        <span className="text-surface-600">{paymentMethodLabels[item.paymentMethod]}</span>
      ),
    },
    {
      key: "status",
      header: "وضعیت",
      align: "center",
      width: "110px",
      render: (item) => {
        const s = transactionStatusMap[item.status];
        return (
          <Badge variant={s.variant} size="sm">
            {s.label}
          </Badge>
        );
      },
    },
    {
      key: "actions",
      header: "عملیات",
      align: "center",
      width: "90px",
      render: (item) => (
        <Button
          variant="ghost"
          size="sm"
          startIcon={<FaRegEye className="size-4" />}
          onClick={() => openDetailModal(item)}
        >
          جزئیات
        </Button>
      ),
    },
  ];

  function clearFilters() {
    setDateFrom(null);
    setDateTo(null);
    setTypeFilter("");
    setCurrentPage(1);
  }

  const hasFilters = dateFrom !== null || dateTo !== null || typeFilter !== "";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-surface-900 text-2xl font-bold">حسابداری</h1>
        </div>
        <div className="mt-3 flex items-center gap-3 sm:mt-0">
          <Button
            variant="outline"
            startIcon={<BiDownload className="size-5" />}
            onClick={() => exportTransactionsToExcel(transactions)}
          >
            گزارش اکسل
          </Button>
          <Button
            variant="primary"
            startIcon={<BiPlus className="size-5" />}
            onClick={() => setAddModalOpen(true)}
          >
            ثبت تراکنش
          </Button>
          <SearchButton />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {periodKeys.map((key) => (
          <button
            key={key}
            onClick={() => {
              setActivePeriod(key);
              setCurrentPage(1);
            }}
            className={`focus-visible:ring-primary-600/40 cursor-pointer rounded-lg px-3.5 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none ${
              activePeriod === key
                ? "bg-primary-600 text-white shadow-sm"
                : "text-surface-600 hover:bg-surface-100 active:bg-surface-200 border-surface-200 border"
            }`}
            aria-pressed={activePeriod === key}
          >
            {periodLabels[key]}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} variant="outlined" padding="lg">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-surface-500 text-sm">{stat.title}</span>
                <span className="text-surface-900 text-2xl font-bold">{stat.value}</span>
              </div>
              <div className="bg-surface-50 rounded-lg p-2.5">{stat.icon}</div>
            </div>
            <div className="mt-4 flex items-center gap-1">
              <span
                className={`text-sm font-semibold ${
                  stat.trend === "up" ? "text-success-600" : "text-danger-600"
                }`}
              >
                {stat.change}
              </span>
            </div>
          </Card>
        ))}
      </div>

      <Card variant="outlined" padding="lg">
        <CardTitle>{chartTitleMap[activePeriod]}</CardTitle>
        <div className="mt-4" dir="ltr">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={revenueData} margin={{ top: 8, right: 8, left: -16, bottom: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 12, fill: "#64748b" }}
                axisLine={{ stroke: "#e2e8f0" }}
                tickLine={false}
                angle={-30}
                textAnchor="end"
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${(v / 1000000).toFixed(0)}م`}
              />
              <Tooltip
                formatter={(value: unknown) => [`${formatPrice(Number(value))} تومان`, "درآمد"]}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  fontSize: 13,
                }}
              />
              <Bar dataKey="amount" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card variant="outlined" padding="none">
        <div className="border-surface-200 flex flex-col gap-4 border-b px-5 py-4 sm:flex-row sm:items-end">
          <div className="flex items-center gap-2">
            <span className="text-surface-600 text-sm font-medium">فیلترها:</span>
          </div>
          <JalaliDatePicker
            label="از تاریخ"
            value={dateFrom}
            onChange={(d) => {
              setDateFrom(d);
              setCurrentPage(1);
            }}
            containerClassName="w-full sm:w-40"
          />
          <JalaliDatePicker
            label="تا تاریخ"
            value={dateTo}
            onChange={(d) => {
              setDateTo(d);
              setCurrentPage(1);
            }}
            containerClassName="w-full sm:w-40"
          />
          <div className="w-full sm:w-44">
            <Select
              label="نوع تراکنش"
              placeholder="همه"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              options={[
                { value: "paid", label: "پرداخت شده" },
                { value: "cancelled", label: "لغو شده" },
              ]}
            />
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              پاک کردن فیلترها
            </Button>
          )}
        </div>
        <Table
          columns={columns}
          data={paginatedData}
          rowKey={(item) => item.id}
          className="rounded-none border-0"
        />
        {totalPages > 1 && (
          <div className="border-surface-200 flex items-center justify-center border-t px-5 py-4">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </Card>

      <AddTransactionModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSave={handleAddTransaction}
        services={services}
      />

      <TransactionDetailModal
        open={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedTransaction(null);
        }}
        transaction={selectedTransaction}
        service={selectedService}
      />
    </div>
  );
}

export default Accounting;
