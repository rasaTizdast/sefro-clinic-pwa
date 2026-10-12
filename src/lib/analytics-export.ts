import * as XLSX from "xlsx";

export interface ExportSheet {
  /** Worksheet name — Excel caps it at 31 characters. */
  name: string;
  rows: Record<string, string | number | null>[];
}

/**
 * Write one workbook with every given sheet. Used by the Analytics exports so
 * the file contains exactly the sheets of the selected tab (overview vs
 * financial) — nothing else.
 */
export function exportSheetsToExcel(sheets: ExportSheet[], filename: string): void {
  if (sheets.length === 0) return;
  const wb = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const rows = sheet.rows.length > 0 ? sheet.rows : [{}];
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31));
  }
  XLSX.writeFile(wb, filename);
}

export function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}
