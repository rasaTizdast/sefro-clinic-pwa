import { describe, expect, it, vi } from "vitest";
import * as XLSX from "xlsx";

import type { PaymentMethod, Transaction } from "../../types/accounting";
import { exportTransactionsToExcel } from "../excel";

vi.mock("xlsx", () => ({
  utils: {
    json_to_sheet: vi.fn().mockReturnValue({}),
    book_new: vi.fn().mockReturnValue({}),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}));

describe("exportTransactionsToExcel", () => {
  it("calls XLSX.writeFile with a filename", () => {
    const transactions: Transaction[] = [
      {
        id: 1,
        date: "1402-01-15",
        patient: "علی محمدی",
        description: "ویزیت",
        amount: 200000,
        paymentMethod: "cash" as PaymentMethod,
        status: "paid" as const,
      },
    ];

    exportTransactionsToExcel(transactions);

    expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith([
      {
        تاریخ: "1402-01-15",
        بیمار: "علی محمدی",
        توضیحات: "ویزیت",
        "مبلغ (تومان)": 200000,
        "روش پرداخت": "نقدی",
        وضعیت: "پرداخت شده",
      },
    ]);
    expect(XLSX.writeFile).toHaveBeenCalled();
  });

  it("handles empty transactions array", () => {
    exportTransactionsToExcel([]);

    expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith([]);
  });

  it("maps unknown payment method to its raw value", () => {
    const transactions: Transaction[] = [
      {
        id: 2,
        date: "1402-01-15",
        patient: "test",
        description: "test",
        amount: 1000,
        paymentMethod: "cash" as PaymentMethod,
        status: "paid" as const,
      },
    ];

    exportTransactionsToExcel(transactions);

    expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith([
      {
        تاریخ: "1402-01-15",
        بیمار: "test",
        توضیحات: "test",
        "مبلغ (تومان)": 1000,
        "روش پرداخت": "نقدی",
        وضعیت: "پرداخت شده",
      },
    ]);
  });
});
