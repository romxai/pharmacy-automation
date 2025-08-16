import * as XLSX from "xlsx";
import { parseDate } from "./utils";

export function parseSalesReport(
  workbook: XLSX.WorkBook,
  expectedDept: string,
  expectedDate: Date
) {
  console.log("\n[Parser] 2. Parsing Sales Report...");
  const sheet =
    workbook.Sheets["pharmacy_daily_sales_report"] ||
    workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error("No sheets found in the Sales Report workbook.");

  const deptCell = sheet["A3"];
  const deptRaw = deptCell?.w || deptCell?.v?.toString() || "";
  console.log(`[Parser-Sales] Reading department from cell A3: "${deptRaw}"`);

  // --- VVV THIS IS THE UPDATED REGEX VVV ---
  const deptMatch = deptRaw.match(/(?:SRST-|SRDPS-)?(IP|OP|OT)\s*PHARMACY/i);
  // --- ^^^ THIS IS THE UPDATED REGEX ^^^ ---

  const actualDept = deptMatch ? deptMatch[1] : "";
  if (actualDept.toUpperCase() !== expectedDept.toUpperCase()) {
    throw new Error(
      `Sales Report is not for the selected department "${expectedDept}". Found "${actualDept}".`
    );
  }

  const dateCell = sheet["A4"];
  const dateRaw = dateCell?.w || dateCell?.v?.toString() || "";
  const dateMatch = dateRaw.match(/From Date: (\d{2}-\d{2}-\d{4})/);
  if (!dateMatch)
    throw new Error(
      "Could not find a valid date in cell A4 of the sales report."
    );
  const reportDate = parseDate(dateMatch[1]);
  if (reportDate.getTime() !== expectedDate.getTime()) {
    throw new Error(
      `Sales report start date (${reportDate.toLocaleDateString()}) does not match the stock balance date (${expectedDate.toLocaleDateString()}).`
    );
  }
  console.log("[Parser-Sales]  => Dates match successfully.");

  const jsonData = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
  }) as any[];
  const headerRowIndex = 4;
  const headers = jsonData[headerRowIndex];
  const dataRows = jsonData.slice(headerRowIndex + 1);

  const salesMap = new Map<string, number>();
  console.log(
    `[Parser-Sales]  => Found ${dataRows.length} total sales entries. Aggregating by Item Code...`
  );

  dataRows.forEach((rowArray) => {
    const row: any = {};
    headers.forEach((header: string, index: number) => {
      const trimmedHeader = header ? String(header).trim() : "";
      if (trimmedHeader) {
        row[trimmedHeader] = rowArray[index];
      }
    });

    const itemCode = row["Item code"];
    const qty = parseFloat(row["Sales Qty"]);

    if (itemCode && !isNaN(qty)) {
      const sItemCode = String(itemCode).trim();
      if (!sItemCode) return;

      const currentQty = salesMap.get(sItemCode) || 0;
      salesMap.set(sItemCode, currentQty + qty);
    }
  });
  console.log(
    `[Parser-Sales]  => Aggregation complete. Total unique items sold: ${salesMap.size}.`
  );
  return salesMap;
}
