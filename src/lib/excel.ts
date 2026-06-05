import * as XLSX from "xlsx";

import type { Transaction } from "../types/accounting";

const paymentMethodLabels: Record<string, string> = {
  cash: "نقدی",
  card: "کارت خوان",
  online: "آنلاین",
  cheque: "چک",
};

const statusLabels: Record<string, string> = {
  paid: "پرداخت شده",
  cancelled: "لغو شده",
};

export function exportTransactionsToExcel(transactions: Transaction[]): void {
  const data = transactions.map((t) => ({
    تاریخ: t.date,
    بیمار: t.patient,
    توضیحات: t.description,
    "مبلغ (تومان)": t.amount,
    "روش پرداخت": paymentMethodLabels[t.paymentMethod] || t.paymentMethod,
    وضعیت: statusLabels[t.status] || t.status,
  }));

  const ws = XLSX.utils.json_to_sheet(data);

  const colWidths = [{ wch: 14 }, { wch: 20 }, { wch: 30 }, { wch: 18 }, { wch: 14 }, { wch: 14 }];
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "تراکنش‌ها");

  XLSX.writeFile(wb, `transactions_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
