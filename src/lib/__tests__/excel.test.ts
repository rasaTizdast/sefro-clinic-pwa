import { describe, expect, it, vi } from "vitest";
import * as XLSX from "xlsx";

import type { Patient } from "../../types/patient";
import { exportPatientsToExcel } from "../excel";

vi.mock("xlsx", () => ({
  utils: {
    json_to_sheet: vi.fn().mockReturnValue({}),
    book_new: vi.fn().mockReturnValue({}),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}));

describe("exportPatientsToExcel", () => {
  it("calls XLSX.writeFile with a filename", () => {
    const patients: Patient[] = [
      {
        id: 1,
        firstName: "علی",
        lastName: "محمدی",
        mobileNumber: "09121234567",
        nationalId: "1234567890",
        bitmojiCode: "",
        satisfaction: 0,
        notes: "",
        lastVisit: "1402/01/15",
        visitCount: 5,
        status: "active",
        isNewCustomer: false,
        isLoyalCustomer: false,
        totalPayments: 200000,
        createdAt: "2026-01-01",
      },
    ];

    exportPatientsToExcel(patients);

    expect(XLSX.utils.json_to_sheet).toHaveBeenCalled();
    expect(XLSX.writeFile).toHaveBeenCalled();
  });

  it("handles empty patients array", () => {
    exportPatientsToExcel([]);

    expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith([]);
  });
});
