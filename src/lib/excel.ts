import * as XLSX from "xlsx";

import type { Patient } from "../types/patient";

export function exportPatientsToExcel(patients: Patient[]): void {
  const data = patients.map((p) => ({
    نام: `${p.firstName} ${p.lastName}`,
    تلفن: p.mobileNumber,
    "کد ملی": p.nationalId,
    "تعداد مراجعات": p.visitCount,
    "آخرین مراجعه": p.lastVisit,
    "کل پرداختی": p.totalPayments,
    وضعیت:
      p.status === "new"
        ? "جدید"
        : p.status === "active"
          ? "فعال"
          : p.status === "loyal"
            ? "وفادار"
            : "غیرفعال",
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const colWidths = [
    { wch: 24 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 10 },
  ];
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "بیماران");

  XLSX.writeFile(wb, `patients_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
